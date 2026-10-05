// newsletter/index.ts
// Double-Opt-in für den Newsletter. Das Portal verschickt selbst keinen Newsletter; diese Funktion
// verschickt nur die Bestätigungsmail und löst ihren Link ein.
//
// Body: { "action": "send", "resend"?: true }     mit dem Login-Token des Nutzers
//         Verschickt die Bestätigungsmail, wenn der Newsletter bestellt, aber noch nicht bestätigt ist.
//         Ohne "resend" nur beim ersten Mal; so kann das Portal die Funktion nach der Bestätigung des
//         Kontos gefahrlos mehrfach aufrufen.
//       { "action": "confirm", "token": "<aus dem Link>" }     ohne Anmeldung
//         Löst den Link aus der Mail ein; erst damit ist der Newsletter bestellt.
// Antwort: { "sent": true | false } bzw. { "status": "active" | "invalid" } oder { "error": "<code>" }
//
// Secrets: SMTP_*, PORTAL_URL. SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY stellt Supabase bereit.

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildNewsletterConfirmMail } from "../_shared/emails.ts";
import { corsHeaders, json, PORTAL_URL } from "../_shared/http.ts";
import { mailConfigured, sendMail } from "../_shared/mail.ts";

// Ablehnungen aus newsletter_issue_token() und der Statuscode, mit dem sie beim Portal ankommen.
const REFUSALS: Record<string, number> = { too_soon: 429, send_limit_reached: 429 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const body = await req.json().catch(() => null);

  if (body?.action === "confirm") {
    const token = typeof body.token === "string" ? body.token : "";
    const { data, error } = await admin.rpc("confirm_newsletter", { p_token: token });
    if (error) {
      console.error(error);
      return json({ error: "confirm_failed" }, 500);
    }
    return json({ status: data === "active" ? "active" : "invalid" });
  }

  if (body?.action === "send") {
    // Wer ruft auf? Der Login-Token des Nutzers wird von Supabase geprüft.
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user?.email) return json({ error: "not_signed_in" }, 401);
    if (!mailConfigured) return json({ error: "mail_not_configured" }, 503);

    const { data: issued, error } = await admin.rpc("newsletter_issue_token", {
      p_user_id: user.id, p_resend: body.resend === true,
    });
    if (error) {
      if (error.code === "P0001" && error.message in REFUSALS) return json({ error: error.message }, REFUSALS[error.message]);
      console.error(error);
      return json({ error: "issue_failed" }, 500);
    }
    // Nichts zu senden: nicht bestellt, schon bestätigt, oder die erste Mail ging bereits hinaus.
    if (!issued) return json({ sent: false });

    const link = `${PORTAL_URL}/newsletter/confirm?token=${issued.token}`;
    try {
      await sendMail(buildNewsletterConfirmMail(user.email, issued.first_name, link));
    } catch (err) {
      console.error(err);
      return json({ error: "mail_failed" }, 502);
    }
    return json({ sent: true });
  }

  return json({ error: "unknown_action" }, 400);
});
