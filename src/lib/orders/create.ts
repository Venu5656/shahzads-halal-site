import "server-only";
import { Prisma, type OrderStatus, type PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { reserveOrderNumber } from "./order-number";
import type { Quote } from "./quote";

/**
 * Writing an order down.
 *
 * This is deliberately separate from anything Stripe: it takes a priced quote
 * and a payment reference and records the result. Phase 4's webhook will call
 * it with a real `paymentIntentId`; the tests and the seed call it without
 * one. Nothing here decides whether money arrived — that is the caller's job,
 * and it is why the status is passed in rather than assumed.
 *
 * Idempotent on `paymentIntentId`. Stripe retries a webhook until it gets a
 * 2xx, and more than once in practice, so the second delivery of the same
 * event has to find the order already there and return it rather than write a
 * second one. The column is unique, so even a race between two deliveries
 * ends with one order: the loser catches P2002 and reads the winner's row.
 */

export type CreateOrderInput = {
  userId: string;
  quote: Quote;
  /** Snapshotted, so editing a profile later cannot rewrite order history. */
  customerName: string;
  customerPhone: string;
  customerNote?: string | null;
  /** Stripe's id, or null for an order recorded by other means. */
  paymentIntentId?: string | null;
  paymentMethod?: PaymentMethod | null;
  status?: Extract<OrderStatus, "PENDING_PAYMENT" | "PAID">;
  /** Menu item ids by slug, kept on the line for later analytics. */
  itemIdBySlug?: Map<string, string>;
  now?: Date;
};

/** PENDING_PAYMENT orders are swept after this long. */
export const PAYMENT_WINDOW_MINUTES = 30;

export async function createOrder(input: CreateOrderInput) {
  const {
    userId,
    quote,
    customerName,
    customerPhone,
    customerNote = null,
    paymentIntentId = null,
    paymentMethod = null,
    status = "PENDING_PAYMENT",
    itemIdBySlug,
    now = new Date(),
  } = input;

  if (!quote.lines.length) {
    throw new Error("Refusing to record an order with no lines.");
  }

  // A webhook redelivery arrives here first.
  if (paymentIntentId) {
    const existing = await prisma.order.findUnique({
      where: { paymentIntentId },
      include: { items: true },
    });
    if (existing) return existing;
  }

  const paid = status === "PAID";
  const orderNumber = await reserveOrderNumber(
    async (candidate) =>
      (await prisma.order.count({ where: { orderNumber: candidate } })) > 0,
  );

  const data = {
    orderNumber,
    userId,
    status,
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    tipCents: quote.tipCents,
    totalCents: quote.totalCents,
    paymentIntentId,
    paymentMethod,
    customerNote,
    customerNameSnapshot: customerName,
    customerPhoneSnapshot: customerPhone,
    paidAt: paid ? now : null,
    // Only an unpaid order expires; a paid one is the kitchen's problem now.
    expiresAt: paid ? null : new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60_000),
    items: {
      create: quote.lines.map((line) => ({
        menuItemId: itemIdBySlug?.get(line.itemSlug) ?? null,
        nameSnapshot: line.nameSnapshot,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        selectedOptions: line.selectedOptions as unknown as Prisma.InputJsonValue,
        note: line.note,
        lineTotalCents: line.lineTotalCents,
      })),
    },
  };

  try {
    return await prisma.order.create({ data, include: { items: true } });
  } catch (error) {
    // Two deliveries of the same event raced us. The other one won; read it.
    const clash =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (clash && paymentIntentId) {
      const winner = await prisma.order.findUnique({
        where: { paymentIntentId },
        include: { items: true },
      });
      if (winner) return winner;
    }
    throw error;
  }
}
