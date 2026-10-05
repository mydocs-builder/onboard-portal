import { describe, expect, it } from "vitest";
import { PATHS, checklistTabPath, checkoutPath, fillPath, guidePath, redirectTarget } from "./routes";

describe("fillPath", () => {
  it("fills named placeholders", () => {
    expect(fillPath("/cv/guides/:slug", { slug: "german-cv" })).toBe("/cv/guides/german-cv");
  });

  it("leaves addresses without placeholders alone", () => {
    expect(fillPath("/plan")).toBe("/plan");
  });

  it("encodes values so that they cannot change the path", () => {
    expect(fillPath("/checklists/:key", { key: "a/b?c" })).toBe("/checklists/a%2Fb%3Fc");
  });

  it("carries the rest of the old address over for a trailing /*", () => {
    expect(fillPath("/guides/*", { "*": "cv/german-cv" })).toBe("/guides/cv/german-cv");
    expect(fillPath("/guides/*", {})).toBe("/guides");
  });
});

describe("redirectTarget", () => {
  it("keeps query and anchor of the old address", () => {
    expect(redirectTarget("/visa", {}, "?list=visa_chancenkarte", "#top")).toBe("/visa?list=visa_chancenkarte#top");
  });

  it("moves a placeholder from the old address to the new one", () => {
    expect(redirectTarget("/cv/guides/:slug", { slug: "german-cv" }, "", "")).toBe("/cv/guides/german-cv");
  });
});

describe("address helpers", () => {
  it("build the addresses used in links", () => {
    expect(guidePath("cv", "german-cv")).toBe("/cv/guides/german-cv");
    expect(guidePath("knowledge", "interview-preparation")).toBe("/interview-guide/interview-preparation");
    expect(checkoutPath("plus")).toBe("/checkout?plan=plus");
    expect(checkoutPath("plus", "quarter")).toBe("/checkout?plan=plus&length=quarter");
    expect(checklistTabPath("linkedin", "xing")).toBe("/profiles?list=xing");
  });

  it("every address is unique", () => {
    const all = Object.values(PATHS);
    expect(new Set(all).size).toBe(all.length);
  });

  it("the addresses Stripe returns to are the ones create-checkout uses", () => {
    expect(PATHS.billingSuccess).toBe("/billing/success");
    expect(PATHS.plan).toBe("/plan");
  });

  it("the address of the newsletter confirmation is the one the newsletter function puts into the mail", () => {
    expect(PATHS.newsletterConfirm).toBe("/newsletter/confirm");
  });
});
