import "server-only";
import { cache } from "react";
import type { OrderStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACTIVE_STATUSES, CUSTOMER_LABELS } from "./state-machine";
import { normalizeOrderNumber } from "./order-number";

/**
 * Reading orders, as the customer who placed them.
 *
 * Every function here takes a `userId` and filters on it in the query itself
 * rather than fetching and checking afterwards. An order number is short and
 * guessable by design — SH-4821 is one of nine thousand — so it is a label,
 * never a credential: knowing it must not be enough to read somebody's name,
 * phone number and order history.
 */

export type OrderLineView = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  options: { groupName: string; optionName: string; priceCents: number }[];
  note: string | null;
};

export type OrderView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  isActive: boolean;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  refundedCents: number;
  paymentMethod: PaymentMethod | null;
  customerName: string;
  customerPhone: string;
  customerNote: string | null;
  placedAt: Date;
  paidAt: Date | null;
  readyAt: Date | null;
  pickedUpAt: Date | null;
  cancelledAt: Date | null;
  lines: OrderLineView[];
};

const include = { items: { orderBy: { createdAt: "asc" } } } as const;

type Row = Awaited<ReturnType<typeof prisma.order.findFirstOrThrow<{ include: typeof include }>>>;

function toView(row: Row): OrderView {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    statusLabel: CUSTOMER_LABELS[row.status],
    isActive: ACTIVE_STATUSES.includes(row.status),
    subtotalCents: row.subtotalCents,
    taxCents: row.taxCents,
    tipCents: row.tipCents,
    totalCents: row.totalCents,
    refundedCents: row.refundedCents,
    paymentMethod: row.paymentMethod,
    customerName: row.customerNameSnapshot,
    customerPhone: row.customerPhoneSnapshot,
    customerNote: row.customerNote,
    placedAt: row.createdAt,
    paidAt: row.paidAt,
    readyAt: row.readyAt,
    pickedUpAt: row.pickedUpAt,
    cancelledAt: row.cancelledAt,
    lines: row.items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
      options: Array.isArray(item.selectedOptions)
        ? (item.selectedOptions as OrderLineView["options"])
        : [],
      note: item.note,
    })),
  };
}

/**
 * One order, by the number on the receipt — but only for the person who
 * placed it. Returns null for a stranger's order and for a number that was
 * never issued, so the two are indistinguishable from outside.
 */
export const getOrderForUser = cache(
  async (orderNumber: string, userId: string): Promise<OrderView | null> => {
    const normalized = normalizeOrderNumber(orderNumber);
    if (!normalized) return null;

    const row = await prisma.order.findFirst({
      where: { orderNumber: normalized, userId },
      include,
    });
    return row ? toView(row) : null;
  },
);

/** Someone's own orders, newest first. Unpaid ones are left out. */
export const getOrdersForUser = cache(
  async (userId: string, take = 20): Promise<OrderView[]> => {
    const rows = await prisma.order.findMany({
      where: { userId, status: { not: "PENDING_PAYMENT" } },
      orderBy: { createdAt: "desc" },
      take,
      include,
    });
    return rows.map(toView);
  },
);
