import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Nur der öffentliche Schlüssel (anon) gehört ins Frontend. Was ein Nutzer sehen und ändern darf,
// entscheiden die Zugriffsregeln der Datenbank.
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
export type PlanLevel = Enums<"plan_level">;
