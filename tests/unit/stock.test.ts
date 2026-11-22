import { describe, expect, it } from "vitest";
import { nextCloseAt, stockModeOf, stockStateFor } from "@/lib/menu/stock";
import { nyNow } from "@/lib/hours";

/**
 * The sold-out switch, and why it is a timestamp.
 *
 * The case that matters is the one at one in the morning: the lamb is gone, the
 * shop shuts at three, and whoever marks it off is not going to remember to
 * mark it back on. So "off tonight" has to expire by itself, and these tests
 * pin the arithmetic that decides when.
 */

/** A moment in New York, built from a UTC instant so the test is not local. */
const at = (iso: string) => new Date(iso);

describe("when 'off tonight' ends", () => {
  it("ends at tonight's close when the shop is open", () => {
    // Tuesday 2026-11-24, 22:00 New York (03:00Z Wednesday). Closes at 3 AM.
    const now = at("2026-11-25T03:00:00Z");
    const close = nextCloseAt(now);
    expect(close.getTime()).toBeGreaterThan(now.getTime());
    const wall = nyNow(close);
    expect(wall.h).toBe(3);
  });

  it("ends at tonight's close when asked during the small hours", () => {
    // Wednesday 01:30 New York — inside the previous day's tail, shuts at 3.
    const now = at("2026-11-25T06:30:00Z");
    const close = nextCloseAt(now);
    expect((close.getTime() - now.getTime()) / 60000).toBeCloseTo(90, 0);
  });

  it("covers the whole of the coming day when the shop is shut", () => {
    // Wednesday 08:00 New York: shut, opens 10, closes 3 AM Thursday.
    const now = at("2026-11-25T13:00:00Z");
    const close = nextCloseAt(now);
    const hours = (close.getTime() - now.getTime()) / 3_600_000;
    // Two hours until it opens, then seventeen of service. Not "already over".
    expect(hours).toBeGreaterThan(18);
    expect(nyNow(close).h).toBe(3);
  });
});

describe("what each mode writes", () => {
  const now = at("2026-11-25T03:00:00Z");

  it("puts something back on by clearing both columns", () => {
    expect(stockStateFor("in-stock", now)).toEqual({
      isAvailable: true,
      outOfStockUntil: null,
    });
  });

  it("uses the timestamp for a timed stop, never the flag", () => {
    for (const mode of ["tonight", "two-hours"] as const) {
      const state = stockStateFor(mode, now);
      expect(state.isAvailable).toBe(true);
      expect(state.outOfStockUntil).not.toBeNull();
      expect(state.outOfStockUntil!.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("stops two hours out, not two hours and change", () => {
    const state = stockStateFor("two-hours", now);
    expect(state.outOfStockUntil!.getTime() - now.getTime()).toBe(2 * 3_600_000);
  });

  it("uses the flag for an indefinite stop, and clears the timestamp", () => {
    // The two must never both be in force: whichever is read first would win,
    // and which one that is would depend on the call site.
    expect(stockStateFor("indefinite", now)).toEqual({
      isAvailable: false,
      outOfStockUntil: null,
    });
  });
});

describe("what the manager shows as selected", () => {
  const now = at("2026-11-25T03:00:00Z");

  it("round-trips every mode it can round-trip", () => {
    for (const mode of ["in-stock", "tonight", "indefinite"] as const) {
      expect(stockModeOf(stockStateFor(mode, now), now)).toBe(mode);
    }
  });

  it("reads a two-hour stop as a timed stop — the preset is not stored", () => {
    expect(stockModeOf(stockStateFor("two-hours", now), now)).toBe("tonight");
  });

  it("reads an expired stop as back on, with nothing to clean up", () => {
    const state = { isAvailable: true, outOfStockUntil: at("2026-11-25T02:00:00Z") };
    expect(stockModeOf(state, now)).toBe("in-stock");
  });
});
