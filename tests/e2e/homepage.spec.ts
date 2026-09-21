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
  await expect(page.locator("h1")).toContainText("Stacked.");

  // Menu grid, category tabs, sauces and the hours list are all script-built.
  await expect(page.locator(".menu-grid .card")).toHaveCount(14);
  await expect(page.locator("#tabs .tab")).toHaveCount(5);
  await expect(page.locator("#sauceBtns .sauce")).toHaveCount(6);
  await expect(page.locator("#days li")).toHaveCount(7);
  await expect(page.locator("#dialSvg circle")).not.toHaveCount(0);

  // The live status pill resolves to one of the two real states.
  await expect(page.locator(".js-status").first()).toHaveText(/Open now|Closed now/);
  await expect(page.locator("#clock")).not.toHaveText("--:--");

  expect(errors).toEqual([]);
});

test("filters the menu by category", async ({ page }) => {
  await page.goto("/");
  // The grid is built by the client script; wait for it before filtering it.
  await expect(page.locator(".menu-grid .card")).toHaveCount(14);

  await page.getByRole("tab", { name: /^Gyros/ }).click();
  await expect(page.locator(".menu-grid .card:not(.gone)")).toHaveCount(4);

  await page.getByRole("tab", { name: /^All/ }).click();
  await expect(page.locator(".menu-grid .card:not(.gone)")).toHaveCount(14);
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
