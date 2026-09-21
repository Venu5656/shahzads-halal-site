import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizePhone } from "@/lib/auth/phone";

describe("normalizePhone", () => {
  it.each([
    ["(732) 555-0123", "+17325550123"],
    ["732-555-0123", "+17325550123"],
    ["732.555.0123", "+17325550123"],
    ["7325550123", "+17325550123"],
    ["+1 732 555 0123", "+17325550123"],
    ["1 (732) 555-0123", "+17325550123"],
    ["  (848) 202-1430  ", "+18482021430"],
    ["+1 416 555 0123", "+14165550123"], // Canada shares +1
  ])("normalises %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    "",
    "12345",
    "555-0123",
    "+44 20 7946 0958", // international numbers are refused
    "+91 98765 43210",
    "not a number",
    "1".repeat(40),
  ])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("display helpers", () => {
  it("formats for humans", () => {
    expect(formatPhone("+17325550123")).toBe("(732) 555-0123");
  });

  it("masks all but the last four digits", () => {
    expect(maskPhone("+17325550123")).toBe("(•••) •••-0123");
  });
});
