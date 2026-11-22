import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { countFor, toPath, waitForLink } from "./outbox";

/**
 * Log in, prove an address, reset a forgotten password — end to end, following
 * the actual links out of the actual emails (read from the development
 * outbox).
 *
 * There is no sign-up form to test any more. Ordering belongs to the delivery
 * platform, so a customer has nothing to have an account for, and the only
 * people who sign in are the ones who run the shop. Their accounts are made by
 * the seed or by invitation, which is what these tests do directly: creating a
 * row is the real path now, so a test that posted a form would be testing
 * something no longer there.
 *
 * A successful login lands on /admin, which opens only for a MANAGER or an
 * OWNER. A signed-in CUSTOMER gets the same 404 a stranger gets, because the
 * manager area does not advertise that it exists.
 *
 * Every test owns one phone number in the fictional 555-01xx block and one
 * address at example.test, per project, and wipes both before and after, so
 * runs are repeatable and never trip a lockout.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

/**
 * Every test in this suite comes from 127.0.0.1, and the login limiter freezes
 * an IP after MAX_FAILURES_PER_IP failures in its window. The suite tests
 * wrong-password paths on purpose, so those failures pile up and eventually
 * lock out whichever file happens to run next — which reads as flakiness and
 * is really the limiter working correctly against a shared address.
 *
 * Clearing the ledger before each file keeps the limiter's own tests honest
 * (they create their own failures) without letting one file poison the next.
 */
test.beforeAll(async () => {
  await prisma.loginAttempt.deleteMany({});
});


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

/**
 * Creates an account the way the shop actually gets one: a row, with a hashed
 * password, made by somebody who already had access. `verified` false models
 * an invitation whose address has not been proved yet.
 */
async function createAccount(
  name: string,
  account: Account,
  options: { verified?: boolean; role?: "CUSTOMER" | "MANAGER" | "OWNER"; password?: string } = {},
) {
  const { verified = true, role = "CUSTOMER", password = PASSWORD } = options;
  await prisma.user.create({
    data: {
      name,
      email: account.email,
      phone: account.e164,
      passwordHash: await hashPassword(password),
      emailVerifiedAt: verified ? new Date() : null,
      role,
    },
  });
}

/** Asks for a fresh verification link, the way the check-email screen does. */
async function askForVerificationLink(page: Page, account: Account) {
  await page.goto(`/check-email?to=${encodeURIComponent(account.email)}&for=verify`);
  await page.getByRole("button", { name: "Send the link again" }).click();
}

async function logIn(page: Page, identifier: string, password = PASSWORD, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Email or mobile number").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await settled(page, "/login");
}

/**
 * The state most tests start from: Shahzad, signed in. It is the only
 * signed-in state this site has — a CUSTOMER can hold a session but has
 * nowhere to land, so anything that needs to see a page needs the role too.
 */
async function signInAsOwner(page: Page, name: string, account: Account) {
  await createAccount(name, account, { role: "OWNER" });
  await logIn(page, account.email);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// -------------------------------------------------------- proving an address


test("an account whose address is unproved cannot log in, right password or not", async ({
  page,
}) => {
  const acc = accountFor(2);
  await wipe(acc);
  // An invitation sent to an address nobody has opened yet.
  await createAccount("Omar", acc, { verified: false, role: "OWNER" });
  const sentBefore = await countFor(acc.email, "verify");

  await logIn(page, acc.email);

  // Sent back to the confirm screen, not into the manager area.
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText(/password was right/)).toBeVisible();
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(0);
  // Logging in does not fire off another email: the link already sent still
  // stands, and the screen carries a resend button that says its own cooldown.
  expect(await countFor(acc.email, "verify")).toBe(sentBefore);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);

  await wipe(acc);
});

test("a verification link only works once", async ({ page }) => {
  const acc = accountFor(3);
  await wipe(acc);
  await createAccount("Sam", acc, { verified: false, role: "MANAGER" });
  const before = await countFor(acc.email, "verify");
  await askForVerificationLink(page, acc);

  const link = await waitForLink(acc.email, "verify", before);
  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("confirmed");

  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("expired");

  await wipe(acc);
});



// --------------------------------------------------------- logging back in

test("logs out and back in, with either the address or the number", async ({ page }) => {
  const acc = accountFor(6);
  await wipe(acc);
  await signInAsOwner(page, "Omar", acc);

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(await prisma.session.count({ where: { user: { email: acc.email } } })).toBe(0);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);

  // The mobile number still works as a login name.
  await logIn(page, acc.typed, PASSWORD, "/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Signed in as Omar")).toBeVisible();

  await wipe(acc);
});

test("refuses the wrong password without saying whether the account exists", async ({ page }) => {
  const known = accountFor(7);
  const unknown = accountFor(8);
  await wipe(known, unknown);
  await createAccount("Sam", known, { role: "OWNER" });

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
  await createAccount("Target", acc, { role: "OWNER" });

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
  await createAccount("Layla", acc, { role: "OWNER" });
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
  await expect(page).toHaveURL(/\/admin$/);

  await wipe(acc);
});

test("a reset link works once, and signs every device out when it is used", async ({ browser }) => {
  const acc = accountFor(11);
  await wipe(acc);

  const phoneCtx = await browser.newContext();
  const pageA = await phoneCtx.newPage();
  await signInAsOwner(pageA, "Hassan", acc);

  const laptop = await browser.newContext();
  const pageB = await laptop.newPage();
  await logIn(pageB, acc.email);
  await expect(pageB).toHaveURL(/\/admin$/);
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
  await pageA.goto("/admin");
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

// ------------------------------------------------------- the manager area

test("keeps customers out of the manager area and lets the owner in", async ({ page }) => {
  const acc = accountFor(19);
  await wipe(acc);
  await createAccount("Customer", acc);
  await logIn(page, acc.email);

  // Signed in, and still a stranger here. A 404 rather than a 403: a 403 would
  // confirm there is something to find.
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);
  await expect(page.getByText(/Signed in as/)).toHaveCount(0);

  await prisma.user.update({ where: { email: acc.email }, data: { role: "OWNER" } });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The menu");
  await expect(page.getByRole("button", { name: "Log out", exact: true })).toBeVisible();

  await wipe(acc);
});

test("never redirects off-site after login", async ({ page }) => {
  const acc = accountFor(20);
  await wipe(acc);
  await createAccount("Nadia", acc, { role: "OWNER" });

  await logIn(page, acc.email, PASSWORD, "//evil.example/steal");
  await expect(page).toHaveURL(/localhost|127\.0\.0\.1/);
  await expect(page).toHaveURL(/\/admin$/);

  await wipe(acc);
});
