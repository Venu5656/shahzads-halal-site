/**
 * What an order costs, decided by the server.
 *
 * This is the only arithmetic that matters. The cart in the browser prices
 * itself so the panel can be instant, but every number here is recomputed from
 * rows read fresh out of the database at the moment of checkout — so a price
 * edited by a manager, an item that sold out, or a cart tampered with in the
 * console all produce the same outcome: the quote disagrees with the browser,
 * and the customer is told exactly what changed before they pay a penny.
 *
 * Pure, so the whole thing is testable without a database or a request.
 */

import { applyRatePpm } from "@/lib/money";
import { priceLine, type PricedItem } from "@/lib/menu/pricing";

export type QuoteLineInput = {
  itemSlug: string;
  optionIds: string[];
  quantity: number;
  note: string | null;
};

/** An item as the database has it, plus whether tax applies to it. */
export type QuotableItem = PricedItem & {
  name: string;
  isTaxable: boolean;
};

export type QuoteLine = {
  itemSlug: string;
  /** Snapshotted onto the order, so a later menu edit cannot rewrite history. */
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  selectedOptions: { groupName: string; optionName: string; priceCents: number }[];
  note: string | null;
  isTaxable: boolean;
};

/** Something that changed between the browser's cart and the database. */
export type QuoteChange = {
  itemSlug: string;
  itemName: string;
  message: string;
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotalCents: number;
  /** The part of the subtotal tax applies to. */
  taxableSubtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  /** Rate used, in parts per million, recorded so a receipt can explain itself. */
  taxRatePpm: number;
};

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; changes: QuoteChange[]; quote: Quote | null };

/**
 * Prices a whole cart.
 *
 * `items` must come from the database, keyed by slug. Anything the cart refers
 * to that is missing, unpriced, sold out or mis-configured is reported as a
 * change rather than silently dropped — the customer sees the list.
 */
export function quoteOrder(options: {
  lines: QuoteLineInput[];
  items: Map<string, QuotableItem>;
  taxRatePpm: number;
  /** Tips are not collected today; the parameter keeps the seam open. */
  tipCents?: number;
  now?: Date;
}): QuoteResult {
  const { lines, items, taxRatePpm, tipCents = 0, now = new Date() } = options;

  const priced: QuoteLine[] = [];
  const changes: QuoteChange[] = [];

  for (const line of lines) {
    const item = items.get(line.itemSlug);
    if (!item) {
      changes.push({
        itemSlug: line.itemSlug,
        itemName: line.itemSlug,
        message: "That item is no longer on the menu.",
      });
      continue;
    }

    const result = priceLine(item, line.optionIds, line.quantity, line.note, now);
    if (!result.ok) {
      for (const problem of result.problems) {
        changes.push({ itemSlug: item.slug, itemName: item.name, message: problem.message });
      }
      continue;
    }

    priced.push({
      itemSlug: item.slug,
      nameSnapshot: item.name,
      unitPriceCents: result.line.unitPriceCents,
      quantity: line.quantity,
      lineTotalCents: result.line.lineTotalCents,
      selectedOptions: result.line.selected,
      note: line.note,
      isTaxable: item.isTaxable,
    });
  }

  const quote = totalsFor(priced, taxRatePpm, tipCents);

  if (changes.length) return { ok: false, changes, quote: priced.length ? quote : null };
  if (!priced.length) {
    return {
      ok: false,
      changes: [{ itemSlug: "", itemName: "", message: "Your cart is empty." }],
      quote: null,
    };
  }
  return { ok: true, quote };
}

/**
 * Adds a set of priced lines up.
 *
 * Tax is applied to the taxable subtotal as a whole rather than line by line,
 * which is how a register does it: rounding once at the end cannot drift from
 * the printed total the way rounding every line can.
 */
export function totalsFor(
  lines: QuoteLine[],
  taxRatePpm: number,
  tipCents = 0,
): Quote {
  let itemCount = 0;
  let subtotalCents = 0;
  let taxableSubtotalCents = 0;

  for (const line of lines) {
    itemCount += line.quantity;
    subtotalCents += line.lineTotalCents;
    if (line.isTaxable) taxableSubtotalCents += line.lineTotalCents;
  }

  const taxCents = applyRatePpm(taxableSubtotalCents, taxRatePpm);

  return {
    lines,
    itemCount,
    subtotalCents,
    taxableSubtotalCents,
    taxCents,
    tipCents,
    totalCents: subtotalCents + taxCents + tipCents,
    taxRatePpm,
  };
}

/** Stripe's minimum chargeable amount in USD. Below this a card cannot be taken. */
export const MIN_CHARGE_CENTS = 50;

export function isChargeable(quote: Quote): boolean {
  return quote.totalCents >= MIN_CHARGE_CENTS;
}
