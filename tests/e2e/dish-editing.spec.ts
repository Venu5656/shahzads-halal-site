import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

/**
 * Changing what a dish says, from the manager.
 *
 * The round trip is the test that matters, the same as it is for price: words
 * typed behind the counter have to come out on the page a customer reads. A
 * manager screen whose edits do not reach the menu is worse than no manager
 * screen, because he will believe it worked.
 *
 * The photo half is not exercised here. Uploading goes to blob storage, which
 * these tests have no business writing to on every run; what can be checked
 * without it — what the pipeline does to a file, and what it refuses — is in
 * tests/unit/photo.test.ts instead.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

const PASSWORD = "a good enough password";

const WHO = {
  desktop: { email: "dish-201@example.test", phone: "+12015550501", slug: "falafel-over-rice" },
  mobile: { email: "dish-973@example.test", phone: "+19735550501", slug: "onion-rings" },
} as const;

function who() {
  return WHO[test.info().project.name as keyof typeof WHO] ?? WHO.desktop;
}

async function snapshot(slug: string) {
  return prisma.menuItem.findUniqueOrThrow({
    where: { slug },
    select: { id: true, name: true, description: true },
  });
}

async function restore(slug: string, description: string) {
  await prisma.menuItem.update({ where: { slug }, data: { description } });
  await prisma.auditLog.deleteMany({ where: { action: "menu.description" } });
}

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

/** The row for one dish, matched on its exact name so "Falafel" is not "Falafel over Rice". */
function rowFor(page: Page, name: string) {
  return page.locator("li").filter({ has: page.getByText(name, { exact: true }) }).first();
}

test.afterAll(async () => {
  await wipeOwner();
  await prisma.$disconnect();
});

test("rewrites what a dish says, and the customer sees it", async ({ page }) => {
  const { slug } = who();
  const before = await snapshot(slug);
  const fresh = `Rewritten at ${Date.now()} — still the same dish underneath.`;

  try {
    await signIn(page);
    const row = rowFor(page, before.name);
    await row.getByRole("button", { name: "Words and photo" }).click();
    const box = row.getByLabel("What it says on the menu");
    await expect(box).toHaveValue(before.description);
    await box.fill(fresh);
    await row.getByRole("button", { name: "Save words" }).click();

    await expect(page.getByText(`${before.name} updated.`)).toBeVisible();
    expect((await snapshot(slug)).description).toBe(fresh);

    // The whole point: it reaches the page a customer reads.
    await page.goto(`/menu/${slug}`);
    await expect(page.locator("main")).toContainText(fresh);
  } finally {
    await restore(slug, before.description);
  }
});

test("refuses a description that is too short to be one", async ({ page }) => {
  const { slug } = who();
  const before = await snapshot(slug);

  try {
    await signIn(page);
    const row = rowFor(page, before.name);
    await row.getByRole("button", { name: "Words and photo" }).click();
    await row.getByLabel("What it says on the menu").fill("Nice");
    await row.getByRole("button", { name: "Save words" }).click();

    await expect(row.getByRole("alert")).toContainText(/at least/i);
    // And nothing was written.
    expect((await snapshot(slug)).description).toBe(before.description);
  } finally {
    await restore(slug, before.description);
  }
});

test("leaves a record of who changed the words", async ({ page }) => {
  const { slug } = who();
  const before = await snapshot(slug);
  const fresh = `Audited at ${Date.now()}, so somebody can be asked about it.`;

  try {
    await signIn(page);
    const row = rowFor(page, before.name);
    await row.getByRole("button", { name: "Words and photo" }).click();
    await row.getByLabel("What it says on the menu").fill(fresh);
    await row.getByRole("button", { name: "Save words" }).click();
    await expect(page.getByText(`${before.name} updated.`)).toBeVisible();

    const log = await prisma.auditLog.findFirst({
      where: { action: "menu.description", entityId: before.id },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    // The old wording is kept, which is the question somebody actually asks.
    expect(JSON.stringify(log?.oldValue)).toContain(before.description.slice(0, 20));
  } finally {
    await restore(slug, before.description);
  }
});

test("a customer cannot change a description", async ({ page, request }) => {
  const { slug } = who();
  const before = await snapshot(slug);

  // Signed out, the page itself is not reachable.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);

  // And posting at it anyway writes nothing. The status is not the point —
  // a form POST to a page route is just a page render, so this asserts the
  // only thing that matters, which is that the menu did not move.
  await request.post("/admin", {
    form: { itemId: before.id, description: "Signed out and typing anyway." },
    failOnStatusCode: false,
  });
  expect((await snapshot(slug)).description).toBe(before.description);
});
