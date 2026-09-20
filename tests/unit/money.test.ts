import { describe, expect, it } from "vitest";
import { NJ_SALES_TAX_PPM, applyRatePpm, formatCents, parseDollarsToCents } from "@/lib/money";

describe("formatCents", () => {
  it.each([
    [0, "$0.00"],
    [5, "$0.05"],
    [1250, "$12.50"],
    [100000, "$1000.00"],
    [-250, "-$2.50"],
  ])("formats %s as %s", (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it("refuses non-integer cents", () => {
    expect(() => formatCents(12.5)).toThrow();
  });
});

describe("parseDollarsToCents", () => {
  it.each([
    ["12.50", 1250],
    ["$12.50", 1250],
    ["12", 1200],
    ["0.05", 5],
    ["12.5", 1250],
  ])("parses %s as %s", (input, expected) => {
    expect(parseDollarsToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "12.345", "-5", "1,200"])("rejects %s", (input) => {
    expect(() => parseDollarsToCents(input)).toThrow();
  });
});

describe("applyRatePpm", () => {
  it("applies NJ's 6.625% to a subtotal", () => {
    expect(applyRatePpm(1000, NJ_SALES_TAX_PPM)).toBe(66); // $10.00 -> $0.66
    expect(applyRatePpm(2599, NJ_SALES_TAX_PPM)).toBe(172); // $25.99 -> $1.72
    expect(applyRatePpm(0, NJ_SALES_TAX_PPM)).toBe(0);
  });

  it("returns integer cents for every input", () => {
    for (let cents = 0; cents < 5000; cents += 37) {
      expect(Number.isInteger(applyRatePpm(cents, NJ_SALES_TAX_PPM))).toBe(true);
    }
  });
});
