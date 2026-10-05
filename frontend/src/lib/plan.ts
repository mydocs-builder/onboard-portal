import type { PlanLevel } from "./supabase";

export const PLAN_RANK: Record<PlanLevel, number> = { free: 0, starter: 1, plus: 2 };
export const PLAN_NAME: Record<PlanLevel, string> = { free: "Free", starter: "Starter", plus: "Plus" };
