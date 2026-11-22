import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { countFor, toPath, waitForLink } from "./outbox";

/**
 * Joining the promotions list, proving the address, and getting back off it.
 *
 * This is the only thing the site asks a customer for, so it is tested the way
 * a customer meets it: from the homepage form, through the real email, to the
 * real link. The checks that matter are not that the row appears — it is that
 * nothing is sent to an address nobody proved, that a ticked box leaves
 * evidence, and that the way out works for somebody with no account and no
 * session.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

// Each Playwright project gets its own slot range so desktop and mobile can
// run at once without fighting over an address.
const AREA = { desktop: "201", mobile: "973" } as const;

type Joiner = { typed: string; e164: string; email: string };

function joinerFor(slot: number): Joiner {
  const area = AREA[test.info().project.name as keyof typeof AREA] ?? "908";
  const last = String(slot).padStart(2, "0");
  return {
    typed: `(${area}) 555-02${last}`,
    e164: `+1${area}55502${last}`,
    email: `list-${area}-${last}@example.test`,
  };
}

async function wipe(...joiners: Joiner[]) {
  await prisma.subscriber.deleteMany({ where: { email: { in: joiners.map((j) => j.email) } } });
}

async function fillJoinForm(page: Page, joiner: Joiner, options: { phone?: boolean; sms?: boolean } = {}) {
  await page.goto("/#deals");
  await page.getByLabel("Email", { exact: true }).fill(joiner.email);
  if (options.phone || options.sms) {
    await page.getByLabel(/Mobile number/).fill(joiner.typed);
  }
  if (options.sms) {
    await page.getByRole("checkbox").check();
  }
  await page.getByRole("button", { name: "Send me the deals" }).click();
  // Wait for the form to have actually finished. Without this a test races
  // ahead and reads the database before the action has written to it.
  await expect(page.getByRole("status")).toContainText("Check your email");
}

/** The unsubscribe signature, computed the way the server does. */
function signUnsubscribe(subscriberId: string): string {
  const secret = readFileSync(".env", "utf8").match(/^AUTH_SECRET="?([^"\n]+)"?/m)?.[1];
  if (!secret) throw new Error("AUTH_SECRET not found in .env");
  return createHmac("sha256", secret).update(`unsubscribe:v1\u0000${subscriberId}`).digest("hex");
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// -------------------------------------------------------------- joining

test("joining takes an address and nothing else", async ({ page }) => {
  const joiner = joinerFor(1);
  await wipe(joiner);
  const before = await countFor(joiner.email, "list-confirm");

  await fillJoinForm(page, joiner);

  const row = await prisma.subscriber.findUniqueOrThrow({
    where: { email: joiner.email },
    include: { consents: true },
  });
  // On the list, but unproved — and no number, because none was asked for.
  expect(row.emailConfirmedAt).toBeNull();
  expect(row.phone).toBeNull();
  expect(row.smsConsentAt).toBeNull();

  // One consent row, for email only, carrying the evidence a boolean cannot.
  expect(row.consents).toHaveLength(1);
  const [consent] = row.consents;
  expect(consent).toMatchObject({
    channel: "EMAIL",
    action: "GRANTED",
    target: joiner.email,
    source: "join-form",
  });
  expect(consent!.disclosureVersion).toMatch(/^\d{4}-\d{2}-email-v\d+$/);
  // The IP is kept in clear here, unlike every login IP, because a hash
  // proves nothing to the person who has to judge whether this was real.
  expect(consent!.ip).toBeTruthy();
  expect(consent!.ip).not.toMatch(/^[0-9a-f]{64}$/);
  expect(consent!.userAgent).toContain("Mozilla");

  // Exactly one email, and it is the confirmation.
  const link = await waitForLink(joiner.email, "list-confirm", before);
  expect(await countFor(joiner.email)).toBe(before + 1);

  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("on the list");

  const confirmed = await prisma.subscriber.findUniqueOrThrow({
    where: { email: joiner.email },
    include: { consents: { orderBy: { createdAt: "asc" } } },
  });
  expect(confirmed.emailConfirmedAt).not.toBeNull();
  expect(confirmed.consents.map((c) => c.action)).toEqual(["GRANTED", "CONFIRMED"]);

  await wipe(joiner);
});

test("records the texts tick as its own permission, with its own wording", async ({ page }) => {
  const joiner = joinerFor(2);
  await wipe(joiner);

  await fillJoinForm(page, joiner, { sms: true });

  const row = await prisma.subscriber.findUniqueOrThrow({
    where: { email: joiner.email },
    include: { consents: true },
  });
  expect(row.phone).toBe(joiner.e164);
  expect(row.smsConsentAt).not.toBeNull();
  // Agreed to, and still not textable: nothing has proved the handset.
  expect(row.smsConfirmedAt).toBeNull();

  const sms = row.consents.find((c) => c.channel === "SMS");
  expect(sms).toBeTruthy();
  expect(sms!.target).toBe(joiner.e164);
  expect(sms!.disclosureVersion).toMatch(/^\d{4}-\d{2}-sms-v\d+$/);
  // Separate rows, separate wording: one tick cannot stand for both channels.
  const email = row.consents.find((c) => c.channel === "EMAIL");
  expect(email!.disclosureVersion).not.toBe(sms!.disclosureVersion);

  await wipe(joiner);
});

test("will not take a texts tick with no number, and keeps what was typed", async ({ page }) => {
  const joiner = joinerFor(3);
  await wipe(joiner);

  await page.goto("/#deals");
  await page.getByLabel("Email", { exact: true }).fill(joiner.email);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send me the deals" }).click();

  await expect(page.locator("form").getByRole("alert")).toContainText("mobile number");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(joiner.email);
  // Nothing was written, and nothing was sent.
  expect(await prisma.subscriber.count({ where: { email: joiner.email } })).toBe(0);
  expect(await countFor(joiner.email)).toBe(0);
});

test("shows the full SMS disclosure on the box itself", async ({ page }) => {
  await page.goto("/#deals");
  const label = page.getByRole("checkbox").locator("xpath=ancestor::label");
  // Every clause a court looks for, attached to the thing that was ticked
  // rather than in small print somewhere else on the page.
  await expect(label).toContainText("Shahzad");
  await expect(label).toContainText("Recurring automated marketing texts");
  await expect(label).toContainText("not a condition of any purchase");
  await expect(label).toContainText("Message and data rates may apply");
  await expect(label).toContainText("Reply STOP to stop");
});

test("a confirmation link works once, then says so", async ({ page }) => {
  const joiner = joinerFor(4);
  await wipe(joiner);
  const before = await countFor(joiner.email, "list-confirm");

  await fillJoinForm(page, joiner);
  const link = await waitForLink(joiner.email, "list-confirm", before);

  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("on the list");

  // A second visit is not an error — they are on the list, which is what they
  // wanted to know. One CONFIRMED row, though, not two.
  await page.goto(toPath(link));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("on the list");
  expect(
    await prisma.consentEvent.count({
      where: { subscriber: { email: joiner.email }, action: "CONFIRMED" },
    }),
  ).toBe(1);

  await wipe(joiner);
});

test("a made-up token confirms nothing", async ({ page }) => {
  await page.goto(`/join/confirm?token=${"f".repeat(64)}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("expired");
  await page.goto("/join/confirm");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("expired");
});

// --------------------------------------------------------- getting out

test("one click leaves the list, with nobody signed in", async ({ page, context }) => {
  const joiner = joinerFor(5);
  await wipe(joiner);
  const before = await countFor(joiner.email, "list-confirm");
  await fillJoinForm(page, joiner);
  const link = await waitForLink(joiner.email, "list-confirm", before);
  await page.goto(toPath(link));

  const row = await prisma.subscriber.findUniqueOrThrow({ where: { email: joiner.email } });

  // Signed here rather than imported: the module is server-only, and a test
  // that recomputes the signature independently is a better check anyway.
  await context.clearCookies();
  await page.goto(`/api/unsubscribe?u=${row.id}&s=${signUnsubscribe(row.id)}`);
  await expect(page.locator("main")).toContainText("off the list");

  const after = await prisma.subscriber.findUniqueOrThrow({
    where: { id: row.id },
    include: { consents: { orderBy: { createdAt: "asc" } } },
  });
  expect(after.emailStoppedAt).not.toBeNull();
  // Stopped, not deleted: a deleted row is one the next import can re-add.
  expect(after.consents.at(-1)).toMatchObject({
    channel: "EMAIL",
    action: "WITHDRAWN",
    source: "unsubscribe-link",
  });

  await wipe(joiner);
});

test("ignores an unsubscribe link signed for somebody else", async ({ page }) => {
  const joiner = joinerFor(6);
  await wipe(joiner);
  await fillJoinForm(page, joiner);
  const row = await prisma.subscriber.findUniqueOrThrow({ where: { email: joiner.email } });

  await page.goto(`/api/unsubscribe?u=${row.id}&s=${signUnsubscribe("sub_someone_else")}`);

  // The page uses a typographic apostrophe, so match the half that has none.
  await expect(page.locator("main")).toContainText("That link");
  const after = await prisma.subscriber.findUniqueOrThrow({ where: { id: row.id } });
  expect(after.emailStoppedAt).toBeNull();

  await wipe(joiner);
});

test("a mail client's one-click POST is accepted and answers nothing", async ({ page }) => {
  const joiner = joinerFor(7);
  await wipe(joiner);
  await fillJoinForm(page, joiner);
  const row = await prisma.subscriber.findUniqueOrThrow({ where: { email: joiner.email } });

  // RFC 8058: the very same URL has to take a POST, and Gmail renders no body.
  const response = await page.request.post(
    `/api/unsubscribe?u=${row.id}&s=${signUnsubscribe(row.id)}`,
  );
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("");

  const after = await prisma.subscriber.findUniqueOrThrow({ where: { id: row.id } });
  expect(after.emailStoppedAt).not.toBeNull();

  await wipe(joiner);
});

// ------------------------------------------------------- the ledger itself

test("the consent ledger cannot be rewritten, only added to", async ({ page }) => {
  const joiner = joinerFor(8);
  await wipe(joiner);
  await fillJoinForm(page, joiner);
  const row = await prisma.consentEvent.findFirstOrThrow({
    where: { subscriber: { email: joiner.email } },
  });

  // The database refuses it, not the application: an append-only table that
  // only the application protects is append-only until the next script.
  await expect(
    prisma.consentEvent.update({ where: { id: row.id }, data: { source: "counter" } }),
  ).rejects.toThrow(/append-only/);

  const unchanged = await prisma.consentEvent.findUniqueOrThrow({ where: { id: row.id } });
  expect(unchanged.source).toBe("join-form");

  await wipe(joiner);
});
