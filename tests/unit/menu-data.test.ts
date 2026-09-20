import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES, MENU_ITEMS, SAUCES } from "@/lib/menu-data";

const publicDir = join(process.cwd(), "public");

describe("menu data", () => {
  it("carries the 14 items from the original homepage", () => {
    expect(MENU_ITEMS).toHaveLength(14);
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

  it("has no prices yet — they are the owner's to supply", () => {
    expect(Object.keys(MENU_ITEMS[0]!)).not.toContain("priceCents");
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
