import { expect, test } from "@playwright/test";

/**
 * Phase 1 guard rail: the ported homepage must keep rendering everything the
 * original static page did, and must do it without console errors.
 */

test("renders the ported homepage", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");

  await expect(page).toHaveTitle(/Shahzad's Halal Food/);
  // Scoped: the plate hero above it carries its own heading.
  await expect(page.locator(".hero h1")).toContainText("Stacked.");

  // The teaser grid, the sauces and the hours list are all script-built. The
  // grid shows a handful of real dishes from the database; the whole menu
  // lives on /menu, so there are no category tabs here any more.
  await expect(page.locator(".menu-grid .card")).toHaveCount(4);
  await expect(page.locator("#tabs")).toHaveCount(0);
  await expect(page.locator("#sauceBtns .sauce")).toHaveCount(6);
  await expect(page.locator("#days li")).toHaveCount(7);
  await expect(page.locator("#dialSvg circle")).not.toHaveCount(0);

  // The live status pill resolves to one of the two real states.
  await expect(page.locator(".js-status").first()).toHaveText(/Open now|Closed now/);
  await expect(page.locator("#clock")).not.toHaveText("--:--");

  expect(errors).toEqual([]);
});

test("sends people to the full menu rather than repeating it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".menu-grid .card")).toHaveCount(4);

  const more = page.getByRole("link", { name: "Explore full menu" });
  await expect(more).toBeVisible();
  await more.click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("menu");
});

test("puts the sauces above the menu now that the menu has its own page", async ({ page }) => {
  await page.goto("/");
  const order = await page.evaluate(() =>
    [...document.querySelectorAll("main > section")].map((s) => s.id).filter(Boolean),
  );
  expect(order).toEqual(["signature", "sauces", "menu", "hours", "visit"]);
});

test("opens the mobile drawer", async ({ page, isMobile }) => {
  test.skip(!isMobile, "drawer only exists at mobile widths");

  await page.goto("/");
  await page.getByLabel("Open menu").click();
  await expect(page.locator("body")).toHaveClass(/menu-open/);
  await page.locator("#drawer a", { hasText: "Sauces" }).click();
  await expect(page.locator("body")).not.toHaveClass(/menu-open/);
});

test("self-hosts its fonts and images", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    // The Google Maps embed is the one deliberate third-party resource.
    const isMapsEmbed = /(^|\.)(google\.com|googleapis\.com|gstatic\.com)$/.test(url.hostname);
    if (!isLocal && !isMapsEmbed) external.push(r.url());
  });

  await page.goto("/", { waitUntil: "networkidle" });
  expect(external).toEqual([]);
});

// --------------------------------------------------- the spinning platters

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

  // Every picture on the stage is a top-down plate; nothing else may spin.
  for (const src of await stage.locator("img").evaluateAll((els) =>
    els.map((e) => (e as HTMLImageElement).getAttribute("src") ?? ""),
  )) {
    expect(src).toContain("/img/menu/plate/");
  }
});

test("the page keeps exactly one h1", async ({ page }) => {
  await page.goto("/");
  // The plate's dish name changes when you press an arrow, so it is content
  // and not the title of the page.
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("Stacked.");
});

test("jumping to a platter by name swaps the plate", async ({ page }) => {
  await page.goto("/");
  const stage = page.getByRole("region", { name: "Tonight's platters" });

  await stage.getByRole("button", { name: "Lamb over Rice" }).click();
  await expect(stage.getByRole("heading", { level: 2 })).toContainText("Lamb over Rice");
  await expect(stage.locator("img").first()).toHaveAttribute(
    "src",
    /\/plate\/lamb-over-rice\.webp$/,
  );
});

test("the plate stops turning for anyone who asks for less motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");

  const turn = page.locator(".plate-turn").first();
  await expect(turn).toBeVisible();
  // The keyframe is switched off in CSS, not merely paused by script.
  expect(await turn.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

  await context.close();
});
