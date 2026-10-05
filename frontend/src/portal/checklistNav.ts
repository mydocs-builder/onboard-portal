// Wo eine Checkliste im Menü erscheint, bestimmt allein ihr Feld area in der Datenbank. Eine neu
// angelegte, aktive Checkliste braucht deshalb keine Änderung am Code.
//
//   area = Seite mit Checklisten (cv, linkedin, checklist, arrival)
//          → erscheint auf dieser Seite, bei mehreren Checklisten als Reiter
//   area = anderer Menüeintrag (z. B. german, contract)
//          → eigener Menüeintrag direkt hinter diesem Eintrag
//   area = Gruppe des Menüs (start, search, preparation, found)
//          → eigener Menüeintrag am Ende dieser Gruppe
//   alles andere
//          → eigener Menüeintrag am Ende von FALLBACK_GROUP, damit keine aktive Checkliste unsichtbar bleibt
//
// Mehrere eigene Einträge an derselben Stelle stehen in der Reihenfolge ihres Felds sort.

import { NAV, type NavGroupId, type NavId } from "./nav";

/** Seiten, die die Checklisten ihres Bereichs selbst anzeigen. */
export const CHECKLIST_PAGES: NavId[] = ["cv", "linkedin", "checklist", "arrival"];

/** Gruppen, in denen Checklisten stehen können; "Your account" gehört nicht dazu. */
const CONTENT_GROUPS: NavGroupId[] = ["start", "search", "preparation", "found"];
export const FALLBACK_GROUP: NavGroupId = "preparation";

export type ChecklistRef = { key: string; title: string; area: string; sort: number };

export type Placement =
  | { kind: "page"; page: NavId }
  | { kind: "own"; group: NavGroupId; after: NavId | null };

const groupOf = (id: NavId): NavGroupId | null => NAV.find(({ items }) => items.some((item) => item.id === id))?.group ?? null;
const allIds = NAV.flatMap(({ items }) => items.map((item) => item.id));

export function placeChecklist(area: string): Placement {
  if ((CHECKLIST_PAGES as string[]).includes(area)) return { kind: "page", page: area as NavId };
  if ((allIds as string[]).includes(area)) {
    const group = groupOf(area as NavId);
    if (group && CONTENT_GROUPS.includes(group)) return { kind: "own", group, after: area as NavId };
  }
  if ((CONTENT_GROUPS as string[]).includes(area)) return { kind: "own", group: area as NavGroupId, after: null };
  return { kind: "own", group: FALLBACK_GROUP, after: null };
}

export type MenuEntry = { type: "page"; id: NavId } | { type: "checklist"; list: ChecklistRef };

/** Fügt die Checklisten mit eigenem Eintrag in die Einträge einer Gruppe ein. */
export function withChecklists(group: NavGroupId | null, ids: NavId[], lists: ChecklistRef[]): MenuEntry[] {
  const own = lists
    .map((list) => ({ list, place: placeChecklist(list.area) }))
    .filter((entry): entry is { list: ChecklistRef; place: Extract<Placement, { kind: "own" }> } => entry.place.kind === "own" && entry.place.group === group)
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
