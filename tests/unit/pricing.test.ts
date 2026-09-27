import { describe, expect, it } from "vitest";
import {
  MAX_NOTE_LENGTH,
  MAX_QUANTITY,
  hasPriceRange,
  isSoldOut,
  priceLine,
  startingPriceCents,
  sumLines,
  type PricedItem,
} from "@/lib/menu/pricing";

/** A platter shaped like the seeded one: free sauces, paid extras. */
function platter(overrides: Partial<PricedItem> = {}): PricedItem {
  return {
    id: "item_platter",
    slug: "mix-platter",
    name: "Mix Platter",
    basePriceCents: 1399,
    isAvailable: true,
    outOfStockUntil: null,
    optionGroups: [
      {
        id: "g_rice",
        slug: "rice-style",
        name: "Rice",
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: "o_regular", slug: "regular-rice", name: "Regular rice", priceCents: 0, isAvailable: true },
          { id: "o_spicy", slug: "spicy-rice", name: "Spicy rice", priceCents: 0, isAvailable: true },
        ],
      },
      {
        id: "g_sauce",
        slug: "sauce-choice",
        name: "Sauce",
        minSelect: 0,
        maxSelect: 3,
        options: [
          { id: "o_white", slug: "white-sauce", name: "White Sauce", priceCents: 0, isAvailable: true },
          { id: "o_hot", slug: "hot-sauce", name: "Hot Sauce", priceCents: 0, isAvailable: true },
          { id: "o_green", slug: "green-sauce", name: "Green Sauce", priceCents: 0, isAvailable: true },
          { id: "o_bbq", slug: "bbq", name: "BBQ", priceCents: 0, isAvailable: true },
        ],
      },
      {
        id: "g_extras",
        slug: "platter-extras",
        name: "Make it bigger",
        minSelect: 0,
        maxSelect: 4,
        options: [
          { id: "o_protein", slug: "extra-protein", name: "Extra protein", priceCents: 300, isAvailable: true },
          { id: "o_fries", slug: "add-fries", name: "Add fries", priceCents: 200, isAvailable: true },
          { id: "o_pita", slug: "add-pita", name: "Add pita", priceCents: 200, isAvailable: true },
        ],
      },
    ],
    ...overrides,
  };
}

/** Wings: the size is required and carries the price. */
function wings(overrides: Partial<PricedItem> = {}): PricedItem {
  return {
    id: "item_wings",
    slug: "chicken-wings",
    name: "Chicken Wings",
    basePriceCents: 999,
    isAvailable: true,
    outOfStockUntil: null,
    optionGroups: [
      {
        id: "g_size",
        slug: "wing-size",
        name: "How many",
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: "o_6", slug: "6-pc", name: "6 pc", priceCents: 0, isAvailable: true },
          { id: "o_12", slug: "12-pc", name: "12 pc", priceCents: 800, isAvailable: true },
          { id: "o_21", slug: "21-pc", name: "21 pc", priceCents: 2200, isAvailable: true },
        ],
      },
      {
        id: "g_wsauce",
        slug: "wing-sauce",
        name: "Wing sauce",
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: "o_hot", slug: "hot", name: "Hot", priceCents: 0, isAvailable: true },
          { id: "o_bbq", slug: "bbq", name: "BBQ", priceCents: 0, isAvailable: true },
        ],
      },
    ],
    ...overrides,
  };
}

const codes = (result: ReturnType<typeof priceLine>) =>
  result.ok ? [] : result.problems.map((p) => p.code);

describe("priceLine", () => {
  it("prices a platter with only its free choices", () => {
    const result = priceLine(platter(), ["o_regular", "o_white"], 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.line.unitPriceCents).toBe(1399);
      expect(result.line.lineTotalCents).toBe(1399);
    }
  });

  it("adds every paid extra to the unit price", () => {
    // 13.99 + extra protein 3.00 + fries 2.00 + pita 2.00 = 20.99
    const result = priceLine(
      platter(),
      ["o_spicy", "o_hot", "o_protein", "o_fries", "o_pita"],
      1,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.line.unitPriceCents).toBe(2099);
  });

  it("multiplies by quantity, never rounding", () => {
    const result = priceLine(platter(), ["o_regular", "o_protein"], 3);
    expect(result.ok).toBe(true);
    // (1399 + 300) * 3
    if (result.ok) expect(result.line.lineTotalCents).toBe(5097);
  });

  it("records what was chosen, for the order snapshot", () => {
    const result = priceLine(platter(), ["o_spicy", "o_white", "o_protein"], 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.line.selected).toEqual([
        { groupName: "Rice", optionName: "Spicy rice", priceCents: 0 },
        { groupName: "Sauce", optionName: "White Sauce", priceCents: 0 },
        { groupName: "Make it bigger", optionName: "Extra protein", priceCents: 300 },
      ]);
    }
  });

  it("prices wings from the size that was picked", () => {
    const six = priceLine(wings(), ["o_6", "o_hot"], 1);
    const twentyOne = priceLine(wings(), ["o_21", "o_bbq"], 1);
    expect(six.ok && six.line.unitPriceCents).toBe(999);
    expect(twentyOne.ok && twentyOne.line.unitPriceCents).toBe(3199);
  });
});

describe("the rules a line has to satisfy", () => {
  it("insists on a required group", () => {
    expect(codes(priceLine(platter(), ["o_white"], 1))).toContain("too_few");
    expect(codes(priceLine(wings(), ["o_6"], 1))).toContain("too_few");
  });

  it("refuses more than a group allows — four sauces when three is the limit", () => {
    const result = priceLine(
      platter(),
      ["o_regular", "o_white", "o_hot", "o_green", "o_bbq"],
      1,
    );
    expect(codes(result)).toContain("too_many");
  });

  it("allows exactly the maximum", () => {
    const result = priceLine(platter(), ["o_regular", "o_white", "o_hot", "o_green"], 1);
    expect(result.ok).toBe(true);
  });

  it("refuses two sizes at once", () => {
    expect(codes(priceLine(wings(), ["o_6", "o_12", "o_hot"], 1))).toContain("too_many");
  });

  it("rejects an option that belongs to another item", () => {
    expect(codes(priceLine(platter(), ["o_regular", "o_somewhere_else"], 1))).toContain(
      "unknown_option",
    );
  });

  it("rejects an option the kitchen has turned off", () => {
    const item = platter();
    item.optionGroups[2]!.options[0]!.isAvailable = false;
    expect(codes(priceLine(item, ["o_regular", "o_protein"], 1))).toContain(
      "option_unavailable",
    );
  });

  it("does not charge twice for a duplicated option id", () => {
    const result = priceLine(platter(), ["o_regular", "o_protein", "o_protein"], 1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.line.unitPriceCents).toBe(1699);
  });

  it("refuses an item with no price", () => {
    const result = priceLine(platter({ basePriceCents: null }), ["o_regular"], 1);
    expect(codes(result)).toContain("unpriced");
  });

  it("refuses a sold-out item", () => {
    expect(codes(priceLine(platter({ isAvailable: false }), ["o_regular"], 1))).toContain(
      "sold_out",
    );
  });

  it.each([0, -1, 1.5, MAX_QUANTITY + 1])("refuses a quantity of %s", (quantity) => {
    expect(codes(priceLine(platter(), ["o_regular"], quantity))).toContain("quantity");
  });

  it("refuses an over-long instruction", () => {
    const note = "x".repeat(MAX_NOTE_LENGTH + 1);
    expect(codes(priceLine(platter(), ["o_regular"], 1, note))).toContain("note_too_long");
  });

  it("reports every problem at once, not just the first", () => {
    const result = priceLine(platter({ isAvailable: false }), [], 99);
    expect(codes(result).sort()).toEqual(["quantity", "sold_out", "too_few"]);
  });
});

describe("isSoldOut", () => {
  const now = new Date("2026-02-01T12:00:00Z");

  it("is sold out while the timer is running, and back on after", () => {
    const soon = new Date(now.getTime() + 60_000);
    const past = new Date(now.getTime() - 60_000);
    expect(isSoldOut({ isAvailable: true, outOfStockUntil: soon }, now)).toBe(true);
    expect(isSoldOut({ isAvailable: true, outOfStockUntil: past }, now)).toBe(false);
  });

  it("respects the manual switch regardless of the timer", () => {
    expect(isSoldOut({ isAvailable: false, outOfStockUntil: null }, now)).toBe(true);
  });
});

describe("startingPriceCents", () => {
  it("is the base price when nothing is required", () => {
    expect(startingPriceCents(platter())).toBe(1399);
  });

  it("includes the cheapest required choice", () => {
    // Wings start at 6 pc, which adds nothing, so 9.99.
    expect(startingPriceCents(wings())).toBe(999);
  });

  it("adds up when the cheapest required option costs something", () => {
    const item = wings();
    item.optionGroups[0]!.options = [
      { id: "o_12", slug: "12-pc", name: "12 pc", priceCents: 800, isAvailable: true },
      { id: "o_21", slug: "21-pc", name: "21 pc", priceCents: 2200, isAvailable: true },
    ];
    expect(startingPriceCents(item)).toBe(1799);
  });

  it("is null for an unpriced item", () => {
    expect(startingPriceCents(platter({ basePriceCents: null }))).toBeNull();
  });
});

describe("hasPriceRange", () => {
  it("is true when an option costs extra", () => {
    expect(hasPriceRange(platter())).toBe(true);
    expect(hasPriceRange(wings())).toBe(true);
  });

  it("is false when every option is free", () => {
    const item = platter();
    item.optionGroups = item.optionGroups.filter((g) => g.slug !== "platter-extras");
    expect(hasPriceRange(item)).toBe(false);
  });
});

describe("sumLines", () => {
  it("counts items and money separately", () => {
    expect(
      sumLines([
        { quantity: 2, lineTotalCents: 2598 },
        { quantity: 1, lineTotalCents: 999 },
      ]),
    ).toEqual({ itemCount: 3, subtotalCents: 3597 });
  });

  it("is zero for an empty cart", () => {
    expect(sumLines([])).toEqual({ itemCount: 0, subtotalCents: 0 });
  });
});
