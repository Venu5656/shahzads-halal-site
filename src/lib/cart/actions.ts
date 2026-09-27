"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { getPricedItemsBySlug } from "@/lib/menu/queries";
import { priceLine } from "@/lib/menu/pricing";
import { cartPayloadSchema, lineSignature, type CartLine } from "./types";

/**
 * The signed-in cart.
 *
 * The browser keeps a copy so the panel is instant, but the database is the
 * record: it is what survives a new phone, and what checkout reads. Every
 * write here re-derives the user from the session and re-validates the whole
 * cart against the live menu, because a server action is a public endpoint —
 * the browser could send anything.
 *
 * Lines that no longer price (sold out, unpriced, an option withdrawn) are
 * dropped rather than stored, and the caller is told how many went, so the
 * customer finds out before checkout rather than during it.
 */

export type SaveCartResult = {
  saved: boolean;
  lines: CartLine[];
  /** Human-readable reasons anything was dropped. */
  dropped: string[];
};

/** Replaces the stored cart with `lines`, keeping only what still prices. */
export async function saveCart(input: unknown): Promise<SaveCartResult> {
  const user = await getCurrentUser();
  const parsed = cartPayloadSchema.safeParse(input);
  if (!parsed.success) return { saved: false, lines: [], dropped: [] };
  if (!user) return { saved: false, lines: [], dropped: [] };

  const menu = await getPricedItemsBySlug(parsed.data.lines.map((line) => line.itemSlug));
  const keep: CartLine[] = [];
  const dropped: string[] = [];

  for (const line of parsed.data.lines) {
    const item = menu.get(line.itemSlug);
    if (!item) {
      dropped.push("An item is no longer on the menu.");
      continue;
    }
    const priced = priceLine(item, line.optionIds, line.quantity, line.note);
    if (!priced.ok) {
      dropped.push(priced.problems[0]!.message);
      continue;
    }
    keep.push({ ...line, id: lineSignature(line) });
  }

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    select: { id: true },
  });

  // Replace wholesale: the browser sent the complete cart, and a diff would
  // only be a slower way to reach the same rows.
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    prisma.cartItem.createMany({
      data: keep.map((line) => ({
        cartId: cart.id,
        menuItemId: menu.get(line.itemSlug)!.id,
        quantity: line.quantity,
        selectedOptionIds: line.optionIds,
        note: line.note,
      })),
    }),
  ]);

  return { saved: true, lines: keep, dropped: [...new Set(dropped)] };
}

/**
 * Folds a guest cart into the stored one at sign-in, instead of throwing away
 * whatever they picked before logging in. Quantities add up when the same
 * configuration is in both.
 */
export async function mergeGuestCart(input: unknown): Promise<SaveCartResult> {
  const user = await getCurrentUser();
  if (!user) return { saved: false, lines: [], dropped: [] };

  const parsed = cartPayloadSchema.safeParse(input);
  if (!parsed.success) return { saved: false, lines: [], dropped: [] };

  const existing = await loadCart();
  const bySignature = new Map<string, CartLine>();
  for (const line of existing) bySignature.set(line.id, { ...line });

  for (const guest of parsed.data.lines) {
    const id = lineSignature(guest);
    const already = bySignature.get(id);
    if (already) {
      already.quantity = Math.min(already.quantity + guest.quantity, 20);
    } else {
      bySignature.set(id, { ...guest, id });
    }
  }

  return saveCart({ lines: [...bySignature.values()] });
}

/** The stored cart, as lines. Empty for a guest. */
export async function loadCart(): Promise<CartLine[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    select: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          quantity: true,
          selectedOptionIds: true,
          note: true,
          menuItem: { select: { slug: true, isActive: true } },
        },
      },
    },
  });
  if (!cart) return [];

  return cart.items
    .filter((row) => row.menuItem.isActive)
    .map((row) => {
      const line = {
        itemSlug: row.menuItem.slug,
        optionIds: row.selectedOptionIds,
        quantity: row.quantity,
        note: row.note,
      };
      return { ...line, id: lineSignature(line) };
    });
}

export async function clearCart(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
}
