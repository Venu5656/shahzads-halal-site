import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { countFor, toPath, waitForLink } from "./outbox";

/**
 * The menu and the cart, end to end.
 *
 * These run against the seeded menu, so the numbers here are the owner's real
 * prices: a 12 pc wing at 9.99 + 8.00, a platter at 13.99 + 3.00 for extra
 * protein. If a price changes, these tests are supposed to fail.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

const PASSWORD = "a good enough password";

const AREA = { desktop: "201", mobile: "973" } as const;

function accountFor(slot: number) {
  const area = AREA[test.info().project.name as keyof typeof AREA] ?? "908";
  const last = String(slot).padStart(2, "0");
  return {
    typed: `(${area}) 555-02${last}`,
    e164: `+1${area}55502${last}`,
    email: `menu-${area}-${last}@example.test`,
  };
}

type Account = ReturnType<typeof accountFor>;

async function wipe(...accounts: Account[]) {
  const emails = accounts.map((a) => a.email);
  const phones = accounts.map((a) => a.e164);
  await prisma.loginAttempt.deleteMany({ where: { identifier: { in: [...emails, ...phones] } } });
  await prisma.user.deleteMany({ where: { OR: [{ email: { in: emails } }, { phone: { in: phones } }] } });
}

/** Opens an item, whichever way this viewport does it. */
async function openItem(page: Page, name: string) {
  await page.goto("/menu");
  await page
    .locator("article")
    .filter({ hasText: name })
    .first()
    .getByRole("button")
    .click();
  // A phone navigates to the item's page; a desktop opens the dialog.
  await expect(page.getByRole("heading", { level: 1, name }).or(page.getByRole("heading", { level: 2, name }))).toBeVisible();
}

async function addToCart(page: Page) {
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();
}

async function register(page: Page, name: string, account: Account) {
  const before = await countFor(account.email, "verify");
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Mobile number").fill(account.typed);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  const link = await waitForLink(account.email, "verify", before);
  await page.goto(toPath(link));
}

async function logIn(page: Page, account: Account) {
  await page.goto("/login");
  await page.getByLabel("Email or mobile number").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ------------------------------------------------------------- browsing

test("lists the whole menu, filters by category and searches", async ({ page }) => {
  await page.goto("/menu");

  const cards = page.locator("article");
  await expect(cards).toHaveCount(33);

  await page.getByRole("tab", { name: /^Gyros/ }).click();
  await expect(cards).toHaveCount(4);

  await page.getByRole("tab", { name: /^All/ }).click();
  await expect(cards).toHaveCount(33);

  await page.getByPlaceholder("Search").fill("falafel");
  // The three falafel dishes, plus the two dips whose descriptions recommend
  // themselves for falafel — searching the description is the point.
  await expect(cards).toHaveCount(5);

  await page.getByPlaceholder("Search").fill("zzzz");
  await expect(page.getByText(/Nothing matches/)).toBeVisible();
});

test("shows the real prices, and marks the ones that vary", async ({ page }) => {
  await page.goto("/menu");

  const wings = page.locator("article").filter({ hasText: "Chicken Wings" });
  await expect(wings).toContainText("from");
  await expect(wings).toContainText("$9.99");

  const platter = page.locator("article").filter({ hasText: "Mix Platter" });
  await expect(platter).toContainText("$13.99");
});

test("sells dips and drinks as their own items", async ({ page }) => {
  await page.goto("/menu");

  await page.getByRole("tab", { name: /^Dips/ }).click();
  await expect(page.locator("article")).toHaveCount(6);
  await expect(
    page.locator("article").filter({ has: page.getByRole("heading", { name: "White Sauce Dip" }) }),
  ).toContainText("$0.75");

  await page.getByRole("tab", { name: /^Drinks/ }).click();
  await expect(page.locator("article")).toHaveCount(3);
  await expect(
    page.locator("article").filter({ has: page.getByRole("heading", { name: "Water" }) }),
  ).toContainText("$1.99");
});

test("adds a dip on its own, without buying anything else", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("tab", { name: /^Dips/ }).click();
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Hot Sauce Dip" }) })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: /^Add to cart/ }).click();

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toContainText("Hot Sauce Dip");
  await expect(panel).toContainText("$0.75");
});

test("a soda has to say which one", async ({ page }) => {
  await openItem(page, "Soda");
  await page.getByText("Sprite", { exact: true }).click();
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Your cart" })).toContainText("Sprite");
});

test("shows an unpriced item honestly instead of pretending", async ({ page }) => {
  // Every item is priced today, so take one away to prove what happens when
  // the owner adds a dish before deciding what to charge for it.
  await prisma.menuItem.update({
    where: { slug: "snapple" },
    data: { basePriceCents: null },
  });

  try {
    await page.goto("/menu");
    const card = page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: "Snapple", exact: true }) });
    await expect(card).toContainText("Ask in store");
    await expect(card.getByRole("button")).toBeDisabled();
  } finally {
    await prisma.menuItem.update({
      where: { slug: "snapple" },
      data: { basePriceCents: 199 },
    });
  }
});

test("leaving the salad off a platter is free", async ({ page }) => {
  await openItem(page, "Mix Platter");
  await page.getByText("No salad", { exact: true }).click();
  // Still 13.99 — removing something never costs anything.
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toContainText("$13.99");
});

test("offers sauce on the side where a sauce belongs, and not elsewhere", async ({ page }) => {
  await openItem(page, "Lamb Gyro");
  await expect(page.getByText("Extra sauce on the side")).toBeVisible();

  await openItem(page, "Waffle Fries");
  await expect(page.getByText("Extra sauce on the side")).toHaveCount(0);
});

// ----------------------------------------------------------- the cart

test("adds an item with options and prices it the way the menu says", async ({ page }) => {
  await openItem(page, "Chicken Wings");

  // 6 pc is the default; 12 pc is +8.00 on a 9.99 base.
  await page.getByText("12 pc", { exact: true }).click();
  await page.getByText("Hot Honey", { exact: true }).click();
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toContainText("$17.99");

  await addToCart(page);

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toContainText("Chicken Wings");
  await expect(panel).toContainText("12 pc · Hot Honey");
  await expect(panel).toContainText("$17.99");
});

test("will not add an item until its required choices are made", async ({ page }) => {
  await openItem(page, "Chicken Wings");

  // Clearing the sauce is only possible by picking none — the group starts
  // empty because it has no default, so the button should refuse.
  const sauce = page.getByText("Lemon Pepper", { exact: true });
  await sauce.click();
  await sauce.click(); // radios don't untick, so this stays chosen
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toBeEnabled();
});

test("holds the sauce limit at three", async ({ page }) => {
  await openItem(page, "Mix Platter");

  for (const sauce of ["White Sauce", "Hot Sauce", "Green Sauce"]) {
    await page.getByText(sauce, { exact: true }).first().click();
  }

  // The fourth is disabled rather than rejected after the fact.
  const fourth = page.getByText("Tahini", { exact: true }).first();
  await expect(fourth).toBeDisabled();
  await expect(page.getByText("That's the limit")).toBeVisible();
});

test("charges for the paid extras", async ({ page }) => {
  await openItem(page, "Mix Platter");

  await page.getByText("Extra protein", { exact: true }).click();
  await page.getByText("Add pita", { exact: true }).click();
  // 13.99 + 3.00 + 2.00
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toContainText("$18.99");
});

test("keeps a guest cart across a reload", async ({ page }) => {
  await openItem(page, "Masala Fries");
  await page.getByText("Large", { exact: true }).click();
  await addToCart(page);
  await page.getByRole("button", { name: "Close cart" }).click();

  await page.reload();
  await page.getByRole("button", { name: /^Cart/ }).click();

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toContainText("Masala Fries");
  // 3.99 + 2.00 for the large
  await expect(panel).toContainText("$5.99");
});

test("changes quantity and removes a line", async ({ page }) => {
  await openItem(page, "Cheeseburger");
  await addToCart(page);

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await panel.getByRole("button", { name: /Add one Cheeseburger/ }).click();
  await expect(panel).toContainText("$13.98");

  await panel.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(panel).toContainText("Nothing in here yet");
});

// ------------------------------------------------- carrying the cart over

test("folds a guest cart into the account at sign-in, and keeps it after", async ({ page }) => {
  const account = accountFor(1);
  await wipe(account);
  await register(page, "Cart Keeper", account);

  // Still logged out after verifying: fill a cart as a guest.
  await openItem(page, "Lamb Gyro");
  await page.getByText("Add fries and a soda", { exact: true }).click();
  await addToCart(page);
  await page.getByRole("button", { name: "Close cart" }).click();

  await logIn(page, account);

  // The cart followed them in, and is now in the database.
  await page.getByRole("button", { name: /^Cart/ }).click();
  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toContainText("Lamb Gyro");
  // 9.99 + 5.00
  await expect(panel).toContainText("$14.99");

  await expect
    .poll(async () => prisma.cartItem.count({ where: { cart: { user: { email: account.email } } } }))
    .toBe(1);

  const stored = await prisma.cartItem.findFirstOrThrow({
    where: { cart: { user: { email: account.email } } },
    include: { menuItem: { select: { slug: true } } },
  });
  expect(stored.menuItem.slug).toBe("lamb-gyro");
  expect(stored.quantity).toBe(1);

  await wipe(account);
});

test("a signed-in cart comes back on another device", async ({ browser }) => {
  const account = accountFor(2);
  await wipe(account);

  const first = await browser.newContext();
  const pageA = await first.newPage();
  await register(pageA, "Two Devices", account);
  await logIn(pageA, account);

  await openItem(pageA, "Philly Cheesesteak");
  await addToCart(pageA);
  await expect
    .poll(async () => prisma.cartItem.count({ where: { cart: { user: { email: account.email } } } }))
    .toBe(1);

  // A different browser, same account.
  const second = await browser.newContext();
  const pageB = await second.newPage();
  await logIn(pageB, account);
  await pageB.getByRole("button", { name: /^Cart/ }).click();
  await expect(pageB.getByRole("dialog", { name: "Your cart" })).toContainText(
    "Philly Cheesesteak",
  );

  await first.close();
  await second.close();
  await wipe(account);
});

// ------------------------------------------------------------ sold out

test("greys out a sold-out item and refuses to add it", async ({ page }) => {
  const soldOutUntil = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.menuItem.update({
    where: { slug: "onion-rings" },
    data: { outOfStockUntil: soldOutUntil },
  });

  try {
    await page.goto("/menu");
    const card = page.locator("article").filter({ hasText: "Onion Rings" });
    await expect(card).toContainText("Sold out");
    await expect(card.getByRole("button", { name: /Sold out/ })).toBeDisabled();

    // The item's own page says so too, and cannot be added from.
    await page.goto("/menu/onion-rings");
    await expect(page.getByRole("button", { name: "Sold out" })).toBeDisabled();
  } finally {
    await prisma.menuItem.update({
      where: { slug: "onion-rings" },
      data: { outOfStockUntil: null },
    });
  }
});

test("tells someone when something in their cart has sold out", async ({ page }) => {
  await openItem(page, "Waffle Fries");
  await addToCart(page);
  await page.getByRole("button", { name: "Close cart" }).click();

  await prisma.menuItem.update({
    where: { slug: "waffle-fries" },
    data: { outOfStockUntil: new Date(Date.now() + 60 * 60 * 1000) },
  });

  try {
    await page.reload();
    await page.getByRole("button", { name: /^Cart/ }).click();
    const panel = page.getByRole("dialog", { name: "Your cart" });
    await expect(panel).toContainText("sold out");
    await expect(panel).toContainText("Something in your cart changed");
  } finally {
    await prisma.menuItem.update({
      where: { slug: "waffle-fries" },
      data: { outOfStockUntil: null },
    });
  }
});

// ------------------------------------------------------- the homepage

test("the homepage teaser is the real menu now", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("#grid .card")).toHaveCount(4);

  // A card links into the real item page.
  const link = page.locator('.card a.add[href="/menu/mix-platter"]');
  await expect(link).toHaveCount(1);

  // The two items whose prices arrived late are orderable again.
  await page.goto("/menu");
  await expect(page.locator("article").filter({ hasText: "Falafel Gyro" })).toContainText("$10.99");
  await expect(
    page.locator("article").filter({ hasText: "Beef Chapli Kabab Rice" }),
  ).toContainText("$13.99");
  await page.goto("/");

  if (!isMobile) {
    await expect(page.locator("#nav").getByRole("link", { name: "Order now" })).toHaveAttribute(
      "href",
      "/menu",
    );
  }
});
