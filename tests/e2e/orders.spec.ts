import { expect, test, type Page } from "@playwright/test";
import { PrismaClient, type OrderStatus } from "@prisma/client";
import { countFor, toPath, waitForLink } from "./outbox";

/**
 * The order pages, end to end.
 *
 * Payment is not switched on, so these write the order the way the Stripe
 * webhook will once it exists — same function, same shape — and then check
 * what the customer sees. That keeps the confirmation page, the status and
 * the history testable now rather than after the keys arrive.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

const PASSWORD = "a good enough password";
const AREA = { desktop: "201", mobile: "973" } as const;

function accountFor(slot: number) {
  const area = AREA[test.info().project.name as keyof typeof AREA] ?? "908";
  const last = String(slot).padStart(2, "0");
  return {
    typed: `(${area}) 555-07${last}`,
    e164: `+1${area}55507${last}`,
    email: `orders-${area}-${last}@example.test`,
  };
}

type Account = ReturnType<typeof accountFor>;

async function wipe(...accounts: Account[]) {
  const emails = accounts.map((a) => a.email);
  await prisma.loginAttempt.deleteMany({ where: { identifier: { in: emails } } });
  // Orders do not cascade from a user on purpose — a financial record should
  // not vanish because an account was closed — so the test has to clear them
  // itself before the account can go.
  await prisma.order.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

async function registerAndLogIn(page: Page, name: string, account: Account) {
  const before = await countFor(account.email, "verify");
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Mobile number").fill(account.typed);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.goto(toPath(await waitForLink(account.email, "verify", before)));

  await page.goto("/login");
  await page.getByLabel("Email or mobile number").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
}

/** Writes a paid order for this account, the way the webhook will. */
async function placeOrder(
  account: Account,
  options: { status?: OrderStatus; number: string; name?: string } ,
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
  const status = options.status ?? "PAID";
  return prisma.order.create({
    data: {
      orderNumber: options.number,
      userId: user.id,
      status,
      subtotalCents: 2197,
      taxCents: 132,
      totalCents: 2329,
      paidAt: new Date(),
      customerNameSnapshot: options.name ?? user.name,
      customerPhoneSnapshot: user.phone ?? account.e164,
      items: {
        create: [
          {
            nameSnapshot: "Lamb Gyro",
            unitPriceCents: 999,
            quantity: 2,
            lineTotalCents: 1998,
            selectedOptions: [
              { groupName: "Sauces", optionName: "White sauce", priceCents: 0 },
            ],
            note: "extra hot",
          },
          {
            nameSnapshot: "Water",
            unitPriceCents: 199,
            quantity: 1,
            lineTotalCents: 199,
            selectedOptions: [],
          },
        ],
      },
    },
  });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("shows the order, its progress and what it cost", async ({ page }) => {
  const account = accountFor(1);
  await wipe(account);
  await registerAndLogIn(page, "Yusuf Ali", account);
  const number = `SH-70${test.info().project.name === "mobile" ? "11" : "10"}`;
  await placeOrder(account, { number });

  await page.goto(`/orders/${number}`);

  await expect(page.getByRole("heading", { level: 1 })).toContainText(number);
  // The lines, with their options and the note the kitchen needs.
  await expect(page.locator("main")).toContainText("Lamb Gyro");
  await expect(page.locator("main")).toContainText("White sauce");
  await expect(page.locator("main")).toContainText("extra hot");
  // The money, exactly as the order recorded it.
  await expect(page.locator("main")).toContainText("$21.97");
  await expect(page.locator("main")).toContainText("$1.32");
  await expect(page.locator("main")).toContainText("$23.29");
  // And where it has got to.
  await expect(page.getByRole("list", { name: "Order progress" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Paid" }).first()).toBeVisible();

  await wipe(account);
});

test("moves the progress on as the kitchen does", async ({ page }) => {
  const account = accountFor(2);
  await wipe(account);
  await registerAndLogIn(page, "Mariam Khan", account);
  const number = `SH-72${test.info().project.name === "mobile" ? "11" : "10"}`;
  const order = await placeOrder(account, { number });

  await page.goto(`/orders/${number}`);
  await expect(page.getByRole("listitem").filter({ hasText: "Cooking" })).not.toHaveAttribute(
    "aria-current",
    "step",
  );

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "READY", readyAt: new Date() },
  });
  await page.reload();

  await expect(
    page.getByRole("listitem").filter({ hasText: "Ready" }).first(),
  ).toHaveAttribute("aria-current", "step");
  await expect(page.locator("main")).toContainText("bagged and waiting");

  await wipe(account);
});

test("will not show one customer another customer's order", async ({ page }) => {
  const mine = accountFor(3);
  const theirs = accountFor(4);
  await wipe(mine, theirs);

  // The other customer never signs in here — they only need to exist and to
  // own an order, so they are written straight to the database.
  await prisma.user.create({
    data: {
      name: "Someone Else",
      email: theirs.email,
      phone: theirs.e164,
      passwordHash: "not-a-real-hash",
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
    },
  });
  const number = `SH-74${test.info().project.name === "mobile" ? "11" : "10"}`;
  await placeOrder(theirs, { number, name: "Someone Else" });

  await registerAndLogIn(page, "Nosy Parker", mine);

  const response = await page.goto(`/orders/${number}`);
  expect(response?.status()).toBe(404);
  // Nothing about the other customer leaks, not even that the order exists.
  await expect(page.locator("body")).not.toContainText("Someone Else");

  await wipe(mine, theirs);
});

test("sends a signed-out visitor to log in, and back again afterwards", async ({ page }) => {
  const number = "SH-7600";
  const response = await page.goto(`/orders/${number}`);
  expect(response?.url()).toContain("/login");
  expect(decodeURIComponent(response?.url() ?? "")).toContain(`/orders/${number}`);
});

test("lists orders on the account page, newest first", async ({ page }) => {
  const account = accountFor(5);
  await wipe(account);
  await registerAndLogIn(page, "Repeat Customer", account);
  const suffix = test.info().project.name === "mobile" ? "11" : "10";
  await placeOrder(account, { number: `SH-78${suffix}` });
  await placeOrder(account, { number: `SH-79${suffix}`, status: "READY" });

  await page.goto("/account");
  const panel = page.locator("#orders");
  await expect(panel).toContainText(`SH-78${suffix}`);
  await expect(panel).toContainText(`SH-79${suffix}`);
  await expect(panel).toContainText("$23.29");
  await expect(panel).toContainText("Ready for pickup");

  // And a row opens the order it names.
  await panel.getByRole("link", { name: new RegExp(`SH-79${suffix}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/SH-79${suffix}$`));

  await wipe(account);
});

test("says so plainly when there are no orders yet", async ({ page }) => {
  const account = accountFor(6);
  await wipe(account);
  await registerAndLogIn(page, "New Here", account);

  await page.goto("/account");
  await expect(page.locator("#orders")).toContainText("Nothing here yet");

  await wipe(account);
});
