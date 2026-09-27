/**
 * What a line costs, and whether the options chosen for it are legal.
 *
 * Deliberately pure: it takes plain data, touches no database and no request,
 * so the same function runs in three places — the item page as you tick boxes,
 * the cart, and the server at checkout, where it is the only answer that
 * counts. The browser's arithmetic is a preview; this module re-run against
 * rows read fresh from the database is the price.
 *
 * Money is integer cents throughout.
 */

export type PricedOption = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
};

export type PricedOptionGroup = {
  id: string;
  slug: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: PricedOption[];
};

export type PricedItem = {
  id: string;
  slug: string;
  name: string;
  /** Null means the owner has not priced it, which makes it unorderable. */
  basePriceCents: number | null;
  isAvailable: boolean;
  outOfStockUntil: Date | null;
  optionGroups: PricedOptionGroup[];
};

export const MAX_QUANTITY = 20;
export const MAX_NOTE_LENGTH = 200;

/** Is this item orderable right now? */
export function isSoldOut(
  item: Pick<PricedItem, "isAvailable" | "outOfStockUntil">,
  now: Date = new Date(),
): boolean {
  if (!item.isAvailable) return true;
  return item.outOfStockUntil !== null && item.outOfStockUntil.getTime() > now.getTime();
}

export type LineProblem =
  | { code: "unpriced"; message: string }
  | { code: "sold_out"; message: string }
  | { code: "quantity"; message: string }
  | { code: "note_too_long"; message: string }
  | { code: "unknown_option"; message: string; groupSlug?: string }
  | { code: "option_unavailable"; message: string; groupSlug: string }
  | { code: "too_few"; message: string; groupSlug: string }
  | { code: "too_many"; message: string; groupSlug: string };

export type PricedLine = {
  unitPriceCents: number;
  lineTotalCents: number;
  /** Flattened for the order snapshot: what was chosen, and what it cost. */
  selected: { groupName: string; optionName: string; priceCents: number }[];
};

export type PriceLineResult =
  | { ok: true; line: PricedLine }
  | { ok: false; problems: LineProblem[] };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Prices one line and enforces every rule the menu declares: the item is
 * orderable, each chosen option exists and is available, and each group's
 * min/max is respected.
 *
 * Returns every problem it finds rather than the first, so a customer whose
 * cart went stale is told everything that changed at once.
 */
export function priceLine(
  item: PricedItem,
  selectedOptionIds: string[],
  quantity: number,
  note: string | null = null,
  now: Date = new Date(),
): PriceLineResult {
  const problems: LineProblem[] = [];

  if (item.basePriceCents === null) {
    problems.push({
      code: "unpriced",
      message: `${item.name} isn't priced yet, so it can't be ordered.`,
    });
  }
  if (isSoldOut(item, now)) {
    problems.push({ code: "sold_out", message: `${item.name} is sold out.` });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    problems.push({
      code: "quantity",
      message: `Choose between 1 and ${MAX_QUANTITY} of ${item.name}.`,
    });
  }
  if (note !== null && note.length > MAX_NOTE_LENGTH) {
    problems.push({
      code: "note_too_long",
      message: `Keep instructions under ${MAX_NOTE_LENGTH} characters.`,
    });
  }

  // Duplicates would otherwise let the same paid option be counted twice.
  const chosen = new Set(selectedOptionIds);
  const known = new Set<string>();
  const selected: PricedLine["selected"] = [];
  let optionsCents = 0;

  for (const group of item.optionGroups) {
    const picked = group.options.filter((option) => chosen.has(option.id));
    for (const option of picked) known.add(option.id);

    if (picked.length < group.minSelect) {
      problems.push({
        code: "too_few",
        groupSlug: group.slug,
        message:
          group.minSelect === 1
            ? `Choose ${group.name.toLowerCase()}.`
            : `Choose at least ${group.minSelect} from ${group.name}.`,
      });
    }
    if (picked.length > group.maxSelect) {
      problems.push({
        code: "too_many",
        groupSlug: group.slug,
        message: `Pick at most ${group.maxSelect} ${plural(group.maxSelect, "option", "options")} from ${group.name}.`,
      });
    }

    for (const option of picked) {
      if (!option.isAvailable) {
        problems.push({
          code: "option_unavailable",
          groupSlug: group.slug,
          message: `${option.name} isn't available right now.`,
        });
        continue;
      }
      optionsCents += option.priceCents;
      selected.push({
        groupName: group.name,
        optionName: option.name,
        priceCents: option.priceCents,
      });
    }
  }

  // An id that belongs to no group on this item — a stale cart, or a tampered
  // request trying to attach a cheaper item's option.
  for (const id of chosen) {
    if (!known.has(id)) {
      problems.push({
        code: "unknown_option",
        message: `One of the choices on ${item.name} is no longer on the menu.`,
      });
      break;
    }
  }

  if (problems.length) return { ok: false, problems };

  const unitPriceCents = item.basePriceCents! + optionsCents;
  return {
    ok: true,
    line: {
      unitPriceCents,
      lineTotalCents: unitPriceCents * quantity,
      selected,
    },
  };
}

/**
 * The cheapest this item can be — base price plus whatever its required groups
 * force you to take. What the menu card should say "from" against.
 */
export function startingPriceCents(item: PricedItem): number | null {
  if (item.basePriceCents === null) return null;
  let cents = item.basePriceCents;
  for (const group of item.optionGroups) {
    if (group.minSelect < 1) continue;
    const available = group.options.filter((o) => o.isAvailable);
    if (!available.length) continue;
    const cheapest = available
      .map((o) => o.priceCents)
      .sort((a, b) => a - b)
      .slice(0, group.minSelect)
      .reduce((total, price) => total + price, 0);
    cents += cheapest;
  }
  return cents;
}

/** True when an item's price moves depending on what you pick. */
export function hasPriceRange(item: PricedItem): boolean {
  return item.optionGroups.some((group) =>
    group.options.some((option) => option.isAvailable && option.priceCents > 0),
  );
}

export type CartTotals = { itemCount: number; subtotalCents: number };

export function sumLines(lines: { quantity: number; lineTotalCents: number }[]): CartTotals {
  return lines.reduce<CartTotals>(
    (totals, line) => ({
      itemCount: totals.itemCount + line.quantity,
      subtotalCents: totals.subtotalCents + line.lineTotalCents,
    }),
    { itemCount: 0, subtotalCents: 0 },
  );
}
