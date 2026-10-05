import { describe, expect, it } from "vitest";
import { formatEuro, monthlyFrom, quarterSavingPercent } from "./prices";

const PRICES = { starter: { month: 1400, quarter: 3600 }, plus: { month: 2900, quarter: 7500 } };

describe("monthlyFrom", () => {
  it("is the monthly price of the 3-month pass", () => {
    expect(monthlyFrom(PRICES.starter)).toBe(1200);
    expect(monthlyFrom(PRICES.plus)).toBe(2500);
  });

  it("rounds to whole euros", () => {
    expect(monthlyFrom({ month: 1500, quarter: 4000 })).toBe(1300); // 13.33
    expect(monthlyFrom({ month: 1500, quarter: 4100 })).toBe(1400); // 13.67
  });

  it("falls back to the 1-month price without a 3-month pass, and to nothing without prices", () => {
    expect(monthlyFrom({ month: 1400 })).toBe(1400);
    expect(monthlyFrom({})).toBeUndefined();
    expect(monthlyFrom(undefined)).toBeUndefined();
  });
});

describe("quarterSavingPercent", () => {
  it("computes 14% from the introductory prices", () => {
    expect(quarterSavingPercent(PRICES)).toBe(14); // Starter 14.3 %, Plus 13.8 %
  });

  it("follows the prices when they change", () => {
    expect(quarterSavingPercent({ starter: { month: 1000, quarter: 2400 }, plus: { month: 2000, quarter: 4800 } })).toBe(20);
  });

  it("uses the smaller saving when the plans differ, so the claim holds for both", () => {
    expect(quarterSavingPercent({ starter: { month: 1000, quarter: 2400 }, plus: { month: 2000, quarter: 5400 } })).toBe(10);
  });

  it("makes no claim without both pass lengths or without a saving", () => {
    expect(quarterSavingPercent({ starter: { month: 1400 } })).toBeNull();
    expect(quarterSavingPercent({ starter: { month: 1000, quarter: 3000 } })).toBeNull();
    expect(quarterSavingPercent({})).toBeNull();
  });

  it("compares only plans that have both pass lengths", () => {
    expect(quarterSavingPercent({ starter: { month: 1400, quarter: 3600 }, plus: { month: 2900 } })).toBe(14);
  });
});

describe("formatEuro", () => {
  it("drops the cents for whole amounts", () => {
    expect(formatEuro(1200)).toBe("€12");
    expect(formatEuro(1260)).toBe("€12.60");
  });
});
