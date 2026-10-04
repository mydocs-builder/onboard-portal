// create-checkout/index.ts
// Erzeugt fuer den angemeldeten Nutzer eine Bezahlseite bei Stripe fuer einen Pass (Einmalzahlung).
// Aufruf aus dem Portal mit dem Login-Token des Nutzers. Entwurf fuer Phase 1.
//
// Body: { "plan": "starter" | "plus", "length": "month" | "quarter" }

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://my.onboard-germany.de";

// Vier Preise in Stripe, jeweils als Einmalzahlung angelegt.
const PRICE_IDS: Record<string, string> = {
  "starter:month": Deno.env.get("PRICE_STARTER_MONTH")!,
  "starter:quarter": Deno.env.get("PRICE_STARTER_QUARTER")!,
  "plus:month": Deno.env.get("PRICE_PLUS_MONTH")!,
  "plus:quarter": Deno.env.get("PRICE_PLUS_QUARTER")!,
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Wer ruft auf? Der Login-Token des Nutzers wird von Supabase geprueft.
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  const { plan, length } = await req.json();
  const priceId = PRICE_IDS[`${plan}:${length}`];
  if (!priceId) return json({ error: "Unknown pass" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: access } = await admin.from("plan_access")
    .select("stripe_customer_id").eq("user_id", user.id).maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan, length },   // daran erkennt der Webhook Nutzer und Pass
    ...(access?.stripe_customer_id
      ? { customer: access.stripe_customer_id }
      : { customer_email: user.email, customer_creation: "always" as const }),
    invoice_creation: { enabled: true },             // Rechnung zu jeder Zahlung
    allow_promotion_codes: true,                     // Feld fuer Gutscheincodes
    // automatic_tax: { enabled: true },             // erst nach Klaerung der Umsatzsteuer (OSS)
    success_url: `${PORTAL_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PORTAL_URL}/plan?checkout=cancelled`,
  });

  return json({ url: session.url });
});
