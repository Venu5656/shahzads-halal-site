import { describe, expect, it } from "vitest";
import {
  HOURS,
  fmtDuration,
  fmtHour,
  nyNow,
  storeStatus,
  type WallClock,
} from "@/lib/hours";

const at = (d: number, h: number, m = 0): WallClock => ({ d, h, m, s: 0 });

describe("storeStatus", () => {
  it("is closed before opening on a weekday", () => {
    const s = storeStatus(at(3, 9, 30)); // Wednesday 9:30 AM
    expect(s.open).toBe(false);
    expect(s.openAt).toBe(10);
    expect(s.hoursUntilChange).toBeCloseTo(0.5);
    expect(s.serviceDay).toBe(3);
  });

  it("is open during the day", () => {
    const s = storeStatus(at(3, 14, 0));
    expect(s.open).toBe(true);
    expect(s.closeAt).toBe(27);
    expect(s.hoursUntilChange).toBeCloseTo(13);
  });

  it("stays open past midnight on yesterday's hours", () => {
    const s = storeStatus(at(4, 1, 30)); // Thursday 1:30 AM = Wednesday's tail
    expect(s.open).toBe(true);
    expect(s.closeAt).toBe(3);
    expect(s.serviceDay).toBe(3);
    expect(s.hoursUntilChange).toBeCloseTo(1.5);
  });

  it("closes at 3 AM", () => {
    const s = storeStatus(at(4, 3, 1));
    expect(s.open).toBe(false);
    expect(s.openAt).toBe(10);
  });

  it("opens at noon on Sunday, not 10", () => {
    expect(storeStatus(at(0, 11, 0)).open).toBe(false);
    expect(storeStatus(at(0, 11, 0)).openAt).toBe(12);
    expect(storeStatus(at(0, 12, 0)).open).toBe(true);
  });

  it("uses Saturday's hours during the early hours of Sunday", () => {
    const s = storeStatus(at(0, 2, 0));
    expect(s.open).toBe(true);
    expect(s.serviceDay).toBe(6);
  });

  it("is open at exactly the opening minute", () => {
    expect(storeStatus(at(1, 10, 0)).open).toBe(true);
  });

  it("covers every day of the week", () => {
    for (let d = 0; d < 7; d++) {
      expect(HOURS[d]).toBeDefined();
      expect(() => storeStatus(at(d, 13, 0))).not.toThrow();
    }
  });
});

describe("fmtHour", () => {
  it.each([
    [10, "10 AM"],
    [12, "12 PM"],
    [27, "3 AM"],
    [0, "12 AM"],
    [12.5, "12:30 PM"],
    [23.25, "11:15 PM"],
  ])("formats %s as %s", (input, expected) => {
    expect(fmtHour(input)).toBe(expected);
  });
});

describe("fmtDuration", () => {
  it.each([
    [0.5, "30 min"],
    [1, "1h 0m"],
    [2.25, "2h 15m"],
  ])("formats %s as %s", (input, expected) => {
    expect(fmtDuration(input)).toBe(expected);
  });
});

describe("nyNow", () => {
  it("reports New York wall-clock time regardless of the host time zone", () => {
    // 2026-01-15T05:30:00Z is 00:30 on Thursday in New York.
    const clock = nyNow(new Date("2026-01-15T05:30:00Z"));
    expect(clock).toMatchObject({ d: 4, h: 0, m: 30 });
    expect(storeStatus(clock).open).toBe(true);
  });
});
