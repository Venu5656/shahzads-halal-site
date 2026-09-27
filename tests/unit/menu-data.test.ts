import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES, MENU_ITEMS, OPTION_GROUPS, SAUCES, WING_SAUCES } from "@/lib/menu-data";

const publicDir = join(process.cwd(), "public");

describe("menu data", () => {
  it("carries the 21 items on the owner's price list", () => {
    expect(MENU_ITEMS).toHaveLength(21);
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

  it("prices every item in whole cents", () => {
    for (const item of MENU_ITEMS) {
      expect(Number.isInteger(item.basePriceCents)).toBe(true);
      expect(item.basePriceCents).toBeGreaterThan(0);
    }
  });

  it("matches the price list the owner sent", () => {
    const priced = Object.fromEntries(MENU_ITEMS.map((i) => [i.slug, i.basePriceCents]));
    expect(priced).toMatchObject({
      "chicken-over-rice": 1299,
      "lamb-over-rice": 1299,
      "mix-platter": 1399,
      "chicken-kofta-kabab-over-rice": 1299,
      "falafel-over-rice": 1199,
      "chicken-gyro": 999,
      "lamb-gyro": 999,
      "philly-cheesesteak": 1099,
      "chicken-cheesesteak": 1099,
      cheeseburger: 699,
      "crispy-chicken-burger": 799,
      "veggie-burger": 699,
      "chicken-sandwich": 699,
      "chicken-wings": 999,
      "chicken-tenders": 599,
      "chicken-nuggets": 499,
      "mozzarella-sticks": 499,
      falafel: 599,
      "masala-fries": 399,
      "waffle-fries": 499,
      "onion-rings": 499,
    });
  });

  it("only attaches option groups that exist", () => {
    const known = new Set(OPTION_GROUPS.map((group) => group.slug));
    for (const item of MENU_ITEMS) {
      for (const slug of item.optionGroups) expect(known).toContain(slug);
    }
  });

  it("gives free sauces to platters and gyros only", () => {
    for (const item of MENU_ITEMS) {
      const free = item.optionGroups.includes("sauce-choice");
      const expected = item.category === "Platters" || item.category === "Gyros";
      expect(free).toBe(expected);
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
