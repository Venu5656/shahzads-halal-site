import { hoursFor, nyNow, storeStatus, type WallClock } from "@/lib/hours";

/**
 * How long something is sold out for.
 *
 * The reason `outOfStockUntil` is a timestamp rather than a flag: the lamb runs
 * out at one in the morning, and the person it runs out on is closing the shop
 * in two hours. A switch he has to remember to flip back is a switch that stays
 * flipped, and an item that is still marked sold out at noon the next day costs
 * more than the one he could not sell at 1 AM.
 *
 * So the default is "the rest of tonight", which expires on its own. The
 * indefinite option exists because some things are off for a week, and that is
 * a different decision made by somebody who means it.
 *
 * Pure, so the arithmetic that decides when something comes back can be tested
 * without a clock or a database.
 */

export type StockMode = "in-stock" | "tonight" | "two-hours" | "indefinite";

export const STOCK_MODES: { mode: StockMode; label: string; detail: string }[] = [
  { mode: "in-stock", label: "On", detail: "Orderable now" },
  { mode: "tonight", label: "Off tonight", detail: "Comes back by itself at close" },
  { mode: "two-hours", label: "Off 2 hours", detail: "For a batch that's still cooking" },
  { mode: "indefinite", label: "Off until I say", detail: "Stays off until you switch it on" },
];

export type StockState = { isAvailable: boolean; outOfStockUntil: Date | null };

/**
 * When the store next shuts, as an instant.
 *
 * Open: the close that is coming. Closed: the close at the end of the next
 * opening, because "off tonight" asked for at 9 AM means the whole of today,
 * not a span that has already ended.
 */
export function nextCloseAt(at: Date = new Date(), now: WallClock = nyNow(at)): Date {
  const status = storeStatus(now);
  const hoursAhead = status.open
    ? status.hoursUntilChange
    : // Until opening, then the length of that service.
      status.hoursUntilChange + (hoursFor(now.d)[1] - hoursFor(now.d)[0]);
  return new Date(at.getTime() + Math.ceil(hoursAhead * 3_600_000));
}

/** What a mode means in the two columns the database actually has. */
export function stockStateFor(mode: StockMode, at: Date = new Date()): StockState {
  switch (mode) {
    case "in-stock":
      return { isAvailable: true, outOfStockUntil: null };
    case "tonight":
      return { isAvailable: true, outOfStockUntil: nextCloseAt(at) };
    case "two-hours":
      return { isAvailable: true, outOfStockUntil: new Date(at.getTime() + 2 * 3_600_000) };
    case "indefinite":
      // isAvailable is the indefinite switch; the timestamp is cleared so the
      // two cannot disagree about which one is in force.
      return { isAvailable: false, outOfStockUntil: null };
  }
}

/** Which mode an item is in now — what the manager shows as selected. */
export function stockModeOf(state: StockState, at: Date = new Date()): StockMode {
  if (!state.isAvailable) return "indefinite";
  if (!state.outOfStockUntil || state.outOfStockUntil.getTime() <= at.getTime()) return "in-stock";
  // A timed stop is a timed stop; which preset made it no longer matters.
  return "tonight";
}
