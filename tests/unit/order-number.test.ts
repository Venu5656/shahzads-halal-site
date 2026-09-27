import { describe, expect, it } from "vitest";
import {
  generateOrderNumber,
  isOrderNumber,
  normalizeOrderNumber,
  reserveOrderNumber,
} from "@/lib/orders/order-number";

describe("generateOrderNumber", () => {
  it("looks like SH-4821", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOrderNumber()).toMatch(/^SH-\d{4}$/);
    }
  });

  it("never starts the number with a zero, so it reads out cleanly", () => {
    for (let i = 0; i < 300; i++) {
      expect(generateOrderNumber()).not.toMatch(/^SH-0/);
    }
  });

  it("is not sequential — nobody can walk the order history", () => {
    const codes = Array.from({ length: 40 }, generateOrderNumber);
    const numbers = codes.map((code) => Number(code.slice(3)));
    const ascending = numbers.every((n, i) => i === 0 || n === numbers[i - 1]! + 1);
    expect(ascending).toBe(false);
    // And it spreads across the space rather than clustering.
    expect(new Set(codes).size).toBeGreaterThan(30);
  });
});

describe("normalizeOrderNumber", () => {
  it.each([
    ["SH-4821", "SH-4821"],
    ["sh-4821", "SH-4821"],
    [" SH-4821 ", "SH-4821"],
    ["4821", "SH-4821"],
    ["sh 4821", "SH-4821"],
  ])("reads %j as %s", (input, expected) => {
    expect(normalizeOrderNumber(input)).toBe(expected);
  });

  it.each(["", "SH-482", "SH-48210", "XX-4821", "SH-ABCD", "'; DROP TABLE"])(
    "rejects %j",
    (input) => {
      expect(normalizeOrderNumber(input)).toBeNull();
    },
  );

  it("agrees with isOrderNumber", () => {
    expect(isOrderNumber("SH-4821")).toBe(true);
    expect(isOrderNumber("4821")).toBe(false);
  });
});

describe("reserveOrderNumber", () => {
  it("returns the first free code", async () => {
    const code = await reserveOrderNumber(async () => false);
    expect(code).toMatch(/^SH-\d{4}$/);
  });

  it("retries past a collision", async () => {
    let calls = 0;
    const code = await reserveOrderNumber(async () => {
      calls++;
      return calls < 3; // the first two are taken
    });
    expect(calls).toBe(3);
    expect(code).toMatch(/^SH-\d{4}$/);
  });

  it("gives up rather than looping forever when the space is full", async () => {
    await expect(reserveOrderNumber(async () => true, 4)).rejects.toThrow(
      /free order number/,
    );
  });
});
