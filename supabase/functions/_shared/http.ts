// Gemeinsame Antworten für Funktionen, die das Portal aus dem Browser aufruft.

const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://my.onboard-germany.de";

// Nur das Portal selbst darf die Funktionen aus dem Browser aufrufen.
export const corsHeaders = {
  "Access-Control-Allow-Origin": new URL(PORTAL_URL).origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export { PORTAL_URL };
