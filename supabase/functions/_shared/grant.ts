// Freischaltung eines bezahlten Passes aus einer Stripe-Checkout-Session.
// Genutzt vom Webhook (sofort nach der Zahlung) und vom täglichen Abgleich (Nachtrag).
//
// Die Regeln für Beginn, Ende und Umrechnung stehen in der Datenbankfunktion grant_pass(); sie
// schreibt Planphase, Zugang und Änderungsprotokoll in einer Transaktion und schaltet dieselbe
// Session nur einmal frei.

import type Stripe from "npm:stripe@17";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const PLANS = ["starter", "plus"];
const LENGTHS = ["month", "quarter"];

// Fehler, bei denen ein erneuter Versuch nichts ändert.
export class PermanentError extends Error {}

export interface GrantResult {
  already_processed: boolean;
  plan: string;
  starts_on: string;
  ends_on: string;
  credit_days: number;
}

export async function grantPass(
  stripe: Stripe, db: SupabaseClient, session: Stripe.Checkout.Session,
): Promise<GrantResult> {
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
  return data as GrantResult;
}
