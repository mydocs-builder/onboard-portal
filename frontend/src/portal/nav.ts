// Die Navigation des Portals, an genau einer Stelle: Gruppen, Reihenfolge und Einträge.
//  - Beschriftung: nav.items.<id> und nav.groups.<group> in den Texten (src/i18n).
//  - Ziel: die Adresse mit derselben Kennung in src/routes.ts. Wo ein Eintrag im Menü steht und
//    unter welcher Adresse seine Seite liegt, sind zwei getrennte Dinge.
// Ein Eintrag wandert, indem er hier verschoben wird; mehr ist nicht zu ändern.

import { PATHS } from "../routes";
import type { LockArea } from "./PortalProvider";

export type NavId =
  | "overview" | "cv" | "linkedin" | "applications" | "jobs" | "companies" | "boards" | "agencies"
  | "checklist" | "german" | "knowledge" | "contract" | "arrival" | "plan" | "account";

export type NavGroupId = "start" | "search" | "preparation" | "found" | "account";

export type NavItem = {
  id: NavId;
  /** Steht auf dem Handy in der Leiste unten; alle anderen liegen unter "More". */
  mobileMain?: boolean;
  /** Bereich, dessen Sperre ein Schloss am Eintrag zeigt. */
  lock?: LockArea;
  /** Erscheint nur, solange die Bedingung des Portals erfüllt ist (PortalProvider). */
  showIf?: "showJobs" | "showKnowledge";
};

export const NAV: { group: NavGroupId | null; items: NavItem[] }[] = [
  { group: null, items: [{ id: "overview", mobileMain: true }] },
  { group: "start", items: [{ id: "cv", mobileMain: true }, { id: "linkedin", mobileMain: true }] },
  {
    group: "search",
    items: [
      { id: "applications", mobileMain: true },
      { id: "jobs", lock: "jobs", showIf: "showJobs" },
      { id: "companies", lock: "companies" },
      { id: "boards" },
      { id: "agencies", lock: "agencies" },
    ],
  },
  { group: "preparation", items: [{ id: "checklist" }, { id: "german" }, { id: "knowledge", lock: "knowledge", showIf: "showKnowledge" }] },
  { group: "found", items: [{ id: "contract", lock: "contract" }, { id: "arrival" }] },
  { group: "account", items: [{ id: "plan" }, { id: "account" }] },
];

/** Ziel jedes Eintrags: die Adresse mit derselben Kennung in src/routes.ts. */
export const NAV_PATH = Object.fromEntries(NAV.flatMap(({ items }) => items).map((item) => [item.id, PATHS[item.id]])) as Record<NavId, string>;

export const isNavId = (value: string): value is NavId => value in NAV_PATH;
