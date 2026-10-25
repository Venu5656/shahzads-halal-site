import { expect, test } from "@playwright/test";

/**
 * The homepage, rebuilt as a specimen catalogue.
 *
 * These replace the phase 1 guard rails, which asserted the ported design's
 * markup — the dial, the drawer, the rotating plate — none of which exists any
 * more. What is worth protecting is not that markup but the promises: the page
 * answers the one real question in the first screen, the pinned stage actually
 * swaps, the catalogue is the real menu, and none of it depends on script to
 * be readable.
 */

test("answers the first question in the first screen", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");

  await expect(page).toHaveTitle(/Shahzad's Halal Food/);
  await expect(page.locator("h1")).toContainText("grill stays lit");

  // The live line is the page's one live thing, and it is rendered on the
  // server from the real hours, so it is never a placeholder.
  const status = page.getByText(/Open now|Closed|Kitchen closing/).first();
  await expect(status).toBeVisible();

  // The headline, the sentence and the one action all share the first screen.
  const cta = page.getByRole("link", { name: "Order for pickup" });
  await expect(cta).toBeInViewport();

  expect(errors).toEqual([]);
});

test("swaps the specimen as the pinned stage scrolls", async ({ page }) => {
  await page.goto("/");

  const stage = page.getByRole("region", { name: /Tonight at Shahzad/ });
  // All three specimens sit in the DOM and are cross-faded, so "visible" is
  // true of every one of them. The active one is the one not hidden from the
  // accessibility tree — which is the contract that actually matters.
  const showing = stage.locator('img:not([aria-hidden="true"])');
  const first = await showing.getAttribute("src");

  // Walk down into the second step and let the observer settle.
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.8));
  await page.waitForTimeout(900);

  await expect(stage.getByRole("heading", { name: "Chicken", exact: true })).toBeVisible();
  await expect.poll(async () => showing.getAttribute("src"), { timeout: 5000 }).not.toBe(first);
});

test("the catalogue is the real menu, at the board's prices", async ({ page }) => {
  await page.goto("/");

  const tiles = page.locator("#catalogue li");
  expect(await tiles.count()).toBeGreaterThanOrEqual(10);

  // A tile goes to the real item page, not a lightbox.
  await expect(page.locator('#catalogue a[href="/menu/chicken-gyro"]')).toHaveCount(1);
  await expect(page.locator("#catalogue")).toContainText("$9.99");

  await page.getByRole("link", { name: /^See all \d+ dishes$/ }).click();
  await expect(page).toHaveURL(/\/menu$/);
});

test("prints the real week, and marks today", async ({ page }) => {
  await page.goto("/");
  const rows = page.locator("#visit tbody tr");
  await expect(rows).toHaveCount(7);
  await expect(page.locator("#visit")).toContainText("3 AM");
  await expect(page.locator("#visit")).toContainText("152 Easton Ave");
});

test("stays readable with no JavaScript at all", async ({ browser }) => {
  // The entrance layer hides parts from the client only, so a reader without
  // script — or one who asked for less motion — still gets the whole page.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("h1")).toContainText("grill stays lit");
  await expect(page.getByRole("link", { name: "Order for pickup" })).toBeVisible();
  await expect(page.locator("#catalogue li").first()).toBeVisible();
  await expect(page.locator("#visit tbody tr")).toHaveCount(7);
  // Nothing is left invisible by the armed state.
  await expect(page.locator(".reveal-armed")).toHaveCount(0);

  await context.close();
});

test("holds the photograph slots open rather than filling them with stock", async ({ page }) => {
  await page.goto("/");
  // These disappear the moment the owner's own pictures are passed in; until
  // then the page says what is missing instead of borrowing someone else's.
  const slots = page.getByText("Photograph to come");
  expect(await slots.count()).toBeGreaterThan(0);
});

test("self-hosts its fonts and images", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    const isMapsEmbed = /(^|\.)(google\.com|googleapis\.com|gstatic\.com)$/.test(url.hostname);
    if (!isLocal && !isMapsEmbed) external.push(r.url());
  });

  await page.goto("/", { waitUntil: "networkidle" });
  expect(external).toEqual([]);
});
