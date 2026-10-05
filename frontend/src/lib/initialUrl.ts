// Muss als erstes Modul geladen werden (siehe main.tsx): supabase-js liest beim Start die Angaben
// aus einem Mail-Link (#access_token=… oder #error=…) und räumt die Adresse danach auf.
// Für die Fehlermeldung bei abgelaufenen Links wird der ursprüngliche Zustand hier festgehalten.
const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));

export const initialLinkError: string | null = params.get("error_code") ?? params.get("error");
// Bei einer E-Mail-Änderung bestätigen alte und neue Adresse. Nach dem ersten der beiden Links meldet
// Supabase nur einen Hinweis (#message=…), noch keine Anmeldung.
export const firstOfTwoConfirmations: boolean = params.has("message") && !params.has("access_token") && !params.has("error");
export const cameFromMailLink: boolean = params.has("access_token") || params.has("error");
