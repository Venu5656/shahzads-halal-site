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
  // Delivery or pickup — not "pickup only", which stopped being true the day
  // the delivery partner took over.
  await expect(page.locator("main")).toContainText("Delivery or pickup");

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

// ------------------------------------------------- the hero's video

/**
 * The flat-top running behind the headline.
 *
 * Three things are worth guarding here and none of them is "the video is
 * there". A background video breaks in ways nobody notices until a customer
 * does: it swallows the buttons sitting on top of it, it starts making noise,
 * or it plays at somebody who has asked their whole machine to stop moving.
 */

test("plays the flat-top behind the hero, on a loop and in silence", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("section video");

  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("loop", "");
  // playsinline keeps iOS from throwing it into the full-screen player, which
  // would turn a background into the only thing on the screen.
  await expect(video).toHaveJSProperty("playsInline", true);
  // Muted is not a preference. A browser refuses to autoplay anything else,
  // so an unmuted background video is a background video that never starts.
  await expect(video).toHaveJSProperty("muted", true);

  // It is actually running, not just present and frozen on frame one.
  await expect
    .poll(async () => video.evaluate((v: HTMLVideoElement) => v.currentTime), {
      timeout: 10_000,
    })
    .toBeGreaterThan(0.2);
});

test("the hero's buttons still work with the video behind them", async ({ page }) => {
  await page.goto("/");

  // The thing that actually goes wrong: a full-bleed layer over a section
  // with controls in it takes the clicks, and the button looks fine and does
  // nothing. Ask the browser what is on top at each control's centre.
  for (const control of [
    page.getByRole("link", { name: /See tonight/ }),
    page.locator('section a[href^="tel:"]'),
  ]) {
    // elementFromPoint only answers for coordinates inside the viewport, and
    // the hero is taller than one. Without this the test reports every
    // control as covered and is right about none of them.
    await control.scrollIntoViewIfNeeded();
    const onTop = await control.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return hit === el || el.contains(hit);
    });
    expect(onTop).toBe(true);
  }

  // And Playwright's own click does a hit test of its own: it throws rather
  // than clicking if something is intercepting the pointer.
  await page.getByRole("link", { name: /See tonight/ }).click();
  await expect(page).toHaveURL(/#platters$/);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeGreaterThan(200);
});

test("sends no video at all to anyone who asked for less motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();

  const videoRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/video/") && r.url().endsWith(".mp4")) videoRequests.push(r.url());
  });

  await page.goto("/");
  await page.waitForTimeout(1200);

  // Not hidden with CSS — never asked for. Downloading a megabyte of cooking
  // to then not play it is the same bandwidth and none of the point.
  await expect(page.locator("section video")).toHaveCount(0);
  expect(videoRequests).toEqual([]);

  // The still is what stays, so the hero is never an empty black rectangle.
  await expect(page.locator('section img[src*="flat-top-poster"]')).toBeVisible();
  // And the headline is still the headline.
  await expect(page.locator("h1")).toContainText("flat-top");

  await ctx.close();
});
