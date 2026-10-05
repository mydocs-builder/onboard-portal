// Wo eine Checkliste im Menü erscheint, bestimmt allein ihr Feld area in der Datenbank. Eine neu
// angelegte, aktive Checkliste braucht deshalb keine Änderung am Code. area ist eine feste Werteliste
// (Typ checklist_area); jeder Wert hat hier genau eine Bedeutung:
//
//   Seite mit Checklisten (cv, linkedin, checklist, arrival)
//          → erscheint auf dieser Seite, bei mehreren Checklisten als Reiter
//   anderer Menüeintrag (applications, jobs, companies, boards, agencies, german, knowledge, contract)
//          → eigener Menüeintrag direkt hinter diesem Eintrag
//   Gruppe des Menüs (start, search, preparation, found)
//          → eigener Menüeintrag am Ende dieser Gruppe
//
// Mehrere eigene Einträge an derselben Stelle stehen in der Reihenfolge ihres Felds sort.
// Kommt in der Datenbank ein Wert dazu, gehört er auch hierher; der Test prüft jeden Wert der Liste.

import type { Enums } from "../lib/supabase";
import { NAV, type NavGroupId, type NavId } from "./nav";

export type ChecklistArea = Enums<"checklist_area">;

/** Seiten, die die Checklisten ihres Bereichs selbst anzeigen. */
const CHECKLIST_PAGES: ChecklistArea[] = ["cv", "linkedin", "checklist", "arrival"];
const GROUPS: ChecklistArea[] = ["start", "search", "preparation", "found"];

export type ChecklistRef = { key: string; title: string; area: ChecklistArea; sort: number };

export type Placement =
  | { kind: "page"; page: NavId }
  | { kind: "own"; group: NavGroupId; after: NavId | null };

const groupOf = (id: NavId): NavGroupId | null => NAV.find(({ items }) => items.some((item) => item.id === id))?.group ?? null;

/** Liefert null nur für einen Wert, den diese Datei noch nicht kennt; die Checkliste erscheint dann nicht. */
export function placeChecklist(area: ChecklistArea): Placement | null {
  if (CHECKLIST_PAGES.includes(area)) return { kind: "page", page: area as NavId };
  if (GROUPS.includes(area)) return { kind: "own", group: area as NavGroupId, after: null };
  const group = groupOf(area as NavId);
  return group ? { kind: "own", group, after: area as NavId } : null;
}

export type MenuEntry = { type: "page"; id: NavId } | { type: "checklist"; list: ChecklistRef };

/** Fügt die Checklisten mit eigenem Eintrag in die Einträge einer Gruppe ein. */
export function withChecklists(group: NavGroupId | null, ids: NavId[], lists: ChecklistRef[]): MenuEntry[] {
  const own = lists
    .map((list) => ({ list, place: placeChecklist(list.area) }))
    .filter((entry): entry is { list: ChecklistRef; place: Extract<Placement, { kind: "own" }> } => entry.place?.kind === "own" && entry.place.group === group)
    .sort((a, b) => a.list.sort - b.list.sort || a.list.title.localeCompare(b.list.title));

  const entries: MenuEntry[] = [];
  for (const id of ids) {
    entries.push({ type: "page", id });
    for (const { list, place } of own) if (place.after === id) entries.push({ type: "checklist", list });
  }
  // Am Ende der Gruppe: ohne Bezugseintrag, oder der Bezugseintrag ist gerade ausgeblendet.
  for (const { list, place } of own) if (place.after === null || !ids.includes(place.after)) entries.push({ type: "checklist", list });
  return entries;
}
