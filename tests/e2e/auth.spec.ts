import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { countFor, toPath, waitForLink } from "./outbox";

/**
 * Sign up, prove your address, log in, reset a forgotten password, and manage
 * the account — end to end, following the actual links out of the actual
 * emails (read from the development outbox).
 *
 * Every test owns one phone number in the fictional 555-01xx block and one
 * address at example.test, per project, and wipes both before and after, so
 * runs are repeatable and never trip a lockout.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

const PASSWORD = "a good enough password";

// Each Playwright project gets its own area code so desktop and mobile can run
// at the same time without sharing numbers.
const AREA = { desktop: "201", mobile: "973" } as const;

type Account = { typed: string; e164: string; email: string };

function accountFor(slot: number): Account {
  const area = AREA[test.info().project.name as keyof typeof AREA] ?? "908";
  const last = String(slot).padStart(2, "0");
  return {
    typed: `(${area}) 555-01${last}`,
    e164: `+1${area}55501${last}`,
    email: `e2e-${area}-${last}@example.test`,
  };
}

async function wipe(...accounts: Account[]) {
  const e164s = accounts.map((a) => a.e164);
  const emails = accounts.map((a) => a.email);
  await prisma.loginAttempt.deleteMany({
    where: { identifier: { in: [...e164s, ...emails] } },
  });
  await prisma.user.deleteMany({ where: { OR: [{ phone: { in: e164s } }, { email: { in: emails } }] } });
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

/** Fills in the sign-up form. The account exists afterwards, but unverified. */
async function signUp(page: Page, name: string, account: Account, password = PASSWORD) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Mobile number").fill(account.typed);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel(/I agree to the/).check();
  await page.getByLabel(/I'm 18 or older/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await settled(page, "/signup");
}

/** Opens the verification link from the newest email to this address. */
async function verify(page: Page, account: Account, after = 0) {
  const link = await waitForLink(account.email, "verify", after);
  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("confirmed");
}

/** Signs up and proves the address, leaving the browser logged out. */
async function register(page: Page, name: string, account: Account, password = PASSWORD) {
  const before = await countFor(account.email, "verify");
  await signUp(page, name, account, password);
  await verify(page, account, before);
}

async function logIn(page: Page, identifier: string, password = PASSWORD, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Email or mobile number").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await settled(page, "/login");
}

/** Signs up, verifies, and logs in — the state most tests start from. */
async function registerAndLogIn(page: Page, name: string, account: Account) {
  await register(page, name, account);
  await logIn(page, account.email);
  await expect(page).toHaveURL(/\/account$/);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ------------------------------------------------- signing up and verifying

test("signing up sends a link and does not log you in until it is opened", async ({ page }) => {
  const acc = accountFor(1);
  await wipe(acc);
  const before = await countFor(acc.email, "verify");

  await signUp(page, "Aisha Khan", acc);

  // No session yet — the address has not been proved.
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Check");
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(0);

  const user = await prisma.user.findUniqueOrThrow({ where: { email: acc.email } });
  expect(user).toMatchObject({ name: "Aisha Khan", role: "CUSTOMER", emailVerifiedAt: null });
  // The password is stored only as a salted scrypt hash.
  expect(user.passwordHash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$/);
  expect(user.passwordHash).not.toContain(PASSWORD);
  // Nothing has proved the number, and the flag says so honestly.
  expect(user.phoneVerified).toBe(false);

  // The emailed link carries a token we never stored in the clear.
  const link = await waitForLink(acc.email, "verify", before);
  const token = new URL(link).searchParams.get("token")!;
  expect(token.length).toBeGreaterThan(20);
  expect(await prisma.emailToken.count({ where: { tokenHash: token } })).toBe(0);

  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("confirmed");

  const verified = await prisma.user.findUniqueOrThrow({ where: { email: acc.email } });
  expect(verified.emailVerifiedAt).not.toBeNull();

  await logIn(page, acc.email);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aisha");

  await wipe(acc);
});

test("an unverified account cannot log in, even with the right password", async ({ page }) => {
  const acc = accountFor(2);
  await wipe(acc);
  await signUp(page, "Omar", acc);
  const sentAtSignup = await countFor(acc.email, "verify");

  await logIn(page, acc.email);

  // Sent back to the confirm screen, not into the account.
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText(/password was right/)).toBeVisible();
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(0);
  // Logging in does not fire off another email — the signup link still stands.
  expect(await countFor(acc.email, "verify")).toBe(sentAtSignup);

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);

  await wipe(acc);
});

test("a verification link only works once", async ({ page }) => {
  const acc = accountFor(3);
  await wipe(acc);
  const before = await countFor(acc.email, "verify");
  await signUp(page, "Sam", acc);

  const link = await waitForLink(acc.email, "verify", before);
  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("confirmed");

  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("expired");

  await wipe(acc);
});

test("a taken address does not tell a stranger that it is taken", async ({ page }) => {
  const acc = accountFor(4);
  await wipe(acc);
  await register(page, "Original Name", acc);

  // Someone else tries the same address with a different number.
  const other = { ...accountFor(5), email: acc.email };
  await wipe(accountFor(5));
  await signUp(page, "Somebody Else", other);

  // Same screen a real signup gets, and the account is untouched.
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText(/already/i)).toHaveCount(0);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: acc.email } });
  expect(user.name).toBe("Original Name");
  expect(await prisma.user.count({ where: { phone: other.e164 } })).toBe(0);

  await wipe(acc, accountFor(5));
});

test("validates the sign-up form on the server", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email", { exact: true }).fill("not-an-email");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Tell us your name.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Enter a valid US mobile number.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("Accept the terms to continue.")).toBeVisible();
  // What they typed is kept, except the password.
  await expect(page.getByLabel("Mobile number")).toHaveValue("12345");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
});

// --------------------------------------------------------- logging back in

test("logs out and back in, with either the address or the number", async ({ page }) => {
  const acc = accountFor(6);
  await wipe(acc);
  await registerAndLogIn(page, "Omar", acc);

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(0);

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

  // The mobile number still works as a login name.
  await logIn(page, acc.typed, PASSWORD, "/account");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Omar");

  await wipe(acc);
});

test("refuses the wrong password without saying whether the account exists", async ({ page }) => {
  const known = accountFor(7);
  const unknown = accountFor(8);
  await wipe(known, unknown);
  await register(page, "Sam", known);

  await logIn(page, known.email, "the wrong password");
  const wrongPassword = await page.locator("main").getByRole("alert").textContent();
  await expect(page).toHaveURL(/\/login/);

  await logIn(page, unknown.email, "the wrong password");
  const noAccount = await page.locator("main").getByRole("alert").textContent();

  expect(wrongPassword).toBe(noAccount);
  expect(wrongPassword).toMatch(/don't match/);

  await wipe(known, unknown);
});

test("locks an identifier after eight wrong passwords", async ({ page }) => {
  const acc = accountFor(9);
  await wipe(acc);
  await register(page, "Target", acc);

  // Eight failures are allowed; the ninth is refused before the password is
  // even looked at — so the right one does not get in either.
  for (let i = 0; i < 8; i++) await logIn(page, acc.email, `guess number ${i}`);
  await expect(page.locator("main").getByRole("alert")).toContainText("don't match");

  await logIn(page, acc.email);
  await expect(page.locator("main").getByRole("alert")).toContainText("Too many failed attempts");
  await expect(page).toHaveURL(/\/login/);

  expect(
    await prisma.loginAttempt.count({ where: { identifier: acc.email, success: true } }),
  ).toBe(0);

  await wipe(acc);
});

// ------------------------------------------------------ forgotten passwords

test("resets a forgotten password from an emailed link", async ({ page }) => {
  const acc = accountFor(10);
  await wipe(acc);
  await register(page, "Layla", acc);
  const before = await countFor(acc.email, "reset");

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgotten your password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await page.getByLabel("Email").fill(acc.email);
  await page.getByRole("button", { name: "Email me a reset link" }).click();
  await expect(page).toHaveURL(/\/check-email/);

  const link = await waitForLink(acc.email, "reset", before);
  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Choose a");

  await page.getByLabel("New password").fill("a different good password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/login\?reset=1/);
  await expect(page.locator("main").getByRole("status")).toContainText("Password changed");

  // The old password is dead, the new one works.
  await logIn(page, acc.email, PASSWORD);
  await expect(page).toHaveURL(/\/login/);
  await logIn(page, acc.email, "a different good password");
  await expect(page).toHaveURL(/\/account$/);

  await wipe(acc);
});

test("a reset link works once, and signs every device out when it is used", async ({ browser }) => {
  const acc = accountFor(11);
  await wipe(acc);

  const phoneCtx = await browser.newContext();
  const pageA = await phoneCtx.newPage();
  await registerAndLogIn(pageA, "Hassan", acc);

  const laptop = await browser.newContext();
  const pageB = await laptop.newPage();
  await logIn(pageB, acc.email);
  await expect(pageB).toHaveURL(/\/account$/);
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(2);

  // The reset is asked for from a logged-out device — the real situation
  // someone is in when they have forgotten the password.
  const before = await countFor(acc.email, "reset");
  await pageB.getByRole("button", { name: "Log out", exact: true }).click();
  await pageB.goto("/forgot-password");
  await pageB.getByLabel("Email").fill(acc.email);
  await pageB.getByRole("button", { name: "Email me a reset link" }).click();

  const link = await waitForLink(acc.email, "reset", before);
  await pageB.goto(toPath(link));
  await pageB.getByLabel("New password").fill("another fine password");
  await pageB.getByRole("button", { name: "Save new password" }).click();
  await expect(pageB).toHaveURL(/\/login\?reset=1/);

  // Whoever knew the old password is out, on every device.
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(0);
  await pageA.goto("/account");
  await expect(pageA).toHaveURL(/\/login/);

  // The link cannot be used a second time.
  await pageB.goto(toPath(link));
  await expect(pageB.getByRole("heading", { level: 1 })).toContainText("expired");

  await phoneCtx.close();
  await laptop.close();
  await wipe(acc);
});

test("asking to reset an unknown address says the same thing and sends nothing", async ({
  page,
}) => {
  const unknown = accountFor(12);
  await wipe(unknown);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(unknown.email);
  await page.getByRole("button", { name: "Email me a reset link" }).click();

  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Check");
  expect(await countFor(unknown.email)).toBe(0);
});

// ------------------------------------------------------------- the account

test("edits the profile, and a new address has to be confirmed first", async ({ page }) => {
  const acc = accountFor(13);
  const moved = accountFor(14);
  await wipe(acc, moved);
  await registerAndLogIn(page, "Zaid", acc);

  await page.getByLabel("Name").fill("Zaid Ahmed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Saved.");
  expect(await prisma.user.findUniqueOrThrow({ where: { email: acc.email } })).toMatchObject({
    name: "Zaid Ahmed",
  });

  // Moving to a new address parks it until the link is opened.
  const before = await countFor(moved.email, "verify");
  await page.getByLabel("Email").fill(moved.email);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Confirm the new address");

  let user = await prisma.user.findUniqueOrThrow({ where: { email: acc.email } });
  expect(user.pendingEmail).toBe(moved.email);

  const link = await waitForLink(moved.email, "verify", before);
  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("confirmed");

  user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(user.email).toBe(moved.email);
  expect(user.pendingEmail).toBeNull();

  // Changing the address ends every session, so the new one is what logs in.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
  await logIn(page, moved.email);
  await expect(page).toHaveURL(/\/account$/);

  await wipe(acc, moved);
});

test("changes the password, signs other devices out, and requires the new one", async ({
  browser,
}) => {
  const acc = accountFor(15);
  await wipe(acc);

  const phoneCtx = await browser.newContext();
  const pageA = await phoneCtx.newPage();
  await registerAndLogIn(pageA, "Hassan", acc);

  const laptop = await browser.newContext();
  const pageB = await laptop.newPage();
  await logIn(pageB, acc.email);
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

  await logIn(pageB, acc.email, PASSWORD);
  await expect(pageB).toHaveURL(/\/login/);
  await logIn(pageB, acc.email, "a different good password");
  await expect(pageB).toHaveURL(/\/account$/);

  await phoneCtx.close();
  await laptop.close();
  await wipe(acc);
});

test("changing the phone number requires the password", async ({ page }) => {
  const acc = accountFor(16);
  const newNumber = accountFor(17);
  await wipe(acc, newNumber);
  await registerAndLogIn(page, "Layla", acc);

  await page.getByRole("button", { name: "Change number" }).click();
  await page.getByLabel("New mobile number").fill(newNumber.typed);
  await page.getByLabel("Your password").fill("not the right one");
  await page.getByRole("button", { name: "Change number" }).click();
  await expect(page.getByText("That's not your current password.")).toBeVisible();

  let user = await prisma.user.findUniqueOrThrow({ where: { email: acc.email } });
  expect(user.phone).toBe(acc.e164);

  await page.getByLabel("Your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Change number" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("number has been updated");

  user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(user.phone).toBe(newNumber.e164);

  await wipe(acc, newNumber);
});

test("log out of all devices ends every session", async ({ browser }) => {
  const acc = accountFor(18);
  await wipe(acc);

  const phoneCtx = await browser.newContext();
  const pageA = await phoneCtx.newPage();
  await registerAndLogIn(pageA, "Bilal", acc);

  const laptop = await browser.newContext();
  const pageB = await laptop.newPage();
  await logIn(pageB, acc.email);
  await expect(pageB).toHaveURL(/\/account$/);
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(2);

  await pageA.getByRole("button", { name: "Log out of all devices" }).click();
  await expect(pageA).toHaveURL(/\/login\?signedOut=all/);

  await pageB.goto("/account");
  await expect(pageB).toHaveURL(/\/login/);
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(0);

  await phoneCtx.close();
  await laptop.close();
  await wipe(acc);
});

test("keeps customers out of the manager area and lets the owner in", async ({ page }) => {
  const acc = accountFor(19);
  await wipe(acc);
  await registerAndLogIn(page, "Customer", acc);

  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);

  await prisma.user.update({ where: { email: acc.email }, data: { role: "OWNER" } });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("phase 5");

  await wipe(acc);
});

test("never redirects off-site after login", async ({ page }) => {
  const acc = accountFor(20);
  await wipe(acc);
  await register(page, "Nadia", acc);

  await logIn(page, acc.email, PASSWORD, "//evil.example/steal");
  await expect(page).toHaveURL(/localhost|127\.0\.0\.1/);
  await expect(page).toHaveURL(/\/account$/);

  await wipe(acc);
});

test("the homepage offers log in and sign up, then shows the account", async ({
  page,
  isMobile,
}) => {
  const acc = accountFor(21);
  await wipe(acc);

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

  await registerAndLogIn(page, "Yusuf Ali", acc);
  await page.goto("/");
  if (isMobile) {
    await page.getByLabel("Open menu").click();
    await expect(page.locator("#drawer").getByRole("link", { name: "My account" })).toBeVisible();
  } else {
    await expect(page.locator("#nav").getByRole("link", { name: /Yusuf/ })).toBeVisible();
    await expect(page.locator("#nav").getByRole("link", { name: "Log in" })).toHaveCount(0);
  }

  await wipe(acc);
});

/** The unsubscribe signature, computed the way the server does. */
function signUnsubscribe(userId: string): string {
  const secret = readFileSync(".env", "utf8").match(/^AUTH_SECRET="?([^"\n]+)"?/m)?.[1];
  if (!secret) throw new Error("AUTH_SECRET not found in .env");
  return createHmac("sha256", secret).update(`unsubscribe:v1\u0000${userId}`).digest("hex");
}

// ------------------------------------------------- age and unsubscribing

test("will not open an account without confirming an age", async ({ page }) => {
  const acc = accountFor(30);
  await wipe(acc);

  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Too Young");
  await page.getByLabel("Email", { exact: true }).fill(acc.email);
  await page.getByLabel("Mobile number").fill(acc.typed);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  // The age box is deliberately left unticked.
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.locator("main")).toContainText("18 or older");
  await expect(page).toHaveURL(/\/signup/);
  expect(await prisma.user.count({ where: { email: acc.email } })).toBe(0);

  await wipe(acc);
});

test("turns marketing email off from a link, with nobody signed in", async ({ page, context }) => {
  const acc = accountFor(31);
  await wipe(acc);
  await registerAndLogIn(page, "Opted In", acc);

  // Opt in the way the account page would.
  await prisma.user.update({ where: { email: acc.email }, data: { marketingOptIn: true } });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: acc.email } });

  // Signed here rather than imported: the module is server-only, and a test
  // that recomputes the signature independently is a better check anyway.
  await context.clearCookies();
  await page.goto(`/api/unsubscribe?u=${user.id}&s=${signUnsubscribe(user.id)}`);
  await expect(page.locator("main")).toContainText("off the list");

  const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(after.marketingOptIn).toBe(false);

  await wipe(acc);
});

test("ignores an unsubscribe link signed for somebody else", async ({ page }) => {
  const acc = accountFor(32);
  await wipe(acc);
  await registerAndLogIn(page, "Still Subscribed", acc);
  await prisma.user.update({ where: { email: acc.email }, data: { marketingOptIn: true } });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: acc.email } });

  const wrong = signUnsubscribe("usr_someone_else");
  await page.goto(`/api/unsubscribe?u=${user.id}&s=${wrong}`);

  // The page sets a typographic apostrophe, so match on the half that has none.
  await expect(page.locator("main")).toContainText("That link");
  const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(after.marketingOptIn).toBe(true);

  await wipe(acc);
});
