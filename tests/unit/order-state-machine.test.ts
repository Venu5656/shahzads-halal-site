import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@prisma/client";
import {
  ACTIVE_STATUSES,
  CUSTOMER_LABELS,
  canTransition,
  isRefundable,
  isTerminal,
  transition,
} from "@/lib/orders/state-machine";

const ALL: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "CANCELLED",
  "REFUNDED",
];

describe("the happy path", () => {
  it("walks an order from payment to the counter", () => {
    const path: OrderStatus[] = [
      "PENDING_PAYMENT",
      "PAID",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "PICKED_UP",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      const result = transition(path[i]!, path[i + 1]!);
      expect(result.ok, `${path[i]} -> ${path[i + 1]}`).toBe(true);
    }
  });

  it("stamps the time each status was reached", () => {
    expect(transition("PENDING_PAYMENT", "PAID")).toMatchObject({ stampField: "paidAt" });
    expect(transition("PAID", "CONFIRMED")).toMatchObject({ stampField: "confirmedAt" });
    expect(transition("READY", "PICKED_UP")).toMatchObject({ stampField: "pickedUpAt" });
  });

  it("lets the kitchen skip straight from confirmed to ready", () => {
    // Small orders come off the grill before anyone touches "preparing".
    expect(canTransition("CONFIRMED", "READY")).toBe(true);
  });
});

describe("the moves that must never happen", () => {
  it("never un-collects an order", () => {
    for (const status of ALL) {
      if (status === "REFUNDED") continue;
      expect(canTransition("PICKED_UP", status)).toBe(false);
    }
  });

  it("never reopens a refunded order", () => {
    for (const status of ALL) {
      expect(canTransition("REFUNDED", status)).toBe(false);
    }
  });

  it("never sends an unpaid order to the kitchen", () => {
    expect(canTransition("PENDING_PAYMENT", "CONFIRMED")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "PREPARING")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "READY")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "PICKED_UP")).toBe(false);
  });

  it("never refunds an order that was never paid", () => {
    expect(canTransition("PENDING_PAYMENT", "REFUNDED")).toBe(false);
  });

  it("never walks a status backwards", () => {
    expect(canTransition("READY", "PREPARING")).toBe(false);
    expect(canTransition("PREPARING", "CONFIRMED")).toBe(false);
    expect(canTransition("CONFIRMED", "PAID")).toBe(false);
    expect(canTransition("PAID", "PENDING_PAYMENT")).toBe(false);
  });

  it("explains itself when it refuses", () => {
    const result = transition("PICKED_UP", "PREPARING");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/cannot go from PICKED_UP to PREPARING/);
  });
});

describe("repeated events", () => {
  it("treats a repeat of the current status as a no-op, not a failure", () => {
    // Stripe can deliver payment_intent.succeeded twice.
    const result = transition("PAID", "PAID");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Already paid/i);
  });
});

describe("cancelling and refunding", () => {
  it("can cancel anything the kitchen still holds", () => {
    for (const status of ["PAID", "CONFIRMED", "PREPARING", "READY"] as OrderStatus[]) {
      expect(canTransition(status, "CANCELLED")).toBe(true);
    }
  });

  it("still owes a refund on an order cancelled after payment", () => {
    expect(canTransition("CANCELLED", "REFUNDED")).toBe(true);
    expect(isRefundable("CANCELLED")).toBe(true);
  });

  it("knows what is refundable and what is finished", () => {
    expect(isRefundable("PENDING_PAYMENT")).toBe(false);
    expect(isRefundable("PAID")).toBe(true);
    expect(isRefundable("PICKED_UP")).toBe(true);
    expect(isTerminal("REFUNDED")).toBe(true);
    expect(isTerminal("PAID")).toBe(false);
  });
});

describe("what the board and the customer see", () => {
  it("shows the kitchen only what it is working on", () => {
    expect(ACTIVE_STATUSES).toEqual(["PAID", "CONFIRMED", "PREPARING", "READY"]);
    for (const status of ACTIVE_STATUSES) expect(isTerminal(status)).toBe(false);
  });

  it("has plain English for every status", () => {
    for (const status of ALL) {
      expect(CUSTOMER_LABELS[status]).toBeTruthy();
      expect(CUSTOMER_LABELS[status]).not.toContain("_");
    }
  });
});
