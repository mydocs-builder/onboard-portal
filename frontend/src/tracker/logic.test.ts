import { describe, expect, it } from "vitest";
import { CHOICES, defaultOutcomeDate, editEvents, findDuplicate, isDue, needsDate, resolveOutcome, suggestNext, type AppLike } from "./logic";

const TODAY = "2026-10-03";
const app = (over: Partial<AppLike> = {}): AppLike => ({ status: "applied", next_type: "follow_up", next_on: TODAY, ...over });

describe("suggestNext", () => {
  it("follows the table in the data model", () => {
    expect(suggestNext("planned", TODAY)).toEqual({ next_type: "apply", next_on: "2026-10-06" });
    expect(suggestNext("applied", TODAY)).toEqual({ next_type: "follow_up", next_on: "2026-10-10" });
    expect(suggestNext("interview", TODAY)).toEqual({ next_type: "interview", next_on: "2026-10-10" });
    expect(suggestNext("offer", TODAY)).toEqual({ next_type: "offer_reply", next_on: "2026-10-10" });
  });

  it("closes the next step for finished applications", () => {
    for (const status of ["accepted", "rejected", "no_response", "withdrawn"] as const) {
      expect(suggestNext(status, TODAY)).toEqual({ next_type: "none", next_on: null });
    }
  });

  it("crosses month and year boundaries", () => {
    expect(suggestNext("applied", "2026-12-28").next_on).toBe("2027-01-04");
  });
});

describe("isDue", () => {
  it("is due today and when overdue, not before", () => {
    expect(isDue(app({ next_on: TODAY }), TODAY)).toBe(true);
    expect(isDue(app({ next_on: "2026-10-01" }), TODAY)).toBe(true);
    expect(isDue(app({ next_on: "2026-10-04" }), TODAY)).toBe(false);
  });

  it("is never due without a step, without a date or when the application is closed", () => {
    expect(isDue(app({ next_type: "none" }), TODAY)).toBe(false);
    expect(isDue(app({ next_on: null }), TODAY)).toBe(false);
    expect(isDue(app({ status: "rejected" }), TODAY)).toBe(false);
  });
});

describe("resolveOutcome", () => {
  const base = { currentType: "follow_up" as const, answer: "interview" as const, date: "2026-10-10", today: TODAY };

  it("apply: applied sets the applied date and a follow-up", () => {
    expect(resolveOutcome({ ...base, currentType: "apply", choice: "applied" })).toEqual({
      patch: { status: "applied", next_type: "follow_up", next_on: "2026-10-10", applied_on: TODAY },
      event: "applied",
    });
  });

  it("apply: skip withdraws and closes the next step", () => {
    expect(resolveOutcome({ ...base, currentType: "apply", choice: "skip" }).patch).toEqual({ status: "withdrawn", next_type: "none", next_on: null });
  });

  it("waiting keeps the kind of step: follow-up or decision", () => {
    expect(resolveOutcome({ ...base, choice: "waiting" })).toEqual({ patch: { next_type: "follow_up", next_on: "2026-10-10" }, event: "waiting" });
    expect(resolveOutcome({ ...base, currentType: "decision", choice: "waiting" })).toEqual({ patch: { next_type: "decision", next_on: "2026-10-10" }, event: "waitingDecision" });
  });

  it("later only moves the date", () => {
    expect(resolveOutcome({ ...base, choice: "later", date: "2026-10-06" }).patch).toEqual({ next_on: "2026-10-06" });
  });

  it("close ends without an answer", () => {
    expect(resolveOutcome({ ...base, choice: "close" }).patch).toEqual({ status: "no_response", next_type: "none", next_on: null });
  });

  it("interview done asks about the decision next", () => {
    expect(resolveOutcome({ ...base, currentType: "interview", choice: "done" }).patch).toEqual({ next_type: "decision", next_on: "2026-10-10" });
  });

  it("documents sent leads to a follow-up", () => {
    expect(resolveOutcome({ ...base, currentType: "documents", choice: "sent" }).patch).toEqual({ next_type: "follow_up", next_on: "2026-10-10" });
  });

  it("offer: accept and decline close the application", () => {
    expect(resolveOutcome({ ...base, currentType: "offer_reply", choice: "accept" }).patch).toEqual({ status: "accepted", next_type: "none", next_on: null });
    expect(resolveOutcome({ ...base, currentType: "offer_reply", choice: "decline" }).patch).toEqual({ status: "withdrawn", next_type: "none", next_on: null });
  });

  it("reply maps each answer to status and next step", () => {
    expect(resolveOutcome({ ...base, choice: "reply", answer: "interview" }).patch).toEqual({ status: "interview", next_type: "interview", next_on: "2026-10-10" });
    expect(resolveOutcome({ ...base, choice: "reply", answer: "documents" }).patch).toEqual({ next_type: "documents", next_on: "2026-10-10" });
    expect(resolveOutcome({ ...base, choice: "reply", answer: "offer" }).patch).toEqual({ status: "offer", next_type: "offer_reply", next_on: "2026-10-10" });
    expect(resolveOutcome({ ...base, choice: "reply", answer: "rejected" }).patch).toEqual({ status: "rejected", next_type: "none", next_on: null });
  });

  it("every offered choice resolves for its step type", () => {
    for (const [type, choices] of Object.entries(CHOICES)) {
      for (const choice of choices) {
        expect(resolveOutcome({ ...base, currentType: type as keyof typeof CHOICES, choice }).event).toBeTruthy();
      }
    }
  });
});

describe("needsDate and defaultOutcomeDate", () => {
  it("asks for a date only when a next step follows", () => {
    expect(needsDate("waiting", "interview")).toBe(true);
    expect(needsDate("later", "interview")).toBe(true);
    expect(needsDate("reply", "offer")).toBe(true);
    expect(needsDate("reply", "rejected")).toBe(false);
    expect(needsDate("close", "interview")).toBe(false);
    expect(needsDate("accept", "interview")).toBe(false);
    expect(needsDate(null, "interview")).toBe(false);
  });

  it("suggests three days for later and seven otherwise", () => {
    expect(defaultOutcomeDate("later", TODAY)).toBe("2026-10-06");
    expect(defaultOutcomeDate("waiting", TODAY)).toBe("2026-10-10");
  });
});

describe("editEvents", () => {
  it("records a status change and a changed next step", () => {
    expect(editEvents(app(), app({ status: "interview", next_type: "interview", next_on: "2026-10-10" }))).toEqual(["status", "next"]);
  });

  it("records nothing when only other fields change", () => {
    expect(editEvents(app(), app())).toEqual([]);
  });

  it("does not record a next step when it is removed", () => {
    expect(editEvents(app(), app({ status: "rejected", next_type: "none", next_on: null }))).toEqual(["status"]);
  });

  it("records a moved date", () => {
    expect(editEvents(app(), app({ next_on: "2026-10-12" }))).toEqual(["next"]);
  });
});

describe("findDuplicate", () => {
  const apps = [
    { company: "Beispiel Software AG", status: "applied" as const },
    { company: "Beispiel Energie GmbH", status: "rejected" as const },
  ];

  it("finds an open application at the same company, ignoring case and spaces", () => {
    expect(findDuplicate(apps, "  beispiel  software ag ")).toBe(apps[0]);
  });

  it("ignores closed applications and empty names", () => {
    expect(findDuplicate(apps, "Beispiel Energie GmbH")).toBeUndefined();
    expect(findDuplicate(apps, "   ")).toBeUndefined();
  });
});
