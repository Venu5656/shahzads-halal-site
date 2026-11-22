import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();





test.afterAll(async () => {
  await prisma.$disconnect();
});

// ------------------------------------------------------------- browsing


/**
 * Opens one dish. A phone navigates to the item's page; a desktop opens the
 * dialog. Either way the dish is ready once its ordering link is on screen.
 */
async function openItem(page: Page, name: string) {
  await page.goto("/menu");
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .first()
    .getByRole("button")
    .click();
  await expect(
    page.getByRole("link", { name: /^(Order now|Call to order)/ }).first(),
  ).toBeVisible();
}

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


test("a soda lists the flavours it comes in", async ({ page }) => {
  // The choice is made on DoorDash now, but a menu that does not say which
  // flavours exist is a worse menu than the board on the wall.
  await openItem(page, "Soda");
  const panel = page.locator("main, dialog").filter({ hasText: "Soda" }).first();
  for (const flavour of ["Coke", "Sprite"]) {
    await expect(panel).toContainText(flavour);
  }
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

test("says the platter extras and what each one adds", async ({ page }) => {
  await openItem(page, "Lamb over Rice");
  const panel = page.locator("main, dialog").filter({ hasText: "Lamb over Rice" }).first();
  // Leaving the salad off is free, and the menu has to say so rather than
  // leaving someone to find out at checkout.
  await expect(panel).toContainText("No salad");
  await expect(panel).not.toContainText("No salad +");
  // A paid extra shows its surcharge.
  await expect(panel).toContainText("+$3.00");
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


// ----------------------------------------------------------- the cart







// ------------------------------------------------- carrying the cart over



// ------------------------------------------------------------ sold out

test("marks a sold-out dish and will not send anyone to order it", async ({ page }) => {
  const soldOutUntil = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.menuItem.update({
    where: { slug: "onion-rings" },
    data: { outOfStockUntil: soldOutUntil },
  });

  try {
    await page.goto("/menu");
    const card = page.locator("article").filter({ hasText: "Onion Rings" });
    await expect(card).toContainText("Sold out");

    // The item's own page says so too, and offers no way to order it:
    // sending somebody to DoorDash for a dish the kitchen ran out of is
    // worse than saying so here.
    await page.goto("/menu/onion-rings");
    await expect(page.locator("main")).toContainText("Sold out");
    await expect(page.getByRole("link", { name: /^Order now/ })).toHaveCount(0);
  } finally {
    await prisma.menuItem.update({
      where: { slug: "onion-rings" },
      data: { outOfStockUntil: null },
    });
  }
});


// ------------------------------------------------------- the homepage

test("the homepage teaser is the real menu now", async ({ page }) => {
  await page.goto("/");
  // The homepage stage is drawn from the database, not a hand-kept list.
  const stage = page.getByRole("region", { name: "Tonight's platters" });
  expect(await stage.locator("li").count()).toBeGreaterThanOrEqual(8);
  await expect(stage.getByRole("heading", { level: 2 })).toBeVisible();

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

});
