import type { OrderStatus } from "@prisma/client";

/**
 * Every status an order can move to, and from where.
 *
 * One table, one function, no exceptions. Both the webhook and the manager
 * area go through `transition()`, so there is exactly one place that knows a
 * refunded order cannot go back to preparing, and exactly one place to look
 * when that turns out to be wrong.
 *
 * Pure, so the illegal moves can be tested without a database.
 */

const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  // Waiting on Stripe. Paid on success, cancelled when the attempt is
  // abandoned or the 30-minute sweep expires it.
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  // Money taken, kitchen has not acknowledged it yet. Refundable from here.
  PAID: ["CONFIRMED", "CANCELLED", "REFUNDED"],
  // A manager pressed confirm; the ticket has printed.
  CONFIRMED: ["PREPARING", "READY", "CANCELLED", "REFUNDED"],
  PREPARING: ["READY", "CANCELLED", "REFUNDED"],
  // Ready on the counter. Can still be refunded if nobody comes for it.
  READY: ["PICKED_UP", "CANCELLED", "REFUNDED"],
  // Collected. The only way out is a refund — an order is never un-collected.
  PICKED_UP: ["REFUNDED"],
  // Terminal, except that a cancelled-but-paid order still owes a refund.
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

/** The timestamp column that records each status being reached. */
const STAMPED_AT: Partial<Record<OrderStatus, string>> = {
  PAID: "paidAt",
  CONFIRMED: "confirmedAt",
  PREPARING: "preparingAt",
  READY: "readyAt",
  PICKED_UP: "pickedUpAt",
  CANCELLED: "cancelledAt",
  REFUNDED: "refundedAt",
};

export type TransitionResult =
  | { ok: true; status: OrderStatus; stampField: string | null }
  | { ok: false; reason: string };

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

/**
 * Checks a move and says which timestamp to set.
 *
 * Moving to the status an order is already in is reported as a no-op rather
 * than an error: Stripe can deliver the same event twice, and the second
 * delivery must not look like a failure.
 */
export function transition(from: OrderStatus, to: OrderStatus): TransitionResult {
  if (from === to) {
    return { ok: false, reason: `Already ${to.toLowerCase().replace(/_/g, " ")}.` };
  }
  if (!canTransition(from, to)) {
    return {
      ok: false,
      reason: `An order cannot go from ${from} to ${to}.`,
    };
  }
  return { ok: true, status: to, stampField: STAMPED_AT[to] ?? null };
}

/** Statuses the kitchen is still working on — what the live board shows. */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  "PAID",
  "CONFIRMED",
  "PREPARING",
  "READY",
];

/** Nothing further happens to these on its own. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ["PICKED_UP", "CANCELLED", "REFUNDED"];

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Money has been taken, so a cancellation owes the customer a refund. */
export function isRefundable(status: OrderStatus): boolean {
  return canTransition(status, "REFUNDED");
}

/** What the customer is told, rather than the enum name. */
export const CUSTOMER_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PAID: "Sent to the kitchen",
  CONFIRMED: "Confirmed",
  PREPARING: "Being cooked",
  READY: "Ready for pickup",
  PICKED_UP: "Collected",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};
