// stripe-webhook/index.ts
// Empfaengt Ereignisse von Stripe, prueft die Signatur und schaltet nach erfolgreicher Zahlung einen Pass frei.
// Entwurf fuer Phase 1, im Stripe-Testmodus pruefen.
//
// Secrets (Supabase): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET; SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY sind vorhanden.
// Diese Funktion wird ohne Supabase-Login aufgerufen (Stripe hat keinen). Die JWT-Pruefung ist fuer sie
// abgeschaltet, die Sicherheit kommt aus der Stripe-Signatur.

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Service-Role-Client: darf schreiben und umgeht die Zugriffsregeln. Nur serverseitig verwenden.
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const RANK: Record<string, number> = { free: 0, starter: 1, plus: 2 };
const DAYS: Record<string, number> = { month: 30, quarter: 90 };
// Listenpreise in Cent, fuer die Umrechnung von Resttagen beim Upgrade. Muessen zu den Stripe-Preisen passen.
const PRICE_CENTS: Record<string, Record<string, number>> = {
  starter: { month: 1400, quarter: 3600 },
  plus: { month: 2900, quarter: 7500 },
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
};

// Freischaltung nach einer erfolgreichen Zahlung.
async function grantPass(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan as "starter" | "plus";
  const length = session.metadata?.length as "month" | "quarter";
  if (!userId || !RANK[plan] || !DAYS[length]) throw new Error(`Incomplete metadata on ${session.id}`);

  const today = isoDate(new Date());
  const { data: current } = await db.from("plan_access")
    .select("plan, source, pass_length, valid_until").eq("user_id", userId).maybeSingle();

  // Regeln fuer einen neuen Pass bei laufendem Zugang:
  // - Gleiche oder niedrigere Stufe, auch nach einer kostenlosen Freischaltung: Beginn am Tag nach dem bisherigen Ende.
  // - Upgrade auf eine hoehere Stufe: Wechsel sofort. Der Restwert eines bezahlten Passes wird in Tage der
  //   hoeheren Stufe umgerechnet (Listenpreis pro Tag alt / neu), damit kein Tag verloren geht und sich ein
  //   guenstiger Pass nicht in teure Tage verwandeln laesst. Resttage einer kostenlosen Freischaltung entfallen.
  const active = !!current && !!current.valid_until && current.valid_until >= today && current.plan !== "free";
  const upgrade = active && RANK[plan] > RANK[current!.plan];
  let start: string;
  let end: string;
  if (!active) {
    start = today;
    end = addDays(today, DAYS[length] - 1);
  } else if (upgrade) {
    let credit = 0;
    if (current!.source === "pass" && current!.pass_length) {
      const remaining = Math.round((Date.parse(`${current!.valid_until}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
      const oldDaily = PRICE_CENTS[current!.plan][current!.pass_length] / DAYS[current!.pass_length];
      const newDaily = PRICE_CENTS[plan][length] / DAYS[length];
      credit = Math.floor(remaining * oldDaily / newDaily);
    }
    start = today;
    end = addDays(today, DAYS[length] - 1 + credit);
  } else {
    start = addDays(current!.valid_until!, 1);
    end = addDays(current!.valid_until!, DAYS[length]);
  }

  // Gutscheincode lesen, falls einer verwendet wurde.
  const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ["discounts.promotion_code"] });
  // deno-lint-ignore no-explicit-any
  const promo = (full as any).discounts?.[0]?.promotion_code?.code ?? null;

  // Verlauf zuerst: der eindeutige Schluessel auf stripe_session_id verhindert eine doppelte Freischaltung.
  const { error: periodError } = await db.from("plan_periods").insert({
    user_id: userId, plan, source: "pass", pass_length: length, promo_code: promo,
    amount_cents: session.amount_total, starts_on: start, ends_on: end, stripe_session_id: session.id,
  });
  if (periodError) {
    if (periodError.code === "23505") return; // schon verarbeitet
    throw periodError;
  }

  // Beginnt der Pass heute, gilt die neue Stufe sofort bis zum neuen Ende.
  // Beginnt er spaeter, bleibt der bisherige Zugang bis zu seinem Ende; die taegliche Funktion
  // stellt am Beginn auf die neue Stufe um (Grundlage: plan_periods).
  const switchNow = start === today;
  const { error } = await db.from("plan_access").upsert({
    user_id: userId,
    plan: switchNow ? plan : current!.plan,
    source: switchNow ? "pass" : current!.source,
    pass_length: switchNow ? length : null,
    valid_until: switchNow ? end : current!.valid_until,   // bei spaeterem Beginn bleibt das alte Ende stehen
    manual_reason: switchNow ? null : undefined,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  await db.from("audit_log").insert({
    user_id: userId, actor: "stripe",
    text: `${plan === "plus" ? "Plus" : "Starter"}-Pass (${length === "month" ? "1 Monat" : "3 Monate"}) gekauft, gueltig ${start} bis ${end}` +
      (promo ? `, Gutscheincode ${promo}` : ""),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // 1. Signatur pruefen. Ohne gueltige Signatur wird nichts verarbeitet.
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, req.headers.get("Stripe-Signature")!, webhookSecret, undefined, cryptoProvider,
    );
  } catch (err) {
    return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 });
  }

  // 2. Jedes Ereignis nur einmal verarbeiten (Stripe kann Meldungen wiederholen).
  const { error: dup } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup) return new Response("Already processed", { status: 200 });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Bei verzoegerten Zahlungsarten kommt erst "completed" mit Status "unpaid", spaeter "async_payment_succeeded".
        if (session.mode === "payment" && session.payment_status === "paid") await grantPass(session);
        break;
      }
      default:
        break; // andere Ereignisse werden angenommen, aber nicht verarbeitet
    }
  } catch (err) {
    // Eintrag entfernen, damit Stripe die Meldung erneut zustellen kann.
    await db.from("stripe_events").delete().eq("id", event.id);
    console.error(err);
    return new Response("Processing failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
