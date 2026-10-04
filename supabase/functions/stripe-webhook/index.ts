// stripe-webhook/index.ts
// Empfängt Ereignisse von Stripe, prüft die Signatur und schaltet nach erfolgreicher Zahlung einen Pass frei.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase bereit.
// Diese Funktion wird ohne Supabase-Login aufgerufen (Stripe hat keinen). Die JWT-Prüfung ist für sie
// abgeschaltet (supabase/config.toml), die Sicherheit kommt aus der Stripe-Signatur.
//
// Die Freischaltung selbst steht in _shared/grant.ts und der Datenbankfunktion grant_pass().
// Unzustellbare Fälle (PermanentError) werden protokolliert und fallen beim täglichen Abgleich auf.

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { grantPass, PermanentError } from "../_shared/grant.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Service-Role-Client: darf schreiben und umgeht die Zugriffsregeln. Nur serverseitig verwenden.
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

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
        if (session.mode === "payment" && session.payment_status === "paid") result = await grantPass(stripe, db, session);
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
