import { describe, expect, it } from "vitest";
import { Constants } from "../lib/database.types";
import { placeChecklist, withChecklists, type ChecklistArea, type ChecklistRef } from "./checklistNav";

const list = (key: string, area: ChecklistArea, sort = 0): ChecklistRef => ({ key, title: key, area, sort });
const labels = (entries: ReturnType<typeof withChecklists>) => entries.map((entry) => (entry.type === "page" ? entry.id : `[${entry.list.key}]`));

describe("placeChecklist", () => {
  it("has a place for every area the database allows", () => {
    for (const area of Constants.public.Enums.checklist_area) {
      expect(placeChecklist(area), area).not.toBeNull();
    }
  });

  it("keeps the five checklists of phase 1 on their pages", () => {
    expect(placeChecklist("cv")).toEqual({ kind: "page", page: "cv" });
    expect(placeChecklist("linkedin")).toEqual({ kind: "page", page: "linkedin" });
    expect(placeChecklist("checklist")).toEqual({ kind: "page", page: "checklist" });
    expect(placeChecklist("arrival")).toEqual({ kind: "page", page: "arrival" });
  });

  it("gives a checklist its own entry behind another menu entry", () => {
    expect(placeChecklist("contract")).toEqual({ kind: "own", group: "found", after: "contract" });
    expect(placeChecklist("german")).toEqual({ kind: "own", group: "preparation", after: "german" });
    expect(placeChecklist("applications")).toEqual({ kind: "own", group: "search", after: "applications" });
  });

  it("gives a checklist its own entry at the end of a menu group", () => {
    expect(placeChecklist("search")).toEqual({ kind: "own", group: "search", after: null });
    expect(placeChecklist("found")).toEqual({ kind: "own", group: "found", after: null });
  });

  it("has no fallback: a value this file does not know is not placed", () => {
    expect(placeChecklist("family" as ChecklistArea)).toBeNull();
    expect(labels(withChecklists("preparation", ["checklist", "german"], [list("x", "family" as ChecklistArea)]))).toEqual(["checklist", "german"]);
  });
});

describe("withChecklists", () => {
  const preparation = ["checklist", "german", "knowledge"] as const;

  it("leaves a group without own checklists unchanged", () => {
    expect(labels(withChecklists("preparation", [...preparation], [list("cv", "cv"), list("xing", "linkedin")]))).toEqual(["checklist", "german", "knowledge"]);
  });

  it("inserts an entry right behind the menu entry named by area", () => {
    expect(labels(withChecklists("preparation", [...preparation], [list("german_exam", "german")]))).toEqual(["checklist", "german", "[german_exam]", "knowledge"]);
  });

  it("appends entries for a group at the end, ordered by sort", () => {
    const lists = [list("b", "preparation", 2), list("a", "preparation", 1)];
    expect(labels(withChecklists("preparation", [...preparation], lists))).toEqual(["checklist", "german", "knowledge", "[a]", "[b]"]);
  });

  it("puts an entry only into its own group", () => {
    const lists = [list("nursing", "search")];
    expect(labels(withChecklists("preparation", [...preparation], lists))).toEqual(["checklist", "german", "knowledge"]);
    expect(labels(withChecklists("search", ["applications", "boards"], lists))).toEqual(["applications", "boards", "[nursing]"]);
  });

  it("keeps an entry visible when the menu entry it follows is hidden", () => {
    expect(labels(withChecklists("preparation", ["checklist", "german"], [list("interview_day", "knowledge")]))).toEqual(["checklist", "german", "[interview_day]"]);
  });

  it("adds nothing to the group without a title or to the account group", () => {
    expect(labels(withChecklists(null, ["overview"], [list("x", "start")]))).toEqual(["overview"]);
    expect(labels(withChecklists("account", ["plan", "account"], [list("x", "found")]))).toEqual(["plan", "account"]);
  });
});
