import { describe, expect, it } from "vitest";
import { NJ_SALES_TAX_PPM } from "@/lib/money";
import {
  MIN_CHARGE_CENTS,
  isChargeable,
  quoteOrder,
  totalsFor,
  type QuotableItem,
  type QuoteLine,
} from "@/lib/orders/quote";

/** A gyro with a free sauce and the paid meal upgrade. */
function gyro(overrides: Partial<QuotableItem> = {}): QuotableItem {
  return {
    id: "i_gyro",
    slug: "lamb-gyro",
    name: "Lamb Gyro",
    basePriceCents: 999,
    isAvailable: true,
    outOfStockUntil: null,
    isTaxable: true,
    optionGroups: [
      {
        id: "g_sauce",
        slug: "sauce-choice",
        name: "Sauce",
        minSelect: 0,
        maxSelect: 3,
        options: [
          { id: "o_white", slug: "white-sauce", name: "White Sauce", priceCents: 0, isAvailable: true },
          { id: "o_hot", slug: "hot-sauce", name: "Hot Sauce", priceCents: 0, isAvailable: true },
        ],
      },
      {
        id: "g_meal",
        slug: "meal-deal",
        name: "Make it a meal",
        minSelect: 0,
        maxSelect: 1,
        options: [
          { id: "o_meal", slug: "fries-and-soda", name: "Add fries and a soda", priceCents: 500, isAvailable: true },
        ],
      },
    ],
    ...overrides,
  };
}

/** Bottled water: $1.99 and, for now, not taxed. */
function water(overrides: Partial<QuotableItem> = {}): QuotableItem {
  return {
    id: "i_water",
    slug: "water",
    name: "Water",
    basePriceCents: 199,
    isAvailable: true,
    outOfStockUntil: null,
    isTaxable: false,
    optionGroups: [],
    ...overrides,
  };
}

const menu = (...items: QuotableItem[]) => new Map(items.map((item) => [item.slug, item]));

const line = (itemSlug: string, optionIds: string[] = [], quantity = 1, note: string | null = null) => ({
  itemSlug,
  optionIds,
  quantity,
  note,
});

describe("quoteOrder", () => {
  it("prices a single gyro with tax", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_white"])],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { quote } = result;
    expect(quote.subtotalCents).toBe(999);
    expect(quote.taxableSubtotalCents).toBe(999);
    // 6.625% of 9.99 = 0.6618 -> 66c
    expect(quote.taxCents).toBe(66);
    expect(quote.totalCents).toBe(1065);
    expect(quote.itemCount).toBe(1);
  });

  it("charges tax on the paid options too", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_white", "o_meal"])],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    if (!result.ok) throw new Error("expected a quote");
    // 9.99 + 5.00 = 14.99, tax 99c
    expect(result.quote.subtotalCents).toBe(1499);
    expect(result.quote.taxCents).toBe(99);
    expect(result.quote.totalCents).toBe(1598);
  });

  it("does not tax the bottled water", () => {
    const result = quoteOrder({
      lines: [line("water")],
      items: menu(water()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    if (!result.ok) throw new Error("expected a quote");
    expect(result.quote.subtotalCents).toBe(199);
    expect(result.quote.taxableSubtotalCents).toBe(0);
    expect(result.quote.taxCents).toBe(0);
    expect(result.quote.totalCents).toBe(199);
  });

  it("taxes the food and leaves the water alone in the same order", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_white"]), line("water", [], 2)],
      items: menu(gyro(), water()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    if (!result.ok) throw new Error("expected a quote");
    const { quote } = result;
    expect(quote.subtotalCents).toBe(999 + 398);
    expect(quote.taxableSubtotalCents).toBe(999);
    expect(quote.taxCents).toBe(66);
    expect(quote.totalCents).toBe(999 + 398 + 66);
    expect(quote.itemCount).toBe(3);
  });

  it("rounds the tax once over the whole basket, not line by line", () => {
    // Three gyros: 29.97 taxable. Rounding once gives 199c; rounding each
    // line would give 3 x 66 = 198c and drift from the printed total.
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_white"], 3)],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    if (!result.ok) throw new Error("expected a quote");
    expect(result.quote.taxableSubtotalCents).toBe(2997);
    expect(result.quote.taxCents).toBe(199);
  });

  it("snapshots the name and the chosen options for the order", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_hot", "o_meal"], 1, "no onions")],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    if (!result.ok) throw new Error("expected a quote");
    const [only] = result.quote.lines;
    expect(only).toMatchObject({
      nameSnapshot: "Lamb Gyro",
      unitPriceCents: 1499,
      quantity: 1,
      note: "no onions",
      isTaxable: true,
    });
    expect(only!.selectedOptions).toEqual([
      { groupName: "Sauce", optionName: "Hot Sauce", priceCents: 0 },
      { groupName: "Make it a meal", optionName: "Add fries and a soda", priceCents: 500 },
    ]);
  });

  it("records the rate it used, so a receipt can explain itself", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro")],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    if (!result.ok) throw new Error("expected a quote");
    expect(result.quote.taxRatePpm).toBe(66_250);
  });

  it("collects no tip, because the site does not ask for one", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro")],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    if (!result.ok) throw new Error("expected a quote");
    expect(result.quote.tipCents).toBe(0);
  });
});

describe("what the server refuses to sell", () => {
  it("reports an item that has left the menu", () => {
    const result = quoteOrder({
      lines: [line("chapli-kabab-deluxe")],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.changes[0]!.message).toMatch(/no longer on the menu/);
  });

  it("reports an item that sold out while it sat in the cart", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_white"])],
      items: menu(gyro({ outOfStockUntil: new Date(Date.now() + 60_000) })),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.changes[0]!.message).toMatch(/sold out/);
  });

  it("reports an option that was withdrawn", () => {
    const item = gyro();
    item.optionGroups[1]!.options[0]!.isAvailable = false;
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_meal"])],
      items: menu(item),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses an option smuggled in from another item", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_from_somewhere_cheaper"])],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    expect(result.ok).toBe(false);
  });

  it("still quotes the lines that are fine, so the customer sees the damage", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro", ["o_white"]), line("gone-forever")],
      items: menu(gyro()),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.changes).toHaveLength(1);
    expect(result.quote?.subtotalCents).toBe(999);
  });

  it("refuses an empty cart", () => {
    const result = quoteOrder({ lines: [], items: menu(), taxRatePpm: NJ_SALES_TAX_PPM });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.changes[0]!.message).toMatch(/empty/);
    expect(result.quote).toBeNull();
  });

  it("refuses an item the owner has not priced", () => {
    const result = quoteOrder({
      lines: [line("lamb-gyro")],
      items: menu(gyro({ basePriceCents: null })),
      taxRatePpm: NJ_SALES_TAX_PPM,
    });
    expect(result.ok).toBe(false);
  });
});

describe("isChargeable", () => {
  it("knows a single dip is below what a card can take", () => {
    const dip: QuoteLine = {
      itemSlug: "dip-bbq",
      nameSnapshot: "BBQ Dip",
      unitPriceCents: 75,
      quantity: 1,
      lineTotalCents: 75,
      selectedOptions: [],
      note: null,
      isTaxable: true,
    };
    const quote = totalsFor([dip], NJ_SALES_TAX_PPM);
    // 75c + 5c tax = 80c, under Stripe's 50c floor? No — over it.
    expect(quote.totalCents).toBe(80);
    expect(isChargeable(quote)).toBe(true);
    expect(MIN_CHARGE_CENTS).toBe(50);
  });

  it("refuses a total below the card minimum", () => {
    const quote = totalsFor(
      [
        {
          itemSlug: "x",
          nameSnapshot: "X",
          unitPriceCents: 25,
          quantity: 1,
          lineTotalCents: 25,
          selectedOptions: [],
          note: null,
          isTaxable: false,
        },
      ],
      NJ_SALES_TAX_PPM,
    );
    expect(isChargeable(quote)).toBe(false);
  });
});
