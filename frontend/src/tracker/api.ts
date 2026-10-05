import { supabase, type Tables } from "../lib/supabase";
import type { Database } from "../lib/database.types";

export type Application = Tables<"applications">;
export type ApplicationEvent = Tables<"application_events">;
type NewApplication = Omit<Database["public"]["Tables"]["applications"]["Insert"], "user_id" | "id">;
type ApplicationPatch = Database["public"]["Tables"]["applications"]["Update"];

export type SaveResult<T = true> = { ok: true; value: T } | { ok: false; reason: "limit" | "error" };

export async function listApplications(): Promise<Application[] | null> {
  const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
  return error ? null : data;
}

export async function listEvents(applicationId: string): Promise<ApplicationEvent[]> {
  const { data } = await supabase.from("application_events").select("*").eq("application_id", applicationId)
    .order("happened_on", { ascending: false }).order("created_at", { ascending: false });
  return data ?? [];
}

const addEvents = (applicationId: string, texts: string[]) =>
  texts.length ? supabase.from("application_events").insert(texts.map((text) => ({ application_id: applicationId, text }))) : null;

/** Legt eine Bewerbung mit ihrem ersten Verlaufseintrag an. Die Free-Grenze prüft die Datenbank. */
export async function addApplication(input: NewApplication, eventText: string): Promise<SaveResult<Application>> {
  const { data, error } = await supabase.from("applications").insert(input).select().single();
  if (error) return { ok: false, reason: error.message === "free_application_limit_reached" ? "limit" : "error" };
  await addEvents(data.id, [eventText]);
  return { ok: true, value: data };
}

export async function updateApplication(id: string, patch: ApplicationPatch, eventTexts: string[]): Promise<SaveResult<Application>> {
  const { data, error } = await supabase.from("applications").update(patch).eq("id", id).select().single();
  if (error) return { ok: false, reason: "error" };
  await addEvents(id, eventTexts);
  return { ok: true, value: data };
}

export async function deleteApplication(id: string): Promise<boolean> {
  const { error } = await supabase.from("applications").delete().eq("id", id);
  return !error;
}
