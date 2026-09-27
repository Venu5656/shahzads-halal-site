import { describe, expect, it } from "vitest";
import {
  HOURS,
  LAST_ORDER_BEFORE_CLOSE_MINUTES,
  fmtDuration,
  fmtHour,
  nyNow,
  orderingStatus,
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

describe("orderingStatus", () => {
  it("takes orders in the middle of the evening", () => {
    const status = orderingStatus(at(3, 21, 0));
    expect(status.canOrder).toBe(true);
    if (status.canOrder) {
      // Last order 2:40 AM, expressed on the service-day scale.
      expect(status.lastOrderAt).toBeCloseTo(26 + 40 / 60);
      expect(status.minutesLeft).toBe(340);
    }
  });

  it("stops taking orders at 2:40 AM even though the door is open until three", () => {
    // 2:39 AM on Thursday is still Wednesday's service day.
    expect(orderingStatus(at(4, 2, 39)).canOrder).toBe(true);

    const late = orderingStatus(at(4, 2, 41));
    expect(late.canOrder).toBe(false);
    if (!late.canOrder) {
      expect(late.reason).toBe("cutoff");
      // Open again at 10 AM the same morning.
      expect(late.opensAt).toBe(10);
    }
  });

  it("says closed, not cutoff, before the kitchen opens", () => {
    const early = orderingStatus(at(3, 9, 0));
    expect(early.canOrder).toBe(false);
    if (!early.canOrder) {
      expect(early.reason).toBe("closed");
      expect(early.opensAt).toBe(10);
    }
  });

  it("uses Sunday's later opening", () => {
    const beforeNoon = orderingStatus(at(0, 11, 30));
    expect(beforeNoon.canOrder).toBe(false);
    if (!beforeNoon.canOrder) expect(beforeNoon.opensAt).toBe(12);
    expect(orderingStatus(at(0, 12, 1)).canOrder).toBe(true);
  });

  it("still takes orders at 1:47 AM, the hour the whole site is built around", () => {
    expect(orderingStatus(at(4, 1, 47)).canOrder).toBe(true);
  });

  it("leaves the kitchen exactly twenty minutes of slack", () => {
    expect(LAST_ORDER_BEFORE_CLOSE_MINUTES).toBe(20);
    const status = orderingStatus(at(2, 20, 0));
    if (status.canOrder) {
      // Close is 3 AM; the last order is twenty minutes before it.
      expect(status.lastOrderAt).toBeCloseTo(27 - 20 / 60);
    }
  });
});
