// create-checkout/index.ts
// Erzeugt für den angemeldeten Nutzer eine Bezahlseite bei Stripe für einen Pass (Einmalzahlung).
// Aufruf aus dem Portal mit dem Login-Token des Nutzers.
//
// Body: { "plan": "starter" | "plus", "length": "month" | "quarter", "consent_version": "<Fassung>" }
//   consent_version ist die Versionskennung des Zustimmungstextes (sofortiger Beginn, Erlöschen des
//   Widerrufsrechts), den das Portal angezeigt und der Nutzer bestätigt hat. Ohne Zustimmung zur
//   aktiven Fassung entsteht keine Bezahlseite.
// Antwort: { "url": "https://checkout.stripe.com/..." } oder { "error": "<code>" }
//
// Secrets: STRIPE_SECRET_KEY, PORTAL_URL. SUPABASE_URL, SUPABASE_ANON_KEY und
// SUPABASE_SERVICE_ROLE_KEY stellt Supabase bereit.

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, PORTAL_URL } from "../_shared/http.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const PLANS = ["starter", "plus"];
const LENGTHS = ["month", "quarter"];

// Ablehnungen aus begin_checkout() und der Statuscode, mit dem sie beim Portal ankommen.
const REFUSALS: Record<string, number> = {
  account_blocked: 403,
  sales_disabled: 403,
  pass_not_available: 400,
  consent_required: 400,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Wer ruft auf? Der Login-Token des Nutzers wird von Supabase geprüft.
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "not_signed_in" }, 401);

  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  const length = body?.length;
  if (!PLANS.includes(plan) || !LENGTHS.includes(length)) return json({ error: "unknown_pass" }, 400);
  const consentVersion = typeof body?.consent_version === "string" ? body.consent_version : null;

  // Ab hier mit dem Service-Role-Schlüssel. begin_checkout() prüft Konto, Verkauf, Preis und
  // Zustimmung in der Datenbank und hält die Zustimmung mit Zeitpunkt und Fassung fest.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: checkout, error } = await admin.rpc("begin_checkout", {
    p_user_id: user.id, p_plan: plan, p_length: length, p_consent_version: consentVersion,
  });
  if (error) {
    if (error.code === "P0001" && error.message in REFUSALS) return json({ error: error.message }, REFUSALS[error.message]);
    console.error(error);
    return json({ error: "lookup_failed" }, 500);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: checkout.stripe_price_id, quantity: 1 }],
      client_reference_id: user.id,
      // Daran erkennt der Webhook Nutzer und Pass.
      metadata: { user_id: user.id, plan, length, consent_id: checkout.consent_id },
      ...(checkout.stripe_customer_id
        ? { customer: checkout.stripe_customer_id }
        : { customer_email: user.email, customer_creation: "always" as const }),
      invoice_creation: { enabled: true }, // Rechnung zu jeder Zahlung
      allow_promotion_codes: true, // Feld für Gutscheincodes
      // automatic_tax: { enabled: true }, // erst nach Klärung der Umsatzsteuer (OSS)
      success_url: `${PORTAL_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PORTAL_URL}/plan?checkout=cancelled`,
    });

    // Die Session an der Zustimmung vermerken; darüber findet die Planphase später ihre Zustimmung.
    // Gelingt das nicht, wird die Bezahlseite nicht herausgegeben.
    const { error: attachError } = await admin.rpc("attach_checkout_session", {
      p_consent_id: checkout.consent_id, p_session_id: session.id,
    });
    if (attachError) {
      console.error(attachError);
      await stripe.checkout.sessions.expire(session.id).catch((err) => console.error(err));
      return json({ error: "lookup_failed" }, 500);
    }
    return json({ url: session.url });
  } catch (err) {
    console.error(err);
    return json({ error: "stripe_failed" }, 502);
  }
});
