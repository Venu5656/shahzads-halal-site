import "server-only";
import { prisma } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
import { loadCart } from "@/lib/cart/actions";
import { PICKUP_LEAD_MINUTES, nyNow, orderingStatus, type OrderingStatus } from "@/lib/hours";
import { NJ_SALES_TAX_PPM } from "@/lib/money";
import { quoteOrder, type Quote, type QuoteChange, type QuotableItem } from "./quote";

/**
 * Everything the checkout page needs, decided on the server.
 *
 * The browser sends nothing here. The cart is read from the database, the
 * prices are read from the database, and the gates — is the kitchen open, has
 * ordering been paused, is it past the cut-off — are evaluated here. A cart
 * that has gone stale since the customer filled it produces a list of changes
 * rather than a surprise at the card form.
 */

export type CheckoutBlock =
  | { kind: "empty" }
  | { kind: "closed"; opensAt: number | null }
  | { kind: "cutoff"; opensAt: number | null }
  | { kind: "paused"; message: string | null }
  | { kind: "too_small"; totalCents: number }
  | { kind: "changed"; changes: QuoteChange[] };

export type CheckoutView = {
  user: Pick<CurrentUser, "id" | "name" | "phone" | "email">;
  quote: Quote | null;
  /** Non-null when the order cannot proceed; the page explains and stops. */
  block: CheckoutBlock | null;
  ordering: OrderingStatus;
  /** Minutes after confirmation the food should be ready. */
  pickupLeadMinutes: number;
};

/** The tax rate and pause switch, from the single settings row. */
export async function getStoreSettings() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: "store" } });
  return {
    taxRatePpm: settings?.taxRatePpm ?? NJ_SALES_TAX_PPM,
    orderingPaused: settings?.orderingPaused ?? false,
    pausedMessage: settings?.pausedMessage ?? null,
  };
}

/** The live items behind a set of slugs, with their taxability. */
export async function quotableItems(slugs: string[]): Promise<Map<string, QuotableItem>> {
  if (!slugs.length) return new Map();

  const rows = await prisma.menuItem.findMany({
    where: { slug: { in: slugs }, isActive: true },
    include: {
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          optionGroup: {
            include: { options: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });

  return new Map(
    rows.map((row) => [
      row.slug,
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        basePriceCents: row.basePriceCents,
        isAvailable: row.isAvailable,
        outOfStockUntil: row.outOfStockUntil,
        isTaxable: row.isTaxable,
        optionGroups: row.optionGroups
          .filter((link) => link.optionGroup.isActive)
          .map((link) => ({
            id: link.optionGroup.id,
            slug: link.optionGroup.slug,
            name: link.optionGroup.name,
            minSelect: link.optionGroup.minSelect,
            maxSelect: link.optionGroup.maxSelect,
            options: link.optionGroup.options.map((option) => ({
              id: option.id,
              slug: option.slug,
              name: option.name,
              priceCents: option.priceCents,
              isAvailable: option.isAvailable,
            })),
          })),
      },
    ]),
  );
}

/**
 * Builds the checkout view for the signed-in customer.
 *
 * Returns null when nobody is signed in — the page redirects, rather than this
 * module deciding how to respond.
 */
export async function buildCheckout(now: Date = new Date()): Promise<CheckoutView | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const ordering = orderingStatus(nyNow(now));
  const base = {
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
    ordering,
    pickupLeadMinutes: PICKUP_LEAD_MINUTES,
  };

  const [cart, settings] = await Promise.all([loadCart(), getStoreSettings()]);

  if (!cart.length) {
    return { ...base, quote: null, block: { kind: "empty" } };
  }

  // The gates come before the money: there is no point pricing an order the
  // kitchen cannot cook.
  if (settings.orderingPaused) {
    return {
      ...base,
      quote: null,
      block: { kind: "paused", message: settings.pausedMessage },
    };
  }
  if (!ordering.canOrder) {
    return {
      ...base,
      quote: null,
      block: { kind: ordering.reason, opensAt: ordering.opensAt },
    };
  }

  const items = await quotableItems(cart.map((line) => line.itemSlug));
  const result = quoteOrder({
    lines: cart.map((line) => ({
      itemSlug: line.itemSlug,
      optionIds: line.optionIds,
      quantity: line.quantity,
      note: line.note,
    })),
    items,
    taxRatePpm: settings.taxRatePpm,
    now,
  });

  if (!result.ok) {
    return { ...base, quote: result.quote, block: { kind: "changed", changes: result.changes } };
  }

  return { ...base, quote: result.quote, block: null };
}
