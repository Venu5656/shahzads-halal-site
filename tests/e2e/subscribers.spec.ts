import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

/**
 * The list, as the owner sees it.
 *
 * Three things are worth holding down here, and none of them is "the page
 * renders". It is that somebody who is not staff cannot read a single address;
 * that the consent record a complaint would turn on is actually reachable; and
 * that the export is a real file, because "he keeps the customers" is the
 * trade this whole site is built on and it means nothing if the list cannot
 * leave with him.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

const PASSWORD = "a good enough password";

const WHO = {
  desktop: { email: "roster-201@example.test", phone: "+12015550401", slot: "201" },
  mobile: { email: "roster-973@example.test", phone: "+19735550401", slot: "973" },
} as const;

function who() {
  return WHO[test.info().project.name as keyof typeof WHO] ?? WHO.desktop;
}

const member = (n: number) => `roster-member-${who().slot}-${n}@example.test`;

async function wipe() {
  const { email, phone } = who();
  await prisma.subscriber.deleteMany({ where: { email: { startsWith: `roster-member-${who().slot}-` } } });
  await prisma.user.deleteMany({ where: { OR: [{ email }, { phone }] } });
}

async function signIn(page: Page) {
  const { email, phone } = who();
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
  await page.waitForURL(/\/admin$/);
}

/** One confirmed member with a consent trail, and one who never confirmed. */
async function seed() {
  const confirmed = await prisma.subscriber.create({
    data: {
      email: member(1),
      phone: `+1${who().slot}5550411`,
      emailConfirmedAt: new Date(),
    },
  });
  await prisma.consentEvent.create({
    data: {
      subscriberId: confirmed.id,
      channel: "EMAIL",
      action: "GRANTED",
      target: member(1),
      ip: "203.0.113.7",
      userAgent: "a browser",
      disclosureVersion: "2026-11-email-v1",
      source: "join-form",
    },
  });
  await prisma.subscriber.create({ data: { email: member(2) } });
  return confirmed;
}

test.beforeEach(async () => {
  await wipe();
});

test.afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

test("shows who is on the list, and what state each of them is in", async ({ page }) => {
  await seed();
  await signIn(page);

  await page.goto("/admin/subscribers");
  const row = page.locator("li", { hasText: member(1) });
  await expect(row).toContainText("email active");
  // No number confirmed, so nothing may be texted to them.
  await expect(row).toContainText("no sms");

  // Somebody who asked and never proved the address is on the list and is not
  // sendable — the difference the page exists to show.
  await expect(page.locator("li", { hasText: member(2) })).toContainText("email pending");
});

test("finds one person by address or by the digits of their number", async ({ page }) => {
  await seed();
  await signIn(page);

  await page.goto(`/admin/subscribers?q=${encodeURIComponent(member(1))}`);
  await expect(page.locator("li", { hasText: member(1) })).toHaveCount(1);
  await expect(page.locator("li", { hasText: member(2) })).toHaveCount(0);

  // Typed the way somebody reads it off a phone, punctuation and all.
  await page.goto(`/admin/subscribers?q=${encodeURIComponent(`(${who().slot}) 555-0411`)}`);
  await expect(page.locator("li", { hasText: member(1) })).toHaveCount(1);
});

test("keeps the consent record, which is the thing a complaint turns on", async ({ page }) => {
  const confirmed = await seed();
  await signIn(page);

  await page.goto(`/admin/subscribers/${confirmed.id}`);
  await expect(page.locator("main")).toContainText("asked for offers");
  // The wording they agreed to and where from, not just that they did.
  await expect(page.locator("main")).toContainText("2026-11-email-v1");
  await expect(page.locator("main")).toContainText("203.0.113.7");
});

test("hands the whole list over as a file", async ({ page }) => {
  await seed();
  await signIn(page);

  const res = await page.request.get("/api/admin/subscribers.csv");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(res.headers()["content-disposition"]).toContain("attachment");
  // An address list has no business in anybody's cache.
  expect(res.headers()["cache-control"]).toContain("no-store");

  const body = await res.text();
  expect(body.split("\r\n")[0]).toContain("email");
  expect(body).toContain(member(1));
  expect(body).toContain(member(2));
});

test("a customer cannot see the list or download it", async ({ page, request }) => {
  await seed();

  // Signed out: the page redirects to the login and the file is not there.
  await page.goto("/admin/subscribers");
  await expect(page).toHaveURL(/\/login/);

  const res = await request.get("/api/admin/subscribers.csv");
  // 404 rather than 401 — no reason to tell a stranger the address exists.
  expect(res.status()).toBe(404);
  expect(await res.text()).not.toContain(member(1));
});
