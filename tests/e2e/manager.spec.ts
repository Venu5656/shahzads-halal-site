import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

/**
 * The menu manager: the only reason this site has a login.
 *
 * The test that matters is the round trip — Shahzad changes something here, and
 * a customer sees it on the menu. A manager screen whose edits do not reach the
 * public page is worse than no manager screen, because he will believe it
 * worked.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

const PASSWORD = "a good enough password";

// Each project gets its own owner so desktop and mobile do not fight, and its
// own dish so one project's sold-out does not show up in the other's menu.
const WHO = {
  desktop: { email: "mgr-201@example.test", phone: "+12015550301", slug: "falafel" },
  mobile: { email: "mgr-973@example.test", phone: "+19735550301", slug: "onion-rings" },
} as const;

function who() {
  return WHO[test.info().project.name as keyof typeof WHO] ?? WHO.desktop;
}

/** The dish's price and stock as they stood, so the test can put them back. */
async function snapshot(slug: string) {
  return prisma.menuItem.findUniqueOrThrow({
    where: { slug },
    select: { id: true, name: true, basePriceCents: true, isAvailable: true, outOfStockUntil: true },
  });
}

async function restore(slug: string, state: Awaited<ReturnType<typeof snapshot>>) {
  await prisma.priceChange.deleteMany({ where: { menuItemId: state.id } });
  await prisma.auditLog.deleteMany({ where: { entityId: state.id } });
  await prisma.menuItem.update({
    where: { slug },
    data: {
      basePriceCents: state.basePriceCents,
      isAvailable: state.isAvailable,
      outOfStockUntil: state.outOfStockUntil,
    },
  });
}

/**
 * Removes the test's owner. Their price changes go with them — the row keeps
 * the name but the id goes null, so nothing blocks the delete, which is the
 * point of the SetNull on that relation.
 */
async function wipeOwner() {
  const { email, phone } = who();
  await prisma.user.deleteMany({ where: { OR: [{ email }, { phone }] } });
}

async function signIn(page: Page) {
  const { email, phone } = who();
  await wipeOwner();
  await prisma.user.create({
    data: {
      name: "Shahzad",
      email,
      phone,
      passwordHash: await hashPassword(PASSWORD),
      emailVerifiedAt: new Date(),
      role: "OWNER",
    },
  });
  await page.goto("/login");
  await page.getByLabel("Email or mobile number").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** A price that is definitely not the one already set. */
function differentPrice(from: number | null): { typed: string; cents: number } {
  const cents = (from ?? 1000) + 125;
  return { typed: (cents / 100).toFixed(2), cents };
}

/**
 * The row for one dish on the manager page.
 *
 * Matched on the exact name, not a substring: the menu has a Falafel and a
 * Falafel over Rice, and a hasText filter on "Falafel" picks whichever comes
 * first — which is how an earlier version of this test cheerfully edited the
 * price of a different dish and then checked the one it meant.
 */
function row(page: Page, name: string) {
  return page.getByRole("listitem").filter({ has: page.getByText(name, { exact: true }) });
}

test.afterAll(async () => {
  await wipeOwner();
  await prisma.$disconnect();
});

test("changes a price here and the customer sees it on the menu", async ({ page }) => {
  const { slug } = who();
  const before = await snapshot(slug);
  await signIn(page);

  try {
    const next = differentPrice(before.basePriceCents);
    const line = row(page, before.name);
    await line.getByLabel("Price in dollars").fill(next.typed);
    await line.getByRole("button", { name: "Save" }).click();
    await expect(line.getByRole("status")).toContainText("updated");

    // The number in the database, in cents, with no float anywhere near it.
    const after = await prisma.menuItem.findUniqueOrThrow({ where: { slug } });
    expect(after.basePriceCents).toBe(next.cents);

    // And a customer sees it, which is the only thing that counts.
    await page.goto(`/menu/${slug}`);
    await expect(page.locator("main")).toContainText(`$${next.typed}`);
  } finally {
    await restore(slug, before);
  }
});

test("writes down every price change, with who changed it", async ({ page }) => {
  const { slug, email } = who();
  const before = await snapshot(slug);
  await signIn(page);

  try {
    const next = differentPrice(before.basePriceCents);
    const line = row(page, before.name);
    await line.getByLabel("Price in dollars").fill(next.typed);
    await line.getByRole("button", { name: "Save" }).click();
    await expect(line.getByRole("status")).toContainText("updated");

    const changes = await prisma.priceChange.findMany({
      where: { menuItemId: before.id },
      include: { changedBy: { select: { email: true } } },
    });
    expect(changes).toHaveLength(1);
    // Both sides of the move, so "when did this go up" has an answer.
    expect(changes[0]).toMatchObject({
      oldPriceCents: before.basePriceCents,
      newPriceCents: next.cents,
    });
    expect(changes[0]!.changedBy?.email).toBe(email);
    // And the name beside it, so the row still says who after the account goes.
    expect(changes[0]!.changedByName).toBe("Shahzad");
  } finally {
    await restore(slug, before);
  }
});

test("refuses a price that is obviously a typo, and keeps the old one", async ({ page }) => {
  const { slug } = who();
  const before = await snapshot(slug);
  await signIn(page);

  try {
    const line = row(page, before.name);
    for (const typo of ["1375", "abc", "0.10"]) {
      await line.getByLabel("Price in dollars").fill(typo);
      await line.getByRole("button", { name: "Save" }).click();
      await expect(line.getByRole("alert")).toBeVisible();
    }

    const after = await prisma.menuItem.findUniqueOrThrow({ where: { slug } });
    expect(after.basePriceCents).toBe(before.basePriceCents);
    expect(await prisma.priceChange.count({ where: { menuItemId: before.id } })).toBe(0);
  } finally {
    await restore(slug, before);
  }
});

test("marks a dish off for the night, and it comes back by itself", async ({ page }) => {
  const { slug } = who();
  const before = await snapshot(slug);
  await signIn(page);

  try {
    const line = row(page, before.name);
    await line.getByRole("button", { name: "Off tonight" }).click();
    await expect(line.getByRole("status")).toContainText("is off");

    // A timestamp, not a flag — so nobody has to remember to switch it back.
    const off = await prisma.menuItem.findUniqueOrThrow({ where: { slug } });
    expect(off.isAvailable).toBe(true);
    expect(off.outOfStockUntil!.getTime()).toBeGreaterThan(Date.now());

    // The customer is told, and is not sent off to order something the kitchen
    // has run out of.
    await page.goto(`/menu/${slug}`);
    await expect(page.locator("main")).toContainText("Sold out");
    await expect(page.getByRole("link", { name: /^Order now/ })).toHaveCount(0);

    // The manager page says when it is coming back, without being asked.
    await page.goto("/admin");
    await expect(page.locator("main")).toContainText("Off right now");
    await expect(page.locator("main")).toContainText(`${before.name} — back`);
  } finally {
    await restore(slug, before);
  }
});

test("switching a dish back on takes one tap", async ({ page }) => {
  const { slug } = who();
  const before = await snapshot(slug);
  await prisma.menuItem.update({
    where: { slug },
    data: { outOfStockUntil: new Date(Date.now() + 3_600_000) },
  });
  await signIn(page);

  try {
    const line = row(page, before.name);
    await line.getByRole("button", { name: "On", exact: true }).click();
    await expect(line.getByRole("status")).toContainText("back on");

    const on = await prisma.menuItem.findUniqueOrThrow({ where: { slug } });
    expect(on.isAvailable).toBe(true);
    expect(on.outOfStockUntil).toBeNull();
  } finally {
    await restore(slug, before);
  }
});

test("writes down a sold-out switch too, with both states", async ({ page }) => {
  const { slug } = who();
  const before = await snapshot(slug);
  await signIn(page);

  try {
    const line = row(page, before.name);
    await line.getByRole("button", { name: "Off until I say" }).click();
    await expect(line.getByRole("status")).toContainText("is off");

    const off = await prisma.menuItem.findUniqueOrThrow({ where: { slug } });
    expect(off.isAvailable).toBe(false);
    expect(off.outOfStockUntil).toBeNull();

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: before.id },
      orderBy: { createdAt: "desc" },
    });
    expect(log.action).toBe("menu.stock.indefinite");
    expect(log.newValue).toMatchObject({ isAvailable: false });
    // The IP here IS hashed — unlike a consent IP, the only question ever
    // asked of this one is whether it matches another.
    expect(log.ipHash).toMatch(/^[0-9a-f]{64}$/);
  } finally {
    await restore(slug, before);
  }
});

test("a customer cannot reach it, even signed in", async ({ page }) => {
  const email = `cust-${who().phone.slice(-4)}@example.test`;
  await prisma.user.deleteMany({ where: { email } });
  await prisma.user.create({
    data: {
      name: "Not Staff",
      email,
      phone: who().phone.replace(/\d{2}$/, "99"),
      passwordHash: await hashPassword(PASSWORD),
      emailVerifiedAt: new Date(),
      role: "CUSTOMER",
    },
  });

  try {
    await page.goto("/login");
    await page.getByLabel("Email or mobile number").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    // Wait for the login to finish before asking for the page again, or the
    // second request can race ahead of the session cookie and read as "not
    // signed in" — which looks exactly like the thing being tested.
    await page.waitForURL(/\/admin$/);
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(1);

    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
    await expect(page.getByLabel("Price in dollars")).toHaveCount(0);
  } finally {
    await prisma.user.deleteMany({ where: { email } });
  }
});
