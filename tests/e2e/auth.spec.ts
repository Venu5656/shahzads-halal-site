import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Sign up, log in, profile and sign-out, end to end.
 *
 * Accounts are phone number + password; nothing is texted. Every test owns one
 * phone number in the fictional 555-01xx block, per project, and wipes it
 * before and after, so runs are repeatable and never trip the lockout.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

const PASSWORD = "a good enough password";

// Each Playwright project gets its own area code so desktop and mobile can run
// at the same time without sharing numbers.
const AREA = { desktop: "201", mobile: "973" } as const;

function phoneFor(slot: number): { typed: string; e164: string } {
  const area = AREA[test.info().project.name as keyof typeof AREA] ?? "908";
  const last = String(slot).padStart(2, "0");
  return { typed: `(${area}) 555-01${last}`, e164: `+1${area}55501${last}` };
}

async function wipe(...e164s: string[]) {
  await prisma.loginAttempt.deleteMany({ where: { phone: { in: e164s } } });
  await prisma.user.deleteMany({ where: { phone: { in: e164s } } });
}

/**
 * Waits for a submitted auth form to actually finish: either it navigated
 * away, or it came back with a message. Without this a test can race ahead and
 * type into the page it is about to leave.
 */
async function settled(page: Page, from: string) {
  await Promise.race([
    page.waitForURL((url) => url.pathname !== from),
    page.locator("main").getByRole("alert").waitFor({ state: "visible" }),
  ]);
}

async function signUp(page: Page, name: string, typedPhone: string, password = PASSWORD) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Mobile number").fill(typedPhone);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await settled(page, "/signup");
}

async function logIn(page: Page, typedPhone: string, password = PASSWORD, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Mobile number").fill(typedPhone);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await settled(page, "/login");
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("creates an account straight away, with no code to wait for", async ({ page }) => {
  const phone = phoneFor(1);
  await wipe(phone.e164);

  await signUp(page, "Aisha Khan", phone.typed);

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aisha");

  const user = await prisma.user.findUniqueOrThrow({ where: { phone: phone.e164 } });
  expect(user).toMatchObject({ name: "Aisha Khan", role: "CUSTOMER" });

  // The password is stored only as a salted scrypt hash.
  expect(user.passwordHash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$/);
  expect(user.passwordHash).not.toContain(PASSWORD);
  // Nothing has proved the number yet, and the flag says so honestly.
  expect(user.phoneVerified).toBe(false);

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

  await logIn(page, phone.typed, PASSWORD, "/account");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Omar");

  await wipe(phone.e164);
});

test("refuses the wrong password without saying whether the number exists", async ({ page }) => {
  const known = phoneFor(3);
  const unknown = phoneFor(4);
  await wipe(known.e164, unknown.e164);
  await signUp(page, "Sam", known.typed);
  await page.getByRole("button", { name: "Log out", exact: true }).click();

  await logIn(page, known.typed, "the wrong password");
  const wrongPassword = await page.locator("main").getByRole("alert").textContent();
  await expect(page).toHaveURL(/\/login/);

  await logIn(page, unknown.typed, "the wrong password");
  const noAccount = await page.locator("main").getByRole("alert").textContent();

  expect(wrongPassword).toBe(noAccount);
  expect(wrongPassword).toMatch(/don't match/);

  await wipe(known.e164, unknown.e164);
});

test("locks a number after eight wrong passwords", async ({ page }) => {
  const phone = phoneFor(5);
  await wipe(phone.e164);
  await signUp(page, "Target", phone.typed);
  await page.getByRole("button", { name: "Log out", exact: true }).click();

  // Eight failures are allowed; the ninth attempt is refused before the
  // password is even looked at — so the right one does not get in either.
  for (let i = 0; i < 8; i++) await logIn(page, phone.typed, `guess number ${i}`);
  await expect(page.locator("main").getByRole("alert")).toContainText("don't match");

  await logIn(page, phone.typed);
  await expect(page.locator("main").getByRole("alert")).toContainText("Too many failed attempts");
  await expect(page).toHaveURL(/\/login/);

  expect(
    await prisma.loginAttempt.count({ where: { phone: phone.e164, success: true } }),
  ).toBe(0);

  await wipe(phone.e164);
});

test("refuses a second account on the same number", async ({ page }) => {
  const phone = phoneFor(6);
  await wipe(phone.e164);
  await prisma.user.create({ data: { phone: phone.e164, name: "Original Name" } });

  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Somebody Else");
  await page.getByLabel("Mobile number").fill(phone.typed);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("There's already an account with that number")).toBeVisible();
  const user = await prisma.user.findUniqueOrThrow({ where: { phone: phone.e164 } });
  expect(user.name).toBe("Original Name");

  await wipe(phone.e164);
});

test("validates the sign-up form on the server", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Email (optional)").fill("not-an-email");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Tell us your name.")).toBeVisible();
  await expect(page.getByText("Enter a valid US mobile number.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("Enter a valid email, or leave it blank.")).toBeVisible();
  // What they typed is kept, except the password.
  await expect(page.getByLabel("Mobile number")).toHaveValue("12345");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
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

test("changes the password, signs other devices out, and requires the new one", async ({
  browser,
}) => {
  const phone = phoneFor(8);
  await wipe(phone.e164);

  const phoneCtx = await browser.newContext();
  const pageA = await phoneCtx.newPage();
  await signUp(pageA, "Hassan", phone.typed);
  await expect(pageA).toHaveURL(/\/account$/);

  const laptop = await browser.newContext();
  const pageB = await laptop.newPage();
  await logIn(pageB, phone.typed);
  await expect(pageB).toHaveURL(/\/account$/);

  await pageA.getByRole("button", { name: "Change password" }).click();
  await pageA.getByLabel("Current password").fill(PASSWORD);
  await pageA.getByLabel("New password").fill("a different good password");
  await pageA.getByRole("button", { name: "Change password" }).click();
  await expect(pageA.locator("main").getByRole("status")).toContainText("Password changed");

  // This device stays in; the other one is out.
  await pageA.goto("/account");
  await expect(pageA).toHaveURL(/\/account$/);
  await pageB.goto("/account");
  await expect(pageB).toHaveURL(/\/login/);

  // The old password no longer works, the new one does.
  await logIn(pageB, phone.typed, PASSWORD);
  await expect(pageB).toHaveURL(/\/login/);
  await logIn(pageB, phone.typed, "a different good password");
  await expect(pageB).toHaveURL(/\/account$/);

  await phoneCtx.close();
  await laptop.close();
  await wipe(phone.e164);
});

test("changing the phone number requires the password", async ({ page }) => {
  const oldPhone = phoneFor(9);
  const newPhone = phoneFor(10);
  await wipe(oldPhone.e164, newPhone.e164);
  await signUp(page, "Layla", oldPhone.typed);

  await page.getByRole("button", { name: "Change number" }).click();
  await page.getByLabel("New mobile number").fill(newPhone.typed);
  await page.getByLabel("Your password").fill("not the right one");
  await page.getByRole("button", { name: "Change number" }).click();
  await expect(page.getByText("That's not your current password.")).toBeVisible();

  let user = await prisma.user.findUniqueOrThrow({ where: { phone: oldPhone.e164 } });
  expect(user.phone).toBe(oldPhone.e164);

  await page.getByLabel("Your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Change number" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("number has been updated");

  user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(user.phone).toBe(newPhone.e164);

  // The new number is what logs in now.
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await logIn(page, newPhone.typed);
  await expect(page).toHaveURL(/\/account$/);

  await wipe(oldPhone.e164, newPhone.e164);
});

test("log out of all devices ends every session", async ({ browser }) => {
  const phone = phoneFor(11);
  await wipe(phone.e164);

  const phoneCtx = await browser.newContext();
  const pageA = await phoneCtx.newPage();
  await signUp(pageA, "Bilal", phone.typed);
  await expect(pageA).toHaveURL(/\/account$/);

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

  await phoneCtx.close();
  await laptop.close();
  await wipe(phone.e164);
});

test("keeps customers out of the manager area and lets the owner in", async ({ page }) => {
  const phone = phoneFor(12);
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
  const phone = phoneFor(13);
  await wipe(phone.e164);
  await signUp(page, "Nadia", phone.typed);
  await page.getByRole("button", { name: "Log out", exact: true }).click();

  await logIn(page, phone.typed, PASSWORD, "//evil.example/steal");
  await expect(page).toHaveURL(/localhost|127\.0\.0\.1/);
  await expect(page).toHaveURL(/\/account$/);

  await wipe(phone.e164);
});

test("the homepage offers log in and sign up, then shows the account", async ({
  page,
  isMobile,
}) => {
  const phone = phoneFor(14);
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
  await expect(page).toHaveURL(/\/account$/);
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
