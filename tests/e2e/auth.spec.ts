import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Sign up, log in, verify, profile and sign-out, end to end.
 *
 * SMS is in console mode (the server runs with ALLOW_CONSOLE_SMS=1), so the
 * verify screen shows the code and we read it from there.
 *
 * Every test owns one phone number in the fictional 555-01xx block, per
 * project, and wipes it before and after — so runs are repeatable and never
 * trip the rate limits.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

// Each Playwright project gets its own area code so desktop and mobile can run
// at the same time without sharing numbers.
const AREA = { desktop: "201", mobile: "973" } as const;

function phoneFor(slot: number): { typed: string; e164: string } {
  const area = AREA[test.info().project.name as keyof typeof AREA] ?? "908";
  const last = String(slot).padStart(2, "0");
  return { typed: `(${area}) 555-01${last}`, e164: `+1${area}55501${last}` };
}

async function wipe(...e164s: string[]) {
  await prisma.otpCode.deleteMany({ where: { phone: { in: e164s } } });
  await prisma.user.deleteMany({ where: { phone: { in: e164s } } });
}

async function readDevCode(page: Page): Promise<string> {
  const banner = page.getByTestId("dev-otp");
  await expect(banner).toBeVisible();
  const code = (await banner.textContent())?.match(/\d{6}/)?.[0];
  if (!code) throw new Error("No dev code on the verify screen");
  return code;
}

async function enterCode(page: Page, code: string) {
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Enter the right code and wait for the sign-in to finish before moving on. */
async function completeVerify(page: Page) {
  await enterCode(page, await readDevCode(page));
  await page.waitForURL((url) => url.pathname !== "/verify");
}

async function signUp(page: Page, name: string, typedPhone: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Mobile number").fill(typedPhone);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify/);
  await completeVerify(page);
}

async function logIn(page: Page, typedPhone: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Mobile number").fill(typedPhone);
  await page.getByRole("button", { name: "Text me a code" }).click();
  await expect(page).toHaveURL(/\/verify/);
  await completeVerify(page);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("signs up with a phone code and lands on the account page", async ({ page }) => {
  const phone = phoneFor(1);
  await wipe(phone.e164);

  await signUp(page, "Aisha Khan", phone.typed);

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aisha");

  const user = await prisma.user.findUniqueOrThrow({ where: { phone: phone.e164 } });
  expect(user).toMatchObject({ name: "Aisha Khan", role: "CUSTOMER", phoneVerified: true });

  // The code is never stored in plain text.
  const otp = await prisma.otpCode.findFirstOrThrow({ where: { phone: phone.e164 } });
  expect(otp.codeHash).toMatch(/^[0-9a-f]{64}$/);
  expect(otp.consumedAt).not.toBeNull();

  await wipe(phone.e164);
});

test("logs out and back in", async ({ page }) => {
  const phone = phoneFor(2);
  await wipe(phone.e164);
  await signUp(page, "Omar", phone.typed);
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(await prisma.session.count({ where: { user: { phone: phone.e164 } } })).toBe(0);

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

  // Wait out the 30-second resend cooldown by clearing the first code.
  await prisma.otpCode.deleteMany({ where: { phone: phone.e164 } });
  await logIn(page, phone.typed, "/account");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Omar");

  await wipe(phone.e164);
});

test("counts down wrong codes, then accepts the right one", async ({ page }) => {
  const phone = phoneFor(3);
  await wipe(phone.e164);

  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Mobile number").fill(phone.typed);
  await page.getByRole("button", { name: "Create account" }).click();
  const code = await readDevCode(page);
  const wrong = code === "000000" ? "111111" : "000000";

  await enterCode(page, wrong);
  await expect(page.locator("main").getByRole("alert")).toContainText("4 tries left");
  await enterCode(page, wrong);
  await expect(page.locator("main").getByRole("alert")).toContainText("3 tries left");

  await enterCode(page, code);
  await expect(page).toHaveURL(/\/account$/);

  await wipe(phone.e164);
});

test("burns a code after five wrong tries", async ({ page }) => {
  const phone = phoneFor(4);
  await wipe(phone.e164);

  await page.goto("/login");
  await page.getByLabel("Mobile number").fill(phone.typed);
  await page.getByRole("button", { name: "Text me a code" }).click();
  const code = await readDevCode(page);
  const wrong = code === "000000" ? "111111" : "000000";

  for (let i = 0; i < 5; i++) await enterCode(page, wrong);
  await expect(page.locator("main").getByRole("alert")).toContainText("last try");

  // Even the right code is refused now.
  await enterCode(page, code);
  await expect(page.locator("main").getByRole("alert")).toContainText("Too many wrong tries");
  expect(await prisma.user.count({ where: { phone: phone.e164 } })).toBe(0);

  await wipe(phone.e164);
});

test("a new number that logs in is asked for a name only after verifying", async ({ page }) => {
  const phone = phoneFor(5);
  await wipe(phone.e164);

  await logIn(page, phone.typed);
  await expect(page).toHaveURL(/\/signup\/details/);
  await expect(page.getByText("There's no account for")).toBeVisible();

  await page.getByLabel("Your name").fill("Priya");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Priya");

  await wipe(phone.e164);
});

test("signing up with an existing number just signs in to that account", async ({ page }) => {
  const phone = phoneFor(6);
  await wipe(phone.e164);
  await prisma.user.create({ data: { phone: phone.e164, name: "Original Name" } });

  await signUp(page, "Somebody Else", phone.typed);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Original");

  const user = await prisma.user.findUniqueOrThrow({ where: { phone: phone.e164 } });
  expect(user.name).toBe("Original Name");

  await wipe(phone.e164);
});

test("validates the sign-up form on the server", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByLabel("Email (optional)").fill("not-an-email");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Tell us your name.")).toBeVisible();
  await expect(page.getByText("Enter a valid US mobile number.")).toBeVisible();
  await expect(page.getByText("Enter a valid email, or leave it blank.")).toBeVisible();
  // What they typed is kept.
  await expect(page.getByLabel("Mobile number")).toHaveValue("12345");
});

test("edits the profile", async ({ page }) => {
  const phone = phoneFor(7);
  await wipe(phone.e164);
  await signUp(page, "Zaid", phone.typed);

  await page.getByLabel("Name").fill("Zaid Ahmed");
  await page.getByLabel("Email (optional)").fill("zaid@example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Saved.");

  const user = await prisma.user.findUniqueOrThrow({ where: { phone: phone.e164 } });
  expect(user).toMatchObject({ name: "Zaid Ahmed", email: "zaid@example.com" });

  await wipe(phone.e164);
});

test("changing phone number requires a code sent to the new number", async ({ page }) => {
  const oldPhone = phoneFor(8);
  const newPhone = phoneFor(9);
  await wipe(oldPhone.e164, newPhone.e164);
  await signUp(page, "Layla", oldPhone.typed);

  await page.getByRole("button", { name: "Change number" }).click();
  await page.getByLabel("New mobile number").fill(newPhone.typed);
  await page.getByRole("button", { name: "Text the new number" }).click();
  await expect(page).toHaveURL(/\/verify/);
  await expect(page.getByText(`•••-${newPhone.e164.slice(-4)}`)).toBeVisible();

  // Until the code is entered, nothing has changed.
  let user = await prisma.user.findUniqueOrThrow({ where: { phone: oldPhone.e164 } });
  expect(user.phone).toBe(oldPhone.e164);

  await completeVerify(page);
  await expect(page).toHaveURL(/\/account\?updated=phone/);
  await expect(page.locator("main").getByRole("status")).toContainText("phone number has been updated");

  user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(user.phone).toBe(newPhone.e164);

  await wipe(oldPhone.e164, newPhone.e164);
});

test("log out of all devices ends every session", async ({ browser }) => {
  const phone = phoneFor(10);
  await wipe(phone.e164);

  const phoneA = await browser.newContext();
  const pageA = await phoneA.newPage();
  await signUp(pageA, "Hassan", phone.typed);
  await expect(pageA).toHaveURL(/\/account$/);

  // A second device signs in to the same account.
  await prisma.otpCode.deleteMany({ where: { phone: phone.e164 } });
  const laptop = await browser.newContext();
  const pageB = await laptop.newPage();
  await logIn(pageB, phone.typed);
  await expect(pageB).toHaveURL(/\/account$/);
  expect(await prisma.session.count({ where: { user: { phone: phone.e164 } } })).toBe(2);

  await pageA.getByRole("button", { name: "Log out of all devices" }).click();
  await expect(pageA).toHaveURL(/\/login\?signedOut=all/);

  await pageB.goto("/account");
  await expect(pageB).toHaveURL(/\/login/);
  expect(await prisma.session.count({ where: { user: { phone: phone.e164 } } })).toBe(0);

  await phoneA.close();
  await laptop.close();
  await wipe(phone.e164);
});

test("keeps customers out of the manager area and lets the owner in", async ({ page }) => {
  const phone = phoneFor(11);
  await wipe(phone.e164);
  await signUp(page, "Customer", phone.typed);
  await expect(page).toHaveURL(/\/account$/);

  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);

  await prisma.user.update({ where: { phone: phone.e164 }, data: { role: "OWNER" } });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("phase 5");

  await wipe(phone.e164);
});

test("never redirects off-site after login", async ({ page }) => {
  const phone = phoneFor(12);
  await wipe(phone.e164);
  await prisma.user.create({ data: { phone: phone.e164, name: "Nadia" } });

  await logIn(page, phone.typed, "//evil.example/steal");
  await expect(page).toHaveURL(/localhost|127\.0\.0\.1/);
  await expect(page).toHaveURL(/\/account$/);

  await wipe(phone.e164);
});

test("the homepage offers log in and sign up, then shows the account", async ({
  page,
  isMobile,
}) => {
  const phone = phoneFor(13);
  await wipe(phone.e164);

  await page.goto("/");
  if (isMobile) {
    await page.getByLabel("Open menu").click();
    await expect(page.locator("#drawer").getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.locator("#drawer").getByRole("link", { name: "Sign up" })).toBeVisible();
  } else {
    const nav = page.locator("#nav");
    await expect(nav.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign up" })).toBeVisible();
  }

  await signUp(page, "Yusuf Ali", phone.typed);
  await page.goto("/");
  if (isMobile) {
    await page.getByLabel("Open menu").click();
    await expect(page.locator("#drawer").getByRole("link", { name: "My account" })).toBeVisible();
  } else {
    await expect(page.locator("#nav").getByRole("link", { name: /Yusuf/ })).toBeVisible();
    await expect(page.locator("#nav").getByRole("link", { name: "Log in" })).toHaveCount(0);
  }

  await wipe(phone.e164);
});
