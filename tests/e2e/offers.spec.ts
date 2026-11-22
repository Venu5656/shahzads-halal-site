import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { countFor, toPath, waitForLinks } from "./outbox";

/**
 * Writing an offer and sending it to the list.
 *
 * The things worth proving are not that an email goes out. They are that it
 * goes out once, that it does not go to somebody who left, and that a send
 * interrupted halfway can be picked up without mailing the first half again —
 * because the cost of getting any of those wrong is paid by several hundred
 * people at once, and cannot be taken back.
 */

const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

const PASSWORD = "a good enough password";

const WHO = {
  desktop: { email: "offers-201@example.test", phone: "+12015550401", tag: "o201" },
  mobile: { email: "offers-973@example.test", phone: "+19735550401", tag: "o973" },
} as const;

function who() {
  return WHO[test.info().project.name as keyof typeof WHO] ?? WHO.desktop;
}

/** Subscriber addresses this project owns, so the two projects never overlap. */
function listEmail(n: number) {
  return `sub-${who().tag}-${n}@example.test`;
}

async function wipeList() {
  await prisma.subscriber.deleteMany({
    where: { email: { startsWith: `sub-${who().tag}-` } },
  });
}

/** Puts `count` confirmed people on the list, bypassing the form. */
async function seedList(count: number) {
  await wipeList();
  for (let i = 0; i < count; i++) {
    await prisma.subscriber.create({
      data: { email: listEmail(i), emailConfirmedAt: new Date() },
    });
  }
}

/**
 * Removes this project's owner and every offer the tests made.
 *
 * By author AND by subject: some of these tests create an offer straight in
 * the database, to reach a state the form cannot produce, and those rows have
 * no author to be found by. An earlier version cleaned only the first kind and
 * quietly filled the development database with half-sent offers.
 */
async function wipeOwner() {
  const { email, phone } = who();
  await prisma.offer.deleteMany({
    where: {
      OR: [
        { createdBy: { email } },
        { subject: { startsWith: "Mid-flight " } },
        { subject: { startsWith: "Interrupted " } },
        { subject: { startsWith: "Fries " } },
        { subject: { startsWith: "Own link " } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { OR: [{ email }, { phone }] } });
}

async function signIn(page: Page) {
  const { email, phone } = who();
  await wipeOwner();
  await prisma.user.create({
    data: {
      name: "Shahzad",
      email,
      phone,
      passwordHash: await hashPassword(PASSWORD),
      emailVerifiedAt: new Date(),
      role: "OWNER",
    },
  });
  await page.goto("/login");
  await page.getByLabel("Email or mobile number").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(/\/admin$/);
}

async function compose(page: Page, subject: string) {
  await page.goto("/admin/offers/new");
  await page.getByLabel("Subject").fill(subject);
  await page.getByLabel("Heading").fill("Free fries this week");
  await page
    .getByLabel("The offer")
    .fill("Order any platter before Sunday and the fries are on us.\n\nNothing to show — it's already on.");
}

test.afterAll(async () => {
  await wipeList();
  await wipeOwner();
  await prisma.$disconnect();
});

test("shows how many people there are to send to", async ({ page }) => {
  await seedList(3);
  await signIn(page);

  await page.goto("/admin/offers");
  // The count is the one number here that changes what he should do.
  await expect(page.locator("main")).toContainText("confirmed an address");
  const shown = await prisma.subscriber.count({
    where: { emailConfirmedAt: { not: null }, emailStoppedAt: null },
  });
  await expect(page.locator("main")).toContainText(String(shown));
});

test("sends a test to himself and to nobody else", async ({ page }) => {
  await seedList(2);
  await signIn(page);
  const { email } = who();
  const before = await countFor(email, "marketing");
  const toList = await countFor(listEmail(0));

  await compose(page, "A test run");
  await page.getByRole("button", { name: /Send one to me/ }).click();
  await expect(page.getByRole("status")).toContainText(email);

  // One copy, to him, marked as a test — and nothing to the list.
  expect(await countFor(email, "marketing")).toBe(before + 1);
  expect(await countFor(listEmail(0))).toBe(toList);
  // Nothing is recorded: a test is not a send.
  expect(await prisma.offer.count({ where: { subject: "A test run" } })).toBe(0);
});

test("will not send without the word typed in", async ({ page }) => {
  await seedList(2);
  await signIn(page);

  await compose(page, "Not going anywhere");
  // The button is disabled until SEND is typed, so there is nothing to press.
  await expect(page.getByRole("button", { name: "Send it" })).toBeDisabled();
  await page.getByLabel(/Type/).fill("send me");
  await expect(page.getByRole("button", { name: "Send it" })).toBeDisabled();

  expect(await prisma.offer.count({ where: { subject: "Not going anywhere" } })).toBe(0);
});

test("sends it to everyone on the list, once each", async ({ page }) => {
  await seedList(3);
  await signIn(page);
  const subject = `Fries ${Date.now()}`;
  const before = await Promise.all([0, 1, 2].map((n) => countFor(listEmail(n), "marketing")));

  await compose(page, subject);
  await page.getByLabel(/Type/).fill("SEND");
  await page.getByRole("button", { name: "Send it" }).click();

  await expect(page).toHaveURL(/\/admin\/offers\/[a-z0-9]+$/);
  await expect(page.locator("main")).toContainText("Sent");

  const offer = await prisma.offer.findFirstOrThrow({ where: { subject } });
  expect(offer.status).toBe("SENT");
  // Paragraphs, as typed, stored as text and not as markup.
  expect(offer.body).toHaveLength(2);

  const sends = await prisma.offerSend.findMany({ where: { offerId: offer.id } });
  expect(sends).toHaveLength(3);
  expect(sends.every((s) => s.status === "SENT")).toBe(true);

  // Exactly one more email each — not two, not none.
  for (const n of [0, 1, 2]) {
    expect(await countFor(listEmail(n), "marketing")).toBe(before[n]! + 1);
  }
});

test("gives each person their own unsubscribe link", async ({ page }) => {
  await seedList(2);
  await signIn(page);
  const subject = `Own link ${Date.now()}`;
  const before = await countFor(listEmail(0), "marketing");

  await compose(page, subject);
  await page.getByLabel(/Type/).fill("SEND");
  await page.getByRole("button", { name: "Send it" }).click();
  await expect(page).toHaveURL(/\/admin\/offers\/[a-z0-9]+$/);

  // A shared link would take the wrong person off the list, which is the kind
  // of bug nobody reports — they just stop getting email and never say why.
  const links = await waitForLinks(listEmail(0), "marketing", before);
  const link = links.find((l) => l.includes("/api/unsubscribe"));
  expect(link, "the offer carried no unsubscribe link").toBeTruthy();
  const theirs = await prisma.subscriber.findUniqueOrThrow({ where: { email: listEmail(0) } });
  expect(new URL(link!).searchParams.get("u")).toBe(theirs.id);

  // And it works, with nobody signed in.
  const anon = await page.context().browser()!.newContext();
  const visitor = await anon.newPage();
  await visitor.goto(toPath(link!));
  await expect(visitor.locator("main")).toContainText("off the list");
  await anon.close();

  const after = await prisma.subscriber.findUniqueOrThrow({ where: { id: theirs.id } });
  expect(after.emailStoppedAt).not.toBeNull();
});

test("skips somebody who unsubscribed while the send was in flight", async ({ page }) => {
  // The race that actually happens on a list worth having: the audience is
  // frozen when Send is pressed, and somebody leaves before their email goes
  // out. Driven through the database rather than the form, because a list of
  // four finishes in a single batch and leaves no gap to leave during.
  await seedList(4);
  await signIn(page);

  const people = await prisma.subscriber.findMany({
    where: { email: { startsWith: `sub-${who().tag}-` } },
    orderBy: { email: "asc" },
  });
  const offer = await prisma.offer.create({
    data: {
      subject: `Mid-flight ${Date.now()}`,
      heading: "Free fries",
      body: ["The fries are on us."],
      buttonLabel: "See the menu",
      url: "/menu",
      status: "SENDING",
      startedAt: new Date(),
      createdByName: "Shahzad",
    },
  });
  await prisma.offerSend.createMany({
    data: people.map((p) => ({ offerId: offer.id, subscriberId: p.id, email: p.email })),
  });

  const leaver = people[0]!;
  await prisma.subscriber.update({
    where: { id: leaver.id },
    data: { emailStoppedAt: new Date() },
  });
  const beforeLeaver = await countFor(leaver.email, "marketing");

  // Nudge it from the UI, the way he would.
  await page.goto(`/admin/offers/${offer.id}`);
  await page.getByRole("button", { name: /Send the next batch now/ }).click();
  // The counts on the page are the feedback, and they are read from the rows.
  await expect(page.getByRole("button", { name: /Send the next batch now/ })).toHaveCount(0);

  // They got nothing, and the row says why rather than vanishing — so the
  // counts still add up and somebody can see what happened.
  expect(await countFor(leaver.email, "marketing")).toBe(beforeLeaver);
  const row = await prisma.offerSend.findFirstOrThrow({
    where: { offerId: offer.id, subscriberId: leaver.id },
  });
  expect(row.status).toBe("FAILED");
  expect(row.error).toMatch(/Unsubscribed/);

  // Everybody else got it.
  expect(
    await prisma.offerSend.count({ where: { offerId: offer.id, status: "SENT" } }),
  ).toBe(people.length - 1);
});

test("a half-finished send resumes without sending anybody twice", async ({ page }) => {
  await seedList(3);
  await signIn(page);

  const people = await prisma.subscriber.findMany({
    where: { email: { startsWith: `sub-${who().tag}-` } },
    orderBy: { email: "asc" },
  });
  const offer = await prisma.offer.create({
    data: {
      subject: `Interrupted ${Date.now()}`,
      heading: "Free fries",
      body: ["The fries are on us."],
      buttonLabel: "See the menu",
      url: "/menu",
      status: "SENDING",
      startedAt: new Date(),
      createdByName: "Shahzad",
    },
  });
  await prisma.offerSend.createMany({
    data: people.map((p) => ({ offerId: offer.id, subscriberId: p.id, email: p.email })),
  });

  // One of them already had it — the state a send killed halfway leaves.
  const done = people[0]!;
  await prisma.offerSend.updateMany({
    where: { offerId: offer.id, subscriberId: done.id },
    data: { status: "SENT", sentAt: new Date() },
  });
  const alreadyHad = await countFor(done.email, "marketing");

  await page.goto(`/admin/offers/${offer.id}`);
  await page.getByRole("button", { name: /Send the next batch now/ }).click();
  // Nothing left to send, so the button goes away.
  await expect(page.getByRole("button", { name: /Send the next batch now/ })).toHaveCount(0);

  // No second copy for the one who already had it.
  expect(await countFor(done.email, "marketing")).toBe(alreadyHad);
  const sends = await prisma.offerSend.findMany({ where: { offerId: offer.id } });
  expect(sends.every((s) => s.status === "SENT")).toBe(true);
  expect(await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } })).toMatchObject({
    status: "SENT",
  });
});

test("the cron route refuses anybody without the secret", async ({ page }) => {
  // A 404 rather than a 401: an endpoint that says "wrong password" is an
  // endpoint somebody now knows exists.
  const bare = await page.request.get("/api/cron/offers");
  expect(bare.status()).toBe(404);

  const wrong = await page.request.get("/api/cron/offers", {
    headers: { authorization: "Bearer not-the-secret" },
  });
  expect(wrong.status()).toBe(404);
});

test("a customer cannot write or send one", async ({ page }) => {
  const email = `offers-cust-${who().tag}@example.test`;
  await prisma.user.deleteMany({ where: { email } });
  await prisma.user.create({
    data: {
      name: "Not Staff",
      email,
      phone: who().phone.replace(/\d{2}$/, "88"),
      passwordHash: await hashPassword(PASSWORD),
      emailVerifiedAt: new Date(),
      role: "CUSTOMER",
    },
  });

  try {
    await page.goto("/login");
    await page.getByLabel("Email or mobile number").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(/\/admin$/);

    for (const path of ["/admin/offers", "/admin/offers/new"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    }
  } finally {
    await prisma.user.deleteMany({ where: { email } });
  }
});
