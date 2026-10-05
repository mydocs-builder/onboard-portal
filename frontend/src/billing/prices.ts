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

type OwnPrices = Partial<Record<PassLength, number>> | undefined;

/**
 * "from €X / month": der Monatspreis des 3-Monats-Passes, auf ganze Euro gerundet (in Cent).
 * Gibt es keinen 3-Monats-Pass, der Preis des 1-Monats-Passes; ohne Preis undefined.
 */
export function monthlyFrom(own: OwnPrices): number | undefined {
  if (own?.quarter !== undefined) return Math.round(own.quarter / 300) * 100;
  return own?.month;
}

/**
 * Ersparnis des 3-Monats-Passes gegenüber drei 1-Monats-Pässen in ganzen Prozent, aus den Preisen
 * berechnet. Unterscheiden sich die Stufen, gilt der kleinere Wert, damit die Aussage für jede Stufe
 * stimmt. null, wenn sich nichts vergleichen lässt oder der 3-Monats-Pass nicht günstiger ist.
 */
export function quarterSavingPercent(prices: PriceTable): number | null {
  const savings = PAID_PLANS.flatMap((plan) => {
    const own = prices[plan];
    if (own?.month === undefined || own.quarter === undefined || own.month <= 0) return [];
    return [Math.round((1 - own.quarter / (own.month * 3)) * 100)];
  });
  if (savings.length === 0) return null;
  const smallest = Math.min(...savings);
  return smallest > 0 ? smallest : null;
}
