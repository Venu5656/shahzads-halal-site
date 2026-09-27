import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { PricedItem } from "./pricing";

/**
 * Reading the menu.
 *
 * Everything the customer sees comes from here, never from the seed module —
 * so a price edited in the manager area (phase 7) is live immediately. The
 * queries are memoised per request with React's `cache`, so a page that needs
 * the menu twice still makes one round trip.
 */

export type MenuItemView = PricedItem & {
  description: string;
  imagePath: string;
  badge: string | null;
  tags: string[];
  categoryName: string;
  categorySlug: string;
};

export type MenuCategoryView = {
  id: string;
  name: string;
  slug: string;
  items: MenuItemView[];
};

const itemInclude = {
  category: { select: { name: true, slug: true } },
  optionGroups: {
    orderBy: { sortOrder: "asc" },
    include: {
      optionGroup: {
        include: {
          options: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  },
} as const;

type ItemRow = Awaited<
  ReturnType<typeof prisma.menuItem.findFirstOrThrow<{ include: typeof itemInclude }>>
>;

function toView(row: ItemRow): MenuItemView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imagePath: row.imagePath,
    basePriceCents: row.basePriceCents,
    isAvailable: row.isAvailable,
    outOfStockUntil: row.outOfStockUntil,
    badge: row.badge,
    tags: row.tags,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
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
  };
}

/** Every live item, grouped by category, in menu order. */
export const getMenu = cache(async (): Promise<MenuCategoryView[]> => {
  const categories = await prisma.category.findMany({
    where: { isActive: true, items: { some: { isActive: true } } },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: itemInclude,
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    items: category.items.map(toView),
  }));
});

/** Flat list, for the cart and anything that needs a lookup by slug. */
export const getMenuItems = cache(async (): Promise<MenuItemView[]> => {
  const menu = await getMenu();
  return menu.flatMap((category) => category.items);
});

export const getMenuItem = cache(async (slug: string): Promise<MenuItemView | null> => {
  const row = await prisma.menuItem.findFirst({
    where: { slug, isActive: true },
    include: itemInclude,
  });
  return row ? toView(row) : null;
});

/**
 * The items behind a set of ids, read fresh. This is what checkout re-prices
 * against — never the copy the browser sent.
 */
export async function getPricedItemsBySlug(slugs: string[]): Promise<Map<string, MenuItemView>> {
  if (!slugs.length) return new Map();
  const rows = await prisma.menuItem.findMany({
    where: { slug: { in: slugs }, isActive: true },
    include: itemInclude,
  });
  return new Map(rows.map((row) => [row.slug, toView(row)]));
}
