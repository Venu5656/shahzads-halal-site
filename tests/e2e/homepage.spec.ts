import { expect, test } from "@playwright/test";

/**
 * The homepage, in the dark-counter design.
 *
 * These replace the phase 1 guard rails, which asserted the ported design's
 * markup — the ember canvas, the rotating plate, the hours dial, the mobile
 * drawer — none of which exists on this branch. What is worth protecting is
 * not that markup but the promises: the first screen is about the shop, the
 * second is about the food, only top-down platters turn, and none of it needs
 * script or motion to be usable.
 */

test("opens on the shop, not on a dish", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");

  await expect(page).toHaveTitle(/Shahzad's Halal Food/);
  // One h1, and it names the place rather than whichever dish is showing.
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("flat-top");

  // The live line comes from the real hours, rendered on the server.
  await expect(
    page.getByText(/Kitchen is live|Kitchen closing|Closed · opens in/).first(),
  ).toBeVisible();

  await expect(page.locator("main")).toContainText("152 Easton Ave");
  await expect(page.locator("main")).toContainText("Pickup only");

  expect(errors).toEqual([]);
});

test("cycles the platters, and only the platters", async ({ page }) => {
  await page.goto("/");
  const stage = page.getByRole("region", { name: "Tonight's platters" });
  await expect(stage).toBeVisible();

  const dish = stage.getByRole("heading", { level: 2 }).first();
  const first = (await dish.innerText()).trim();

  await page.getByLabel("Next platter").click();
  await expect.poll(async () => (await dish.innerText()).trim()).not.toBe(first);

  await page.getByLabel("Previous platter").click();
  await expect.poll(async () => (await dish.innerText()).trim()).toBe(first);

  // Every picture here is top-down plate photography. A three-quarter shot
  // set spinning reads as a sticker turning.
  const sources = await stage
    .locator("img")
    .evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src") ?? ""));
  expect(sources.length).toBeGreaterThan(0);
  for (const src of sources) expect(src).toContain("/img/menu/plate/");
});

test("jumping to a platter by name swaps the plate", async ({ page }) => {
  await page.goto("/");
  const stage = page.getByRole("region", { name: "Tonight's platters" });

  await stage.getByRole("button", { name: /Lamb over Rice/ }).click();
  await expect(stage.getByRole("heading", { level: 2 })).toContainText("Lamb over Rice");
  await expect(stage.locator("img").first()).toHaveAttribute(
    "src",
    /\/plate\/lamb-over-rice\.webp$/,
  );
});

test("the counter and the prices are the real ones", async ({ page }) => {
  await page.goto("/");
  const stage = page.getByRole("region", { name: "Tonight's platters" });

  // Eight platters have the new photography; the ninth has no photo yet.
  await expect(stage).toContainText("08");
  await expect(stage).toContainText("$11.99");
  await expect(stage.getByRole("button", { name: /Lamb & Chicken Mix/ })).toContainText("$13.99");
});

test("the plate stops turning for anyone who asks for less motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");

  const turn = page.locator(".kuro-turn").first();
  await expect(turn).toBeVisible();
  // Switched off in CSS, not merely paused by script.
  expect(await turn.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(
    await page.locator(".kuro-ticker-track").evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");

  await context.close();
});

test("is readable with no JavaScript at all", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("h1")).toContainText("flat-top");
  await expect(page.locator("main")).toContainText("152 Easton Ave");
  const stage = page.getByRole("region", { name: "Tonight's platters" });
  await expect(stage.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(page.locator("#hours tbody tr")).toHaveCount(7);

  await context.close();
});

test("the order control carries the running total", async ({ page }) => {
  await page.goto("/");
  const order = page.getByRole("button", { name: /^Order/ });
  await expect(order).toBeVisible();
  await expect(order).toContainText("$0.00");
});

test("self-hosts its fonts and images", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    if (!isLocal) external.push(r.url());
  });

  await page.goto("/", { waitUntil: "networkidle" });
  // The serif and the monospace are served from /fonts, not from Google.
  expect(external).toEqual([]);
});

test("shows the week as a dial, from the shop's own clock", async ({ page }) => {
  await page.goto("/");
  const hours = page.locator("#hours");

  await expect(hours).toContainText("Now in New Brunswick");
  await expect(hours.locator("tbody tr")).toHaveCount(7);
  // The arc is drawn from the real service hours, not a decorative circle.
  await expect(hours.locator("svg path[stroke^='url(']")).toHaveCount(1);
  // Today is marked.
  await expect(hours.locator("tbody tr th").filter({ hasText: /./ }).first()).toBeVisible();
});

test("the sauces carry their own colour and heat", async ({ page }) => {
  await page.goto("/");
  const sauces = page.locator("#sauces");

  await expect(sauces.getByRole("button")).toHaveCount(6);
  await expect(sauces).toContainText("White");

  // Choosing one swaps the blob's description.
  await sauces.getByRole("button", { name: /Tahini/ }).click();
  await expect(sauces).toContainText("sesame");
});
