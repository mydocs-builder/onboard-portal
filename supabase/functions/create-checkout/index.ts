// create-checkout/index.ts
// Erzeugt für den angemeldeten Nutzer eine Bezahlseite bei Stripe für einen Pass (Einmalzahlung).
// Aufruf aus dem Portal mit dem Login-Token des Nutzers.
//
// Body: { "plan": "starter" | "plus", "length": "month" | "quarter" }
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

  // Ab hier mit dem Service-Role-Schlüssel: Startphase, Preise und Stripe-Kunden-ID sind für
  // den Kandidaten nicht oder nur teilweise lesbar.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const [launch, profile, price, access] = await Promise.all([
    admin.from("launch_settings").select("sales_enabled").single(),
    admin.from("profiles").select("blocked_at").eq("user_id", user.id).maybeSingle(),
    admin.from("prices").select("stripe_price_id").eq("plan", plan).eq("pass_length", length).eq("active", true).maybeSingle(),
    admin.from("plan_access").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const failed = [launch, profile, price, access].find((r) => r.error);
  if (failed) {
    console.error(failed.error);
    return json({ error: "lookup_failed" }, 500);
  }

  if (!profile.data || profile.data.blocked_at) return json({ error: "account_blocked" }, 403);
  // Solange der Verkauf aus ist (Pilotphase), gibt es keine Bezahlseite.
  if (!launch.data.sales_enabled) return json({ error: "sales_disabled" }, 403);
  // Preise und Stripe-Kennungen kommen aus der Tabelle prices, nicht aus dem Code.
  if (!price.data?.stripe_price_id) return json({ error: "pass_not_available" }, 400);

  const customerId = access.data?.stripe_customer_id;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: price.data.stripe_price_id, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan, length }, // daran erkennt der Webhook Nutzer und Pass
      ...(customerId
        ? { customer: customerId }
        : { customer_email: user.email, customer_creation: "always" as const }),
      invoice_creation: { enabled: true }, // Rechnung zu jeder Zahlung
      allow_promotion_codes: true, // Feld für Gutscheincodes
      // automatic_tax: { enabled: true }, // erst nach Klärung der Umsatzsteuer (OSS)
      success_url: `${PORTAL_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PORTAL_URL}/plan?checkout=cancelled`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error(err);
    return json({ error: "stripe_failed" }, 502);
  }
});
