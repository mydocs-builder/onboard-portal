// Die Adressen aller Seiten, an genau einer Stelle. Seiten, Links und Navigation nehmen sie von hier;
// im übrigen Code steht keine Adresse als Text. Die Adresse einer Seite ist unabhängig davon, wo
// (und ob) sie im Menü steht: Das Menü regelt src/portal/nav.ts.
//
// Ändert sich eine Adresse: hier den neuen Wert eintragen und die alte Adresse unter REDIRECTS
// aufnehmen, damit Lesezeichen und Links in schon verschickten Mails weiter funktionieren.
//
// Außerhalb des Frontends stehen Adressen des Portals nur an zwei Stellen und müssen dann mitgeändert
// werden: die Rückkehr von Stripe in supabase/functions/create-checkout (billingSuccess, plan) und
// die Links in den Mailtexten unter supabase/functions/_shared/emails.ts.

export const PATHS = {
  // Portal
  overview: "/",
  cv: "/cv",
  cvGuide: "/cv/guides/:slug",
  linkedin: "/profiles",
  applications: "/applications",
  jobs: "/jobs",
  companies: "/companies",
  boards: "/job-boards",
  agencies: "/agencies",
  checklist: "/visa",
  german: "/german",
  knowledge: "/interview-guide",
  knowledgeGuide: "/interview-guide/:slug",
  contract: "/contract",
  arrival: "/first-day",
  plan: "/plan",
  account: "/account",
  // Checklisten, die einen eigenen Menüeintrag bekommen (src/portal/nav.ts)
  ownChecklist: "/checklists/:key",

  // Anmeldung und Kauf
  login: "/login",
  register: "/register",
  checkInbox: "/check-inbox",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authCallback: "/auth/callback",
  welcome: "/welcome",
  checkout: "/checkout",
  billingSuccess: "/billing/success",
} as const;

export type PathId = keyof typeof PATHS;

/** Frühere Adressen und wohin sie weiterleiten. ":name" und ein abschließendes "/*" werden übernommen. */
export const REDIRECTS: { from: string; to: string }[] = [
  // Beispiel: { from: "/visa-checklist", to: PATHS.checklist },
];

/** Setzt Platzhalter ein: fillPath("/cv/guides/:slug", { slug: "german-cv" }) → "/cv/guides/german-cv". */
export function fillPath(pattern: string, params: Record<string, string | undefined> = {}): string {
  return pattern
    .replace(/:(\w+)/g, (_match, name: string) => encodeURIComponent(params[name] ?? ""))
    .replace(/\/\*$/, params["*"] ? `/${params["*"]}` : "");
}

/** Ziel einer Weiterleitung: Platzhalter aus der alten Adresse, dazu unverändert Abfrage und Anker. */
export function redirectTarget(to: string, params: Record<string, string | undefined>, search = "", hash = ""): string {
  return fillPath(to, params) + search + hash;
}

export const guidePath = (parent: "cv" | "knowledge", slug: string) =>
  fillPath(parent === "cv" ? PATHS.cvGuide : PATHS.knowledgeGuide, { slug });

export const ownChecklistPath = (key: string) => fillPath(PATHS.ownChecklist, { key });

export const checkoutPath = (plan: string, length?: string) =>
  `${PATHS.checkout}?plan=${encodeURIComponent(plan)}${length ? `&length=${encodeURIComponent(length)}` : ""}`;

/** Seite eines Menüpunkts mit mehreren Checklisten, auf dem Reiter einer bestimmten Checkliste. */
export const checklistTabPath = (page: PathId, key: string) => `${PATHS[page]}?list=${encodeURIComponent(key)}`;
