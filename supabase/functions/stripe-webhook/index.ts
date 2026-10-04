// stripe-webhook/index.ts
// Empfängt Ereignisse von Stripe, prüft die Signatur und schaltet nach erfolgreicher Zahlung einen Pass frei.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase bereit.
// Diese Funktion wird ohne Supabase-Login aufgerufen (Stripe hat keinen). Die JWT-Prüfung ist für sie
// abgeschaltet (supabase/config.toml), die Sicherheit kommt aus der Stripe-Signatur.
//
// Die Regeln für Beginn, Ende und Umrechnung stehen in der Datenbankfunktion grant_pass(); sie
// schreibt Planphase, Zugang und Änderungsprotokoll in einer Transaktion.

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Service-Role-Client: darf schreiben und umgeht die Zugriffsregeln. Nur serverseitig verwenden.
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const PLANS = ["starter", "plus"];
const LENGTHS = ["month", "quarter"];

// Fehler, bei denen eine erneute Zustellung nichts ändert. Sie werden protokolliert und fallen
// beim täglichen Abgleich mit Stripe auf.
class PermanentError extends Error {}

// Freischaltung nach einer erfolgreichen Zahlung.
async function grantPass(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;
  const length = session.metadata?.length;
  if (!userId || !plan || !length || !PLANS.includes(plan) || !LENGTHS.includes(length)) {
    throw new PermanentError(`Incomplete metadata on ${session.id}`);
  }

  // Gutscheincode lesen, falls einer verwendet wurde.
  let promo: string | null = null;
  if ((session.total_details?.amount_discount ?? 0) > 0) {
    const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ["discounts.promotion_code"] });
    const code = full.discounts?.[0]?.promotion_code;
    promo = typeof code === "object" && code !== null ? code.code : null;
  }

  const { data, error } = await db.rpc("grant_pass", {
    p_user_id: userId,
    p_plan: plan,
    p_length: length,
    p_session_id: session.id,
    p_amount_cents: session.amount_total ?? 0,
    p_promo_code: promo,
    p_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
  });
  if (error) {
    // P0002: Konto gibt es nicht (mehr). 22P02: Nutzer-ID ist keine UUID.
    if (error.code === "P0002" || error.code === "22P02") {
      throw new PermanentError(`Cannot grant ${session.id}: ${error.message}`);
    }
    throw error;
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // 1. Signatur prüfen. Ohne gültige Signatur wird nichts verarbeitet.
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, req.headers.get("Stripe-Signature") ?? "", webhookSecret, undefined, cryptoProvider,
    );
  } catch (_err) {
    return new Response("Invalid signature", { status: 400 });
  }

  // 2. Jedes Ereignis nur einmal verarbeiten (Stripe kann Meldungen wiederholen).
  const { error: dup } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup) {
    if (dup.code === "23505") return new Response("Already processed", { status: 200 });
    console.error(dup);
    return new Response("Processing failed", { status: 500 });
  }

  let result: unknown = null;
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Bei verzögerten Zahlungsarten kommt erst "completed" mit Status "unpaid", später "async_payment_succeeded".
        if (session.mode === "payment" && session.payment_status === "paid") result = await grantPass(session);
        break;
      }
      default:
        break; // andere Ereignisse werden angenommen, aber nicht verarbeitet
    }
  } catch (err) {
    console.error(err);
    if (err instanceof PermanentError) {
      return new Response(JSON.stringify({ received: true, granted: false }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    // Eintrag entfernen, damit Stripe die Meldung erneut zustellen kann.
    await db.from("stripe_events").delete().eq("id", event.id);
    return new Response("Processing failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true, result }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
