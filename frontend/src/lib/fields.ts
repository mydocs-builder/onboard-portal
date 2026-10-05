import type { Enums } from "./supabase";

export type Field = Enums<"industry">;

// Berufsfelder in der Reihenfolge des Prototyps; die Bezeichnungen stehen unter fields.* in den Texten.
export const FIELDS: Field[] = ["it", "engineering", "nursing_care", "healthcare", "logistics"];

export const isField = (value: string): value is Field => (FIELDS as string[]).includes(value);
