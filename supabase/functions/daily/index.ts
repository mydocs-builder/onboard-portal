// daily/index.ts
// Die tägliche Funktion: erledigt alles Zeitgesteuerte. Aufgerufen einmal am Morgen von der
// Datenbank (pg_cron, siehe Migration daily_schedule), lokal von Hand.
//
// 1. daily_run(): vorgemerkte Pässe starten, abgelaufene Zugänge beenden, abgelaufene Jobs archivieren.
// 2. Abgleich mit Stripe: bezahlte Sessions ohne Freischaltung nachtragen, Hinweis an den Admin.
// 3. Fällige Mails verschicken und im email_log vermerken.
//
// Aufruf nur mit dem Service-Role-Schlüssel als Bearer-Token.
// Secrets: STRIPE_SECRET_KEY, SMTP_*, PORTAL_URL. SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase bereit.

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { grantPass } from "../_shared/grant.ts";
import { buildMail } from "../_shared/emails.ts";
import { mailConfigured, sendMail } from "../_shared/mail.ts";

const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// So weit zurück sucht der Abgleich nach bezahlten Sessions.
const RECONCILE_DAYS = 3;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

// Zahlungen ohne Freischaltung finden und nachtragen (Webhook ausgefallen oder nie angekommen).
async function reconcileStripe() {
  if (!stripe) return { skipped: "STRIPE_SECRET_KEY is not set" };

  const since = Math.floor(Date.now() / 1000) - RECONCILE_DAYS * 86400;
  const paid: Stripe.Checkout.Session[] = [];
  for await (const s of stripe.checkout.sessions.list({ created: { gte: since }, status: "complete", limit: 100 })) {
    // Nur Sessions, die das Portal erzeugt hat: sie tragen die Nutzer-ID.
    if (s.mode === "payment" && s.payment_status === "paid" && s.metadata?.user_id) paid.push(s);
  }
  if (paid.length === 0) return { checked: 0, granted: [], failed: [] };
  // Älteste zuerst: Verlängerung und Upgrade hängen von der Reihenfolge der Käufe ab.
  paid.sort((a, b) => a.created - b.created);

  const { data: known, error } = await db.from("plan_periods").select("stripe_session_id")
    .in("stripe_session_id", paid.map((s) => s.id));
  if (error) throw error;
  const done = new Set((known ?? []).map((r) => r.stripe_session_id));

  const granted: string[] = [];
  const failed: string[] = [];
  for (const session of paid.filter((s) => !done.has(s.id))) {
    try {
      const r = await grantPass(stripe, db, session);
      granted.push(`${session.id}: ${r.plan} ${r.starts_on} to ${r.ends_on} for user ${session.metadata!.user_id}`);
    } catch (err) {
      failed.push(`${session.id}: ${message(err)}`);
    }
  }

  // Hinweis an Patrick bei Abweichungen.
  if (granted.length + failed.length > 0) {
    const { data: setting } = await db.from("app_settings").select("value").eq("key", "admin_notify_email").maybeSingle();
    if (setting?.value && mailConfigured) {
      await sendMail({
        to: setting.value,
        subject: `Portal: ${granted.length + failed.length} Stripe-Zahlung(en) ohne Freischaltung`,
        text: [
          "Der tägliche Abgleich mit Stripe hat bezahlte Checkout-Sessions ohne Freischaltung gefunden.",
          "",
          `Nachgetragen (${granted.length}):`,
          ...(granted.length ? granted.map((g) => `- ${g}`) : ["- keine"]),
          "",
          `Nicht nachtragbar, bitte prüfen (${failed.length}):`,
          ...(failed.length ? failed.map((f) => `- ${f}`) : ["- keine"]),
        ].join("\n"),
      }).catch((err) => console.error("admin notice failed", err));
    }
  }
  return { checked: paid.length, granted, failed };
}

// Fällige Mails verschicken. Erst nach erfolgreichem Versand wird die Mail vermerkt; schlägt
// der Versand fehl, liefert der nächste Lauf sie wieder.
async function sendDueMails() {
  const { data: due, error } = await db.rpc("daily_mails");
  if (error) throw error;
  if (!mailConfigured) return { skipped: "SMTP is not configured", due: due.length };

  const sent: Record<string, number> = {};
  const failed: string[] = [];
  for (const m of due) {
    try {
      await sendMail(buildMail(m.kind, m.email, m.first_name, m.data));
      const { error: logError } = await db.rpc("daily_mail_sent", { p_kind: m.kind, p_user_id: m.user_id, p_ref_id: m.ref_id });
      if (logError) throw logError;
      sent[m.kind] = (sent[m.kind] ?? 0) + 1;
    } catch (err) {
      console.error(err);
      failed.push(`${m.kind} for user ${m.user_id}: ${message(err)}`);
    }
  }
  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return new Response("Forbidden", { status: 403 });

  // Jeder Teil läuft für sich: ein Fehler beim Abgleich hält die Mails nicht auf.
  const result: Record<string, unknown> = {};
  let ok = true;
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      result[name] = await fn();
    } catch (err) {
      console.error(name, err);
      result[name] = { error: message(err) };
      ok = false;
    }
  };

  await step("run", async () => {
    const { data, error } = await db.rpc("daily_run");
    if (error) throw error;
    return data;
  });
  await step("stripe", reconcileStripe);
  await step("mails", sendDueMails);

  return new Response(JSON.stringify(result), {
    status: ok ? 200 : 500, headers: { "Content-Type": "application/json" },
  });
});
