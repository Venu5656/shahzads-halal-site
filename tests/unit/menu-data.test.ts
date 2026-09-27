import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  FEATURED_SLUGS,
  MENU_ITEMS,
  OPTION_GROUPS,
  RETIRED_SLUGS,
  SAUCES,
  WING_SAUCES,
} from "@/lib/menu-data";

const publicDir = join(process.cwd(), "public");

describe("menu data", () => {
  it("carries all 53 items on the printed menu", () => {
    expect(MENU_ITEMS).toHaveLength(53);
  });

  it("has the sections the printed menu has, in its order", () => {
    expect(CATEGORIES).toEqual([
      "Platters",
      "Gyros",
      "Sandwiches",
      "Wings",
      "Sides",
      "Desserts & Sweets",
      "Beverages",
      "Extra Sauces",
    ]);
  });

  it("has the same number of dishes per section as the board", () => {
    const counts: Record<string, number> = {};
    for (const item of MENU_ITEMS) counts[item.category] = (counts[item.category] ?? 0) + 1;
    expect(counts).toEqual({
      Platters: 9,
      Gyros: 9,
      Sandwiches: 8,
      Wings: 1,
      Sides: 12,
      "Desserts & Sweets": 5,
      Beverages: 3,
      "Extra Sauces": 6,
    });
  });

  it("has unique slugs", () => {
    const slugs = MENU_ITEMS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only uses known categories", () => {
    for (const item of MENU_ITEMS) {
      expect(CATEGORIES).toContain(item.category);
    }
  });

  it("points at images that actually exist in /public", () => {
    for (const item of MENU_ITEMS) {
      expect(existsSync(join(publicDir, item.imagePath))).toBe(true);
    }
  });

  it("prices every item in whole cents, or leaves it honestly unpriced", () => {
    for (const item of MENU_ITEMS) {
      if (item.basePriceCents === null) continue;
      expect(Number.isInteger(item.basePriceCents)).toBe(true);
      expect(item.basePriceCents).toBeGreaterThan(0);
    }
  });

  it("has a price for every single item now", () => {
    const unpriced = MENU_ITEMS.filter((item) => item.basePriceCents === null);
    expect(unpriced.map((item) => item.slug)).toEqual([]);
  });

  it("taxes everything except the bottled water", () => {
    const exempt = MENU_ITEMS.filter((item) => item.isTaxable === false);
    expect(exempt.map((item) => item.slug)).toEqual(["water"]);
  });

  it("matches the printed menu, to the cent", () => {
    const priced = Object.fromEntries(MENU_ITEMS.map((i) => [i.slug, i.basePriceCents]));
    expect(priced).toEqual({
      // PLATTERS
      "fish-over-rice": 1199,
      "falafel-over-rice": 1199,
      "chicken-over-rice": 1299,
      "lamb-over-rice": 1299,
      "chicken-kofta-kabab-over-rice": 1299,
      "chicken-chapli-kabab": 1299,
      "beef-chapli-kabab-rice": 1399,
      "mix-platter": 1399,
      "chapli-kabab-mix": 1499,
      // GYROS
      "chicken-gyro": 999,
      "lamb-gyro": 999,
      "combo-gyro": 999,
      "falafel-gyro": 1099,
      "fish-pita": 1099,
      "kofta-kabab-gyro": 1099,
      "chicken-chapli-gyro": 1099,
      "mix-chapli-gyro": 1099,
      "beef-chapli-gyro": 1199,
      // SANDWICHES
      cheeseburger: 699,
      "chicken-sandwich": 699,
      "fish-sandwich": 699,
      "veggie-burger": 699,
      "crispy-chicken-burger": 799,
      "double-cheese-burger": 999,
      "philly-cheesesteak": 1099,
      "chicken-cheesesteak": 1099,
      // WINGS
      "chicken-wings": 999,
      // SIDES
      "pita-bread": 199,
      "french-fries": 399,
      salad: 399,
      "onion-rings": 499,
      "waffle-fries": 499,
      "masala-fries": 499,
      "curly-fries": 499,
      "chicken-nuggets": 499,
      "mozzarella-sticks": 499,
      "chicken-tenders": 599,
      falafel: 599,
      "chicken-tenders-6pc": 999,
      // DESSERTS & SWEETS
      "cheese-cake": 349,
      "chocolate-cake": 399,
      "red-velvet-cake": 399,
      "gulab-jamun": 599,
      baklava: 599,
      // BEVERAGES
      water: 199,
      soda: 199,
      snapple: 299,
      // EXTRA SAUCES
      "dip-white-sauce": 75,
      "dip-hot-sauce": 75,
      "dip-green-sauce": 75,
      "dip-tahini": 75,
      "dip-bbq": 75,
      "dip-buffalo": 75,
    });
  });

  it("prices the sized dishes the way the board does", () => {
    const group = (slug: string) => OPTION_GROUPS.find((g) => g.slug === slug)!;
    const price = (slug: string) => MENU_ITEMS.find((i) => i.slug === slug)!.basePriceCents!;
    const large = group("side-size").options.find((o) => o.slug === "lg")!.priceCents;

    // Fries 3.99 / 5.99; the other four 4.99 / 6.99.
    expect([price("french-fries"), price("french-fries") + large]).toEqual([399, 599]);
    for (const slug of ["onion-rings", "waffle-fries", "masala-fries", "curly-fries"]) {
      expect([price(slug), price(slug) + large]).toEqual([499, 699]);
    }

    // Falafel 4Pc / 8Pc at 5.99 / 9.99.
    const eight = group("falafel-size").options.find((o) => o.slug === "8-pc")!.priceCents;
    expect([price("falafel"), price("falafel") + eight]).toEqual([599, 999]);
  });

  it("charges the board's two different meal upgrades", () => {
    const deal = (slug: string) =>
      OPTION_GROUPS.find((g) => g.slug === slug)!.options[0]!.priceCents;
    // "Add Fries & Soda +$5" on gyros, "+$4.99" on sandwiches.
    expect(deal("meal-deal-gyro")).toBe(500);
    expect(deal("meal-deal-sandwich")).toBe(499);
  });

  it("only attaches option groups that exist", () => {
    const known = new Set(OPTION_GROUPS.map((group) => group.slug));
    for (const item of MENU_ITEMS) {
      for (const slug of item.optionGroups) expect(known).toContain(slug);
    }
  });

  it("offers sauce on the side on platters and gyros only — elsewhere it is a dip", () => {
    for (const item of MENU_ITEMS) {
      const onTheSide = item.optionGroups.includes("extra-sauce");
      const expected = item.category === "Platters" || item.category === "Gyros";
      expect(onTheSide).toBe(expected);
    }
  });

  it("sells every house sauce on its own, at the board's 75c", () => {
    const dips = MENU_ITEMS.filter((item) => item.category === "Extra Sauces");
    expect(dips).toHaveLength(SAUCES.length);
    for (const dip of dips) {
      expect(dip.basePriceCents).toBe(75);
      expect(dip.optionGroups).toEqual([]);
    }
  });

  it("makes a soda ask which one, and leaves the other drinks alone", () => {
    const soda = MENU_ITEMS.find((item) => item.slug === "soda")!;
    expect(soda.optionGroups).toEqual(["soda-flavour"]);
    expect(MENU_ITEMS.find((item) => item.slug === "water")!.optionGroups).toEqual([]);
  });

  it("gives free sauces to platters and gyros only", () => {
    for (const item of MENU_ITEMS) {
      const free = item.optionGroups.includes("sauce-choice");
      const expected = item.category === "Platters" || item.category === "Gyros";
      expect(free).toBe(expected);
    }
  });
});

describe("the homepage teaser", () => {
  it("features items that are actually on the menu", () => {
    const slugs = new Set(MENU_ITEMS.map((item) => item.slug));
    for (const slug of FEATURED_SLUGS) expect(slugs).toContain(slug);
  });

  it("features four, which is one full row of cards", () => {
    expect(FEATURED_SLUGS).toHaveLength(4);
  });

  it("does not feature anything that has been retired", () => {
    for (const slug of FEATURED_SLUGS) {
      expect(RETIRED_SLUGS as readonly string[]).not.toContain(slug);
    }
  });
});

describe("option groups", () => {
  it("has sane selection limits", () => {
    for (const group of OPTION_GROUPS) {
      expect(group.minSelect).toBeLessThanOrEqual(group.maxSelect);
      expect(group.maxSelect).toBeLessThanOrEqual(group.options.length);
      expect(group.options.length).toBeGreaterThan(0);
    }
  });

  it("lets a platter take three sauces, free", () => {
    const sauces = OPTION_GROUPS.find((group) => group.slug === "sauce-choice")!;
    expect(sauces.maxSelect).toBe(3);
    expect(sauces.options.every((option) => option.priceCents === 0)).toBe(true);
  });

  it("prices the wing sizes the way the rules do", () => {
    const sizes = OPTION_GROUPS.find((group) => group.slug === "wing-size")!;
    const base = 999;
    const total = Object.fromEntries(
      sizes.options.map((option) => [option.slug, base + option.priceCents]),
    );
    expect(total).toEqual({ "6-pc": 999, "12-pc": 1799, "18-pc": 2699, "21-pc": 3199 });
  });

  it("offers every wing sauce the kitchen listed", () => {
    const group = OPTION_GROUPS.find((g) => g.slug === "wing-sauce")!;
    expect(group.options).toHaveLength(WING_SAUCES.length);
    expect(group.minSelect).toBe(1);
  });

  it("does not charge to leave the salad off a platter", () => {
    const extras = OPTION_GROUPS.find((group) => group.slug === "platter-extras")!;
    const noSalad = extras.options.find((option) => option.slug === "no-salad")!;
    expect(noSalad.priceCents).toBe(0);
  });

  it("charges 75c for a sauce on the side", () => {
    const group = OPTION_GROUPS.find((g) => g.slug === "extra-sauce")!;
    expect(group.options.every((option) => option.priceCents === 75)).toBe(true);
  });

  it("has unique option slugs within each group", () => {
    for (const group of OPTION_GROUPS) {
      const slugs = group.options.map((option) => option.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});

describe("sauces", () => {
  it("has the six house sauces with unique slugs", () => {
    expect(SAUCES).toHaveLength(6);
    expect(new Set(SAUCES.map((s) => s.slug)).size).toBe(6);
  });

  it("rates heat from 0 to 5", () => {
    for (const sauce of SAUCES) {
      expect(sauce.heat).toBeGreaterThanOrEqual(0);
      expect(sauce.heat).toBeLessThanOrEqual(5);
    }
  });
});
