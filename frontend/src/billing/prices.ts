import { useEffect, useState } from "react";
import { supabase, type Enums } from "../lib/supabase";

export type PaidPlan = "starter" | "plus";
export type PassLength = Enums<"pass_length">;
export const PAID_PLANS: PaidPlan[] = ["starter", "plus"];
export const PASS_LENGTHS: PassLength[] = ["month", "quarter"];

export const isPaidPlan = (value: string | null): value is PaidPlan => value === "starter" || value === "plus";
export const isPassLength = (value: string | null): value is PassLength => value === "month" || value === "quarter";

/** Preise in Cent je Stufe und Passlänge. Fehlt ein Eintrag, gibt es den Pass nicht zu kaufen. */
export type PriceTable = Partial<Record<PaidPlan, Partial<Record<PassLength, number>>>>;

/** 1400 → "€14", 1260 → "€12.60" */
export function formatEuro(cents: number): string {
  return "€" + (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));
}

/** Die aktiven Preise der Pässe aus der Datenbank; Preise stehen nicht im Code. */
export function usePrices(): { status: "loading" | "error" | "ready"; prices: PriceTable } {
  const [state, setState] = useState<{ status: "loading" | "error" | "ready"; prices: PriceTable }>({ status: "loading", prices: {} });
  useEffect(() => {
    supabase.from("prices").select("plan, pass_length, amount_cents").eq("active", true).then(({ data, error }) => {
      if (error) return setState({ status: "error", prices: {} });
      const prices: PriceTable = {};
      for (const row of data) {
        if (isPaidPlan(row.plan)) prices[row.plan] = { ...prices[row.plan], [row.pass_length]: row.amount_cents };
      }
      setState({ status: "ready", prices });
    });
  }, []);
  return state;
}
