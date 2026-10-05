import type { LockArea } from "./PortalProvider";

export type NavId =
  | "overview" | "cv" | "linkedin" | "applications" | "jobs" | "companies" | "boards" | "agencies"
  | "checklist" | "german" | "knowledge" | "contract" | "arrival" | "plan" | "account";

export const NAV_PATH: Record<NavId, string> = {
  overview: "/",
  cv: "/cv",
  linkedin: "/profiles",
  applications: "/applications",
  jobs: "/jobs",
  companies: "/companies",
  boards: "/job-boards",
  agencies: "/agencies",
  checklist: "/visa",
  german: "/german",
  knowledge: "/interview-guide",
  contract: "/contract",
  arrival: "/first-day",
  plan: "/plan",
  account: "/account",
};

// Gruppen der Navigation wie im Prototyp; group ist der Schlüssel unter nav.groups.
export const NAV_GROUPS: { group: string | null; items: NavId[] }[] = [
  { group: null, items: ["overview"] },
  { group: "start", items: ["cv", "linkedin"] },
  { group: "search", items: ["applications", "jobs", "companies", "boards", "agencies"] },
  { group: "preparation", items: ["checklist", "german", "knowledge"] },
  { group: "found", items: ["contract", "arrival"] },
  { group: "account", items: ["plan", "account"] },
];

export const MOBILE_MAIN: NavId[] = ["overview", "cv", "linkedin", "applications"];
export const MOBILE_MORE: NavId[] = [
  "jobs", "companies", "boards", "agencies", "checklist", "german", "knowledge", "contract", "arrival", "plan", "account",
];

export const LOCK_AREA: Partial<Record<NavId, LockArea>> = {
  knowledge: "knowledge",
  companies: "companies",
  agencies: "agencies",
  jobs: "jobs",
  contract: "contract",
};
