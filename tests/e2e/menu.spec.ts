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

/**
 * Opens an item, whichever way this viewport does it.
 *
 * Matched on the exact heading, not on text: the board has a "Lamb" gyro and a
 * "Lamb over Rice" platter, and a "Cheese Burger" beside a "Double Cheese
 * Burger".
 */
async function openItem(page: Page, name: string) {
  await page.goto("/menu");
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .first()
    .getByRole("button")
    .click();
  // A phone navigates to the item's page; a desktop opens the dialog. Either
  // way the form is ready when its Add to cart button is.
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toBeVisible();
}

/**
 * Ticks an option by its control rather than its text: the menu behind the
 * dialog has cards carrying the same words (an "Extra Sauces" card called
 * "White", for instance), and text matching would find those instead.
 *
 * The control's accessible name carries the surcharge too — "12 Pc +$8.00" —
 * so match on the start of the name.
 */
async function pick(page: Page, name: string) {
  const at = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // .or() waits for whichever control the group renders; counting first would
  // be a snapshot taken before the dialog has drawn.
  await page
    .getByRole("checkbox", { name: at })
    .or(page.getByRole("radio", { name: at }))
    .first()
    .check();
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
  // Every dish on the printed menu.
  await expect(cards).toHaveCount(53);

  await page.getByRole("tab", { name: /^Gyros/ }).click();
  await expect(cards).toHaveCount(9);

  await page.getByRole("tab", { name: /^Sandwiches/ }).click();
  await expect(cards).toHaveCount(8);

  await page.getByRole("tab", { name: /^All/ }).click();
  await expect(cards).toHaveCount(53);

  await page.getByPlaceholder("Search").fill("chapli");
  // Chicken, Beef and Mix chapli — as platters and as gyros.
  await expect(cards).toHaveCount(6);

  await page.getByPlaceholder("Search").fill("zzzz");
  await expect(page.getByText(/Nothing matches/)).toBeVisible();
});

test("shows the real prices, and marks the ones that vary", async ({ page }) => {
  await page.goto("/menu");

  const wings = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Wings", exact: true }) });
  await expect(wings).toContainText("from");
  await expect(wings).toContainText("$9.99");

  const platter = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Lamb & Chicken Mix" }) });
  await expect(platter).toContainText("$13.99");
});

test("sells dips and drinks as their own items", async ({ page }) => {
  await page.goto("/menu");

  await page.getByRole("tab", { name: /^Extra Sauces/ }).click();
  await expect(page.locator("article")).toHaveCount(6);
  await expect(
    page.locator("article").filter({ has: page.getByRole("heading", { name: "White", exact: true }) }),
  ).toContainText("$0.75");

  await page.getByRole("tab", { name: /^Beverages/ }).click();
  await expect(page.locator("article")).toHaveCount(3);
  await expect(
    page.locator("article").filter({ has: page.getByRole("heading", { name: "Water" }) }),
  ).toContainText("$1.99");
});

test("adds a dip on its own, without buying anything else", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("tab", { name: /^Extra Sauces/ }).click();
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Hot", exact: true }) })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: /^Add to cart/ }).click();

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toContainText("Hot");
  await expect(panel).toContainText("$0.75");
});

test("a soda has to say which one", async ({ page }) => {
  await openItem(page, "Soda");
  await pick(page, "Sprite");
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
  await openItem(page, "Lamb & Chicken Mix");
  await pick(page, "No salad");
  // Still 13.99 — removing something never costs anything.
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toContainText("$13.99");
});

test("offers sauce on the side where a sauce belongs, and not elsewhere", async ({ page }) => {
  await openItem(page, "Lamb");
  await expect(page.getByText("Extra sauce on the side")).toBeVisible();

  await openItem(page, "Waffle Fries");
  await expect(page.getByText("Extra sauce on the side")).toHaveCount(0);
});

test("shows sides and drinks as add-ons under the mains, not as full cards", async ({ page }) => {
  await page.goto("/menu");

  const mainCard = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Lamb & Chicken Mix", exact: true }) });
  const addOnRow = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Waffle Fries", exact: true }) });

  // A main gets a full photo box; an add-on gets a thumbnail. Measured rather
  // than asserted on class names, because the sizes are the point.
  const mainPhoto = await mainCard.locator("img").boundingBox();
  const addOnPhoto = await addOnRow.locator("img").boundingBox();
  expect(mainPhoto!.height).toBeGreaterThan(150);
  expect(addOnPhoto!.height).toBeLessThan(100);

  // And the add-ons sit below everything you actually came in for.
  await expect(page.getByRole("heading", { name: "Add to your order" })).toBeVisible();
  const mainBox = await mainCard.boundingBox();
  const addOnBox = await addOnRow.boundingBox();
  expect(addOnBox!.y).toBeGreaterThan(mainBox!.y);

  // A row is a good deal shorter than a card — that is the whole point.
  expect(addOnBox!.height).toBeLessThan(mainBox!.height / 2);

  // Filtering to a single add-on section drops the heading, since there is
  // nothing left for the add-ons to sit under.
  await page.getByRole("tab", { name: /^Sides/ }).click();
  await expect(page.getByRole("heading", { name: "Add to your order" })).toHaveCount(0);
  await expect(
    page.locator("article").filter({ has: page.getByRole("heading", { name: "Fries", exact: true }) }),
  ).toBeVisible();
});

test("adds a side straight from its row", async ({ page }) => {
  await page.goto("/menu");
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Onion Rings", exact: true }) })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: /^Add to cart/ }).click();

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Onion Rings");
  await expect(panel).toContainText("$4.99");
});

// ----------------------------------------------------------- the cart

test("adds an item with options and prices it the way the menu says", async ({ page }) => {
  await openItem(page, "Wings");

  // 6 Pc is the default; 12 Pc is +8.00 on a 9.99 base.
  await pick(page, "12 Pc");
  await pick(page, "Hot Honey");
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toContainText("$17.99");

  await addToCart(page);

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toContainText("Wings");
  await expect(panel).toContainText("12 Pc · Hot Honey");
  await expect(panel).toContainText("$17.99");
});

test("will not add an item until its required choices are made", async ({ page }) => {
  await openItem(page, "Wings");

  // Clearing the sauce is only possible by picking none — the group starts
  // empty because it has no default, so the button should refuse.
  await pick(page, "Lemon Pepper");
  await pick(page, "Lemon Pepper"); // radios don't untick, so it stays chosen
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toBeEnabled();
});

test("holds the sauce limit at three", async ({ page }) => {
  await openItem(page, "Lamb & Chicken Mix");

  // The board names the sauces White, Hot, Green, Tahini, BBQ and Buffalo.
  for (const sauce of ["White", "Hot", "Green"]) await pick(page, sauce);

  // The fourth is disabled rather than rejected after the fact.
  await expect(page.getByRole("checkbox", { name: /^Tahini/ }).first()).toBeDisabled();
  await expect(page.getByText("That's the limit")).toBeVisible();
});

test("charges for the paid extras", async ({ page }) => {
  await openItem(page, "Lamb & Chicken Mix");

  await pick(page, "Extra protein");
  await pick(page, "Add pita");
  // 13.99 + 3.00 + 2.00
  await expect(page.getByRole("button", { name: /^Add to cart/ })).toContainText("$18.99");
});

test("keeps a guest cart across a reload", async ({ page }) => {
  await openItem(page, "Masala Fries");
  await pick(page, "Lg");
  await addToCart(page);
  await page.getByRole("button", { name: "Close cart" }).click();

  await page.reload();
  await page.getByRole("button", { name: /^Cart/ }).click();

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toContainText("Masala Fries");
  // 4.99 + 2.00 for the large
  await expect(panel).toContainText("$6.99");
});

test("changes quantity and removes a line", async ({ page }) => {
  await openItem(page, "Cheese Burger");
  await addToCart(page);

  const panel = page.getByRole("dialog", { name: "Your cart" });
  await panel.getByRole("button", { name: /Add one Cheese Burger/ }).click();
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
  await openItem(page, "Lamb");
  await pick(page, "Add fries and a soda");
  await addToCart(page);
  await page.getByRole("button", { name: "Close cart" }).click();

  await logIn(page, account);

  // The cart followed them in, and is now in the database.
  await page.getByRole("button", { name: /^Cart/ }).click();
  const panel = page.getByRole("dialog", { name: "Your cart" });
  await expect(panel).toContainText("Lamb");
  await expect(panel).toContainText("Add fries and a soda");
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

  await openItem(pageA, "Philly Cheese Steak");
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
    "Philly Cheese Steak",
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

  // The dishes that arrived with the printed menu are priced as it prints them.
  await page.goto("/menu");
  const card = (name: string) =>
    page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(card("Falafel on Pita")).toContainText("$10.99");
  await expect(card("Beef Chapli Kabab")).toContainText("$13.99");
  await expect(card("Chapli Kabab Mix")).toContainText("$14.99");
  await expect(card("Double Cheese Burger")).toContainText("$9.99");
  await expect(card("Baklava")).toContainText("$5.99");
  await page.goto("/");

  if (!isMobile) {
    await expect(page.locator("#nav").getByRole("link", { name: "Order now" })).toHaveAttribute(
      "href",
      "/menu",
    );
  }
});
