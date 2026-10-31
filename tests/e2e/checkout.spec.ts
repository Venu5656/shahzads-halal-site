import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { countFor, toPath, waitForLink } from "./outbox";

/**
 * Checkout, up to the point where money changes hands.
 *
 * The prices asserted here are the owner's real ones, and the tax is computed
 * the way a register does it — so if the rate or a price changes by accident,
 * these fail.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

/**
 * Every test in this suite comes from 127.0.0.1, and the login limiter freezes
 * an IP after MAX_FAILURES_PER_IP failures in its window. The suite tests
 * wrong-password paths on purpose, so those failures pile up and eventually
 * lock out whichever file happens to run next — which reads as flakiness and
 * is really the limiter working correctly against a shared address.
 *
 * Clearing the ledger before each file keeps the limiter's own tests honest
 * (they create their own failures) without letting one file poison the next.
 */
test.beforeAll(async () => {
  await prisma.loginAttempt.deleteMany({});
});


const PASSWORD = "a good enough password";
const AREA = { desktop: "201", mobile: "973" } as const;

function accountFor(slot: number) {
  const area = AREA[test.info().project.name as keyof typeof AREA] ?? "908";
  const last = String(slot).padStart(2, "0");
  return {
    typed: `(${area}) 555-03${last}`,
    e164: `+1${area}55503${last}`,
    email: `checkout-${area}-${last}@example.test`,
  };
}

type Account = ReturnType<typeof accountFor>;

async function wipe(...accounts: Account[]) {
  const emails = accounts.map((a) => a.email);
  const phones = accounts.map((a) => a.e164);
  await prisma.loginAttempt.deleteMany({ where: { identifier: { in: [...emails, ...phones] } } });
  await prisma.user.deleteMany({
    where: { OR: [{ email: { in: emails } }, { phone: { in: phones } }] },
  });
}

async function registerAndLogIn(page: Page, name: string, account: Account) {
  const before = await countFor(account.email, "verify");
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Mobile number").fill(account.typed);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByLabel(/I'm 18 or older/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.goto(toPath(await waitForLink(account.email, "verify", before)));

  await page.goto("/login");
  await page.getByLabel("Email or mobile number").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
}

/** Waits for the signed-in cart to reach the database before moving on. */
async function cartSaved(email: string, lines: number) {
  await expect
    .poll(async () => prisma.cartItem.count({ where: { cart: { user: { email } } } }), {
      timeout: 10_000,
    })
    .toBe(lines);
}

/** Adds one item, taking whichever route this viewport uses. */
async function addItem(page: Page, name: string, choose: string[] = []) {
  await page.goto("/menu");
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button")
    .click();
  for (const option of choose) {
    // By control, not by text: the menu behind the dialog repeats these words,
    // and the accessible name carries the surcharge as well as the label.
    const at = new RegExp("^" + option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    await page
      .getByRole("checkbox", { name: at })
      .or(page.getByRole("radio", { name: at }))
      .first()
      .check();
  }
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();
  await page.getByRole("button", { name: "Close cart" }).click();
}

/** Ordering is only open part of the day, so most tests need it forced open. */
async function openTheKitchen() {
  await prisma.storeSettings.upsert({
    where: { id: "store" },
    update: { orderingPaused: false, pausedMessage: null },
    create: { id: "store" },
  });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("sends a guest to log in first — an order needs an account", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
});

test("says there is nothing to pay for when the cart is empty", async ({ page }) => {
  const account = accountFor(1);
  await wipe(account);
  await registerAndLogIn(page, "Empty Cart", account);

  await page.goto("/checkout");
  await expect(page.locator("main").getByRole("alert")).toContainText("Nothing to pay for");

  await wipe(account);
});

test("prices the order on the server, with tax", async ({ page }) => {
  const account = accountFor(2);
  await wipe(account);
  await openTheKitchen();
  await registerAndLogIn(page, "Tax Payer", account);

  // Lamb gyro 9.99 + fries and a soda 5.00 = 14.99, tax at 6.625% = 0.99
  await addItem(page, "Lamb", ["Add fries and a soda"]);
  await cartSaved(account.email, 1);
  await page.goto("/checkout");

  const summary = page.locator("section").filter({ hasText: "Your order" }).first();
  await expect(summary).toContainText("$14.99"); // subtotal
  await expect(summary).toContainText("Sales tax");
  await expect(summary).toContainText("$0.99"); // 6.625% of 14.99
  await expect(summary).toContainText("$15.98"); // total

  // The name, number and receipt address come from the account, not a form.
  await expect(page.getByText("Tax Payer")).toBeVisible();
  await expect(page.getByText(account.email)).toBeVisible();

  await wipe(account);
});

test("does not charge tax on the bottled water", async ({ page }) => {
  const account = accountFor(3);
  await wipe(account);
  await openTheKitchen();
  await registerAndLogIn(page, "Water Only", account);

  await addItem(page, "Water");
  await cartSaved(account.email, 1);
  await page.goto("/checkout");

  const summary = page.locator("section").filter({ hasText: "Your order" }).first();
  // $1.99 with no tax at all.
  await expect(summary).toContainText("$1.99");
  await expect(summary).toContainText("$0.00");
  await expect(summary).toContainText("bottled water is exempt");

  await wipe(account);
});

test("tells the customer what changed rather than charging them for it", async ({ page }) => {
  const account = accountFor(4);
  await wipe(account);
  await openTheKitchen();
  await registerAndLogIn(page, "Stale Cart", account);

  await addItem(page, "Onion Rings");
  await cartSaved(account.email, 1);

  // It sells out between filling the cart and reaching checkout.
  await prisma.menuItem.update({
    where: { slug: "onion-rings" },
    data: { outOfStockUntil: new Date(Date.now() + 60 * 60 * 1000) },
  });

  try {
    await page.goto("/checkout");
    await expect(page.locator("main").getByRole("alert")).toContainText("menu changed while you were deciding");
    await expect(page.locator("main").getByRole("alert")).toContainText("sold out");
    // And nothing offers to take money.
    await expect(page.getByRole("button", { name: /^Pay / })).toHaveCount(0);
  } finally {
    await prisma.menuItem.update({
      where: { slug: "onion-rings" },
      data: { outOfStockUntil: null },
    });
  }

  await wipe(account);
});

test("stops when the owner has paused ordering", async ({ page }) => {
  const account = accountFor(5);
  await wipe(account);
  await openTheKitchen();
  await registerAndLogIn(page, "Paused Out", account);
  await addItem(page, "Masala Fries");
  await cartSaved(account.email, 1);

  await prisma.storeSettings.update({
    where: { id: "store" },
    data: { orderingPaused: true, pausedMessage: "Kitchen is slammed — back in 20 minutes." },
  });

  try {
    await page.goto("/checkout");
    await expect(page.locator("main").getByRole("alert")).toContainText("paused online orders");
    await expect(page.locator("main").getByRole("alert")).toContainText("Kitchen is slammed");
  } finally {
    await openTheKitchen();
  }

  await wipe(account);
});

test("says payment is not switched on, rather than showing a dead card form", async ({ page }) => {
  const account = accountFor(6);
  await wipe(account);
  await openTheKitchen();
  await registerAndLogIn(page, "No Keys", account);
  await addItem(page, "Cheese Burger");
  await cartSaved(account.email, 1);

  await page.goto("/checkout");

  // Until the restaurant's Stripe keys exist, the step is honest about it —
  // while every price on the page is already real.
  const step = page.locator("section").filter({ hasText: "Payment isn't switched on yet" });
  await expect(step).toBeVisible();
  await expect(step).toContainText("$7.45"); // 6.99 + 46c tax
  await expect(page.getByRole("button", { name: /^Pay \$7\.45/ })).toBeDisabled();

  await wipe(account);
});

test("reaches checkout from the cart panel", async ({ page }) => {
  const account = accountFor(7);
  await wipe(account);
  await openTheKitchen();
  await registerAndLogIn(page, "Panel Route", account);

  await page.goto("/menu");
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Chicken", exact: true }) })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await page.getByRole("link", { name: "Checkout" }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Check");

  await wipe(account);
});
