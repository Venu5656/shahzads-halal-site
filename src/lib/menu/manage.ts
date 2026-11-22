import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth/request";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";
import { parseDollarsToCents } from "@/lib/money";
import { stockStateFor, type StockMode } from "./stock";

/**
 * The manager's two jobs: change a price, and mark something sold out.
 *
 * That is the entire reason this site has a login. Ordering, payment, tracking
 * and support all belong to the delivery platform; what nobody else can do is
 * tell this site's menu that the lamb platter is sixteen dollars now, or that
 * there is no lamb tonight.
 *
 * Every price change writes a PriceChange row in the same transaction as the
 * price itself, so the history cannot drift from the number. The history is the
 * answer to the question Shahzad will actually ask — "when did this go up, and
 * did I change it here or just on the ordering page" — and a column that only
 * holds the current value cannot answer it.
 *
 * Both functions re-check the role for themselves. A server action is a public
 * POST endpoint, and the page having checked is not the action having checked.
 */

export type ManagedItem = {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  basePriceCents: number | null;
  isAvailable: boolean;
  outOfStockUntil: Date | null;
  lastPriceChangeAt: Date | null;
};

/** Every item on the menu, in menu order, with its latest price change. */
export async function listForManager(): Promise<ManagedItem[]> {
  const rows = await prisma.menuItem.findMany({
    where: { isActive: true, category: { isActive: true } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      basePriceCents: true,
      isAvailable: true,
      outOfStockUntil: true,
      category: { select: { name: true } },
      priceChanges: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryName: row.category.name,
    basePriceCents: row.basePriceCents,
    isAvailable: row.isAvailable,
    outOfStockUntil: row.outOfStockUntil,
    lastPriceChangeAt: row.priceChanges[0]?.createdAt ?? null,
  }));
}

export type ManageResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Sets a price, in dollars as typed.
 *
 * An empty box means "no price", which is a real state — a dish can be on the
 * board with the price still to be decided, and the menu says "ask in store"
 * rather than inventing a number. It is not the way to take something off for
 * the night: that is what the sold-out switch is for, and an unpriced item
 * stays unpriced until somebody types a number.
 */
export async function setPrice(itemId: string, dollars: string): Promise<ManageResult> {
  const user = await requireRole(STAFF_ROLES);

  const trimmed = dollars.trim();
  let newPriceCents: number | null = null;
  if (trimmed) {
    try {
      newPriceCents = parseDollarsToCents(trimmed);
    } catch {
      return { ok: false, error: "Type a price like 14.50 — or leave it empty for no price." };
    }
    // A hundred-dollar gyro is a typo, and a typo on a live menu is a refund
    // argument at the counter. The ceiling is generous and the floor is not
    // zero, because free is better said with a price of nothing at all.
    if (newPriceCents < 50 || newPriceCents > 20_000) {
      return { ok: false, error: "That price looks wrong. Between $0.50 and $200." };
    }
  }

  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, name: true, basePriceCents: true },
  });
  if (!item) return { ok: false, error: "That item is no longer on the menu." };
  if (item.basePriceCents === newPriceCents) {
    return { ok: true, message: `${item.name} is already that price.` };
  }

  await prisma.$transaction([
    prisma.menuItem.update({ where: { id: item.id }, data: { basePriceCents: newPriceCents } }),
    prisma.priceChange.create({
      data: {
        menuItemId: item.id,
        oldPriceCents: item.basePriceCents,
        newPriceCents,
        changedById: user.id,
        // Snapshotted, so the history still says who after the account goes.
        changedByName: user.name,
      },
    }),
  ]);

  revalidateMenu();
  return {
    ok: true,
    message: newPriceCents === null ? `${item.name} has no price now.` : `${item.name} updated.`,
  };
}

/** Marks something off, or back on. */
export async function setStock(itemId: string, mode: StockMode): Promise<ManageResult> {
  const user = await requireRole(STAFF_ROLES);
  const meta = await requestMeta();

  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, name: true, isAvailable: true, outOfStockUntil: true },
  });
  if (!item) return { ok: false, error: "That item is no longer on the menu." };

  const next = stockStateFor(mode);

  await prisma.$transaction([
    prisma.menuItem.update({ where: { id: item.id }, data: next }),
    // No dedicated model for this one, so it goes in the general audit log.
    // It matters for the same reason a price change does: "we never marked
    // that sold out" is a claim somebody will make.
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: `menu.stock.${mode}`,
        entityType: "MenuItem",
        entityId: item.id,
        oldValue: {
          isAvailable: item.isAvailable,
          outOfStockUntil: item.outOfStockUntil?.toISOString() ?? null,
        },
        newValue: {
          isAvailable: next.isAvailable,
          outOfStockUntil: next.outOfStockUntil?.toISOString() ?? null,
        },
        ipHash: meta.ipHash,
      },
    }),
  ]);

  revalidateMenu();
  return {
    ok: true,
    message: mode === "in-stock" ? `${item.name} is back on.` : `${item.name} is off.`,
  };
}

/**
 * Both menu routes are force-dynamic, so there is no page cache to clear — but
 * saying so here rather than relying on it means a future decision to cache
 * the menu does not quietly leave a sold-out dish on sale.
 */
function revalidateMenu() {
  revalidatePath("/menu");
  revalidatePath("/menu/[slug]", "page");
  revalidatePath("/");
}
