// delete-account/index.ts
// Löscht das Konto des angemeldeten Nutzers, nach Bestätigung mit dem Passwort.
// Aufruf aus dem Portal mit dem Login-Token des Nutzers.
//
// Body: { "password": "<aktuelles Passwort>" }
// Antwort: { "deleted": true } oder { "error": "<code>" }
//
// Mit dem Konto in auth.users verschwinden über die Verknüpfungen alle Daten des Nutzers
// (Profil, Bewerbungen, Checklisten). Planphasen und Zustimmungen zum Kauf bleiben ohne
// Nutzerbezug erhalten (docs/datenmodell.md). Ein laufender Pass verfällt mit dem Konto.
// Daten bei Stripe, die für Rechnungen aufbewahrt werden müssen, bleiben dort.
//
// SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY stellt Supabase bereit.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Wer ruft auf? Der Login-Token des Nutzers wird von Supabase geprüft.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user?.email) return json({ error: "not_signed_in" }, 401);

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) return json({ error: "password_required" }, 400);

  // Das Passwort wird mit einer eigenen Anmeldung geprüft; ein gültiger Token allein genügt nicht.
  // Fehlversuche zählen damit zur Begrenzung der Anmeldeversuche von Supabase.
  const check = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: signIn, error: signInError } = await check.auth.signInWithPassword({ email: user.email, password });
  if (signInError || signIn.user?.id !== user.id) return json({ error: "wrong_password" }, 403);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(error);
    return json({ error: "delete_failed" }, 500);
  }
  return json({ deleted: true });
});
