import { describe, expect, it } from "vitest";
import { overviewSteps, type OverviewInput } from "./steps";

const input = (over: Partial<OverviewInput> = {}): OverviewInput => ({
  progress: { cv: { done: 2, total: 8 }, linkedin: { done: 0, total: 6 }, xing: { done: 0, total: 5 }, visa: { done: 1, total: 6 } },
  dismissed: [],
  dueCount: 0,
  newJobs: 0,
  ...over,
});
const keys = (result: ReturnType<typeof overviewSteps>) => result.steps.map((step) => step.key);

describe("overviewSteps", () => {
  it("lists open tasks with the visa documents last", () => {
    expect(keys(overviewSteps(input()))).toEqual(["cv", "linkedin", "xing", "visa"]);
  });

  it("puts events between the profile tasks and the visa documents", () => {
    expect(keys(overviewSteps(input({ dueCount: 2, newJobs: 5 })))).toEqual(["cv", "linkedin", "xing", "followups", "jobs", "visa"]);
  });

  it("moves a task to completed when its checklist is complete; it cannot be reopened", () => {
    const result = overviewSteps(input({ progress: { ...input().progress, cv: { done: 8, total: 8 } } }));
    expect(keys(result)).not.toContain("cv");
    expect(result.completed).toEqual([{ key: "cv", progress: { done: 8, total: 8 }, manual: false }]);
  });

  it("moves a task to completed when marked as done by hand; it can be reopened", () => {
    const result = overviewSteps(input({ dismissed: ["xing"] }));
    expect(keys(result)).toEqual(["cv", "linkedin", "visa"]);
    expect(result.completed).toEqual([{ key: "xing", progress: { done: 0, total: 5 }, manual: true }]);
  });

  it("treats a complete checklist as complete even if it was also dismissed", () => {
    const result = overviewSteps(input({ dismissed: ["cv"], progress: { ...input().progress, cv: { done: 8, total: 8 } } }));
    expect(result.completed[0]).toMatchObject({ key: "cv", manual: false });
  });

  it("shows no event without due steps or new jobs", () => {
    expect(overviewSteps(input()).steps.every((step) => step.kind === "task")).toBe(true);
  });

  it("leaves out tasks whose checklist does not exist and never completes an empty one", () => {
    const result = overviewSteps(input({ progress: { cv: { done: 0, total: 0 } } }));
    expect(keys(result)).toEqual(["cv"]);
    expect(result.completed).toEqual([]);
  });

  it("is empty when everything is done", () => {
    const all = { done: 1, total: 1 };
    const result = overviewSteps(input({ progress: { cv: all, linkedin: all, xing: all, visa: all } }));
    expect(result.steps).toEqual([]);
    expect(result.completed).toHaveLength(4);
  });
});
