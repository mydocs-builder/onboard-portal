// daily/index.ts
// Die tägliche Funktion: erledigt alles Zeitgesteuerte. Aufgerufen einmal am Morgen von der
// Datenbank (pg_cron, siehe Migration daily_schedule), lokal von Hand.
//
// 1. daily_run(): vorgemerkte Pässe starten, abgelaufene Zugänge beenden, abgelaufene Jobs archivieren.
// 2. Abgleich mit Stripe: bezahlte Sessions ohne Freischaltung nachtragen, Erstattungen vermerken,
//    Hinweis an den Admin.
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

// So weit zurück sucht der Abgleich nach bezahlten Sessions und nach Erstattungen.
const RECONCILE_DAYS = 3;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const euro = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

interface Refund {
  session: Stripe.Checkout.Session;
  cents: number; // insgesamt erstatteter Betrag
  at: number; // Zeitpunkt der letzten Erstattung
}

// Erstattungen der letzten Tage, zugeordnet zur Checkout-Session des Portals. Maßgeblich ist der
// insgesamt erstattete Betrag der Zahlung, nicht die einzelne Erstattung.
async function findRefunds(stripe: Stripe, since: number): Promise<Map<string, Refund>> {
  const latest = new Map<string, number>(); // payment_intent -> Zeitpunkt der letzten Erstattung
  for await (const r of stripe.refunds.list({ created: { gte: since }, limit: 100 })) {
    if (r.status !== "succeeded" || typeof r.payment_intent !== "string") continue;
    latest.set(r.payment_intent, Math.max(latest.get(r.payment_intent) ?? 0, r.created));
  }

  const refunds = new Map<string, Refund>();
  for (const [paymentIntent, at] of latest) {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
    const session = sessions.data[0];
    if (!session?.metadata?.user_id) continue; // keine Zahlung des Portals
    const intent = await stripe.paymentIntents.retrieve(paymentIntent, { expand: ["latest_charge"] });
    const charge = intent.latest_charge;
    const cents = typeof charge === "object" && charge !== null ? charge.amount_refunded : 0;
    if (cents > 0) refunds.set(session.id, { session, cents, at });
  }
  return refunds;
}

// Zahlungen ohne Freischaltung finden und nachtragen (Webhook ausgefallen oder nie angekommen),
// Erstattungen an der Planphase vermerken.
async function reconcileStripe() {
  if (!stripe) return { skipped: "STRIPE_SECRET_KEY is not set" };

  const since = Math.floor(Date.now() / 1000) - RECONCILE_DAYS * 86400;
  const paid: Stripe.Checkout.Session[] = [];
  for await (const s of stripe.checkout.sessions.list({ created: { gte: since }, status: "complete", limit: 100 })) {
    // Nur Sessions, die das Portal erzeugt hat: sie tragen die Nutzer-ID.
    if (s.mode === "payment" && s.payment_status === "paid" && s.metadata?.user_id) paid.push(s);
  }
  // Älteste zuerst: Verlängerung und Upgrade hängen von der Reihenfolge der Käufe ab.
  paid.sort((a, b) => a.created - b.created);
  const refunds = await findRefunds(stripe, since);

  let done = new Set<string>();
  if (paid.length > 0) {
    const { data: known, error } = await db.from("plan_periods").select("stripe_session_id")
      .in("stripe_session_id", paid.map((s) => s.id));
    if (error) throw error;
    done = new Set((known ?? []).map((r) => r.stripe_session_id));
  }

  const granted: string[] = [];
  const failed: string[] = [];
  const refundedNotGranted: string[] = [];
  for (const session of paid.filter((s) => !done.has(s.id))) {
    // Eine vollständig erstattete Zahlung wird nicht nachgetragen.
    const refund = refunds.get(session.id);
    if (refund && refund.cents >= (session.amount_total ?? 0)) {
      // Nur beim ersten Fund melden, nicht an jedem Tag des Suchzeitraums wieder. Als Merker dient
      // ein Eintrag in stripe_events mit eigener Kennung.
      const { error: seen } = await db.from("stripe_events")
        .insert({ id: `reconcile_refund_${session.id}`, type: "reconcile.refunded_not_granted" });
      if (seen) continue;
      refundedNotGranted.push(`${session.id}: ${euro(refund.cents)} erstattet, Nutzer ${session.metadata!.user_id}`);
      continue;
    }
    try {
      const r = await grantPass(stripe, db, session);
      granted.push(`${session.id}: ${r.plan} ${r.starts_on} bis ${r.ends_on}, Nutzer ${session.metadata!.user_id}`);
    } catch (err) {
      failed.push(`${session.id}: ${message(err)}`);
    }
  }

  // Erstattungen an bestehenden Planphasen vermerken. Der Zugang bleibt, wie er ist.
  const refundsRecorded: string[] = [];
  for (const [sessionId, refund] of refunds) {
    const { data, error } = await db.rpc("record_refund", {
      p_session_id: sessionId, p_refunded_cents: refund.cents, p_refunded_at: new Date(refund.at * 1000).toISOString(),
    });
    if (error) {
      failed.push(`${sessionId}: Erstattung nicht vermerkt, ${error.message}`);
    } else if (data.changed) {
      refundsRecorded.push(
        `${sessionId}: ${euro(refund.cents)} erstattet, ${data.plan} ${data.starts_on} bis ${data.ends_on}, Nutzer ${data.user_id}` +
          (data.access_active ? " – Zugang läuft noch, bitte per Hand auf Free setzen" : ""),
      );
    }
  }

  // Hinweis an Patrick bei Abweichungen.
  const findings = granted.length + failed.length + refundedNotGranted.length + refundsRecorded.length;
  if (findings > 0) {
    const { data: setting } = await db.from("app_settings").select("value").eq("key", "admin_notify_email").maybeSingle();
    if (setting?.value && mailConfigured) {
      const section = (title: string, lines: string[]) => [`${title} (${lines.length}):`, ...(lines.length ? lines.map((l) => `- ${l}`) : ["- keine"]), ""];
      await sendMail({
        to: setting.value,
        subject: `Portal: Abgleich mit Stripe, ${findings} Hinweis(e)`,
        text: [
          "Der tägliche Abgleich mit Stripe hat Abweichungen gefunden.",
          "",
          ...section("Bezahlt und nachgetragen", granted),
          ...section("Bezahlt, aber nicht nachtragbar, bitte prüfen", failed),
          ...section("Erstattet und deshalb nicht nachgetragen", refundedNotGranted),
          ...section("Erstattung an der Planphase vermerkt", refundsRecorded),
        ].join("\n").trimEnd(),
      }).catch((err) => console.error("admin notice failed", err));
    }
  }
  return { checked: paid.length, granted, failed, refundedNotGranted, refundsRecorded };
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
