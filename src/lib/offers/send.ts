import "server-only";
import { prisma } from "@/lib/db";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";
import { absoluteUrl, sendMail } from "@/lib/email/mailer";
import { marketingEmail } from "@/lib/email/templates";
import { unsubscribeUrl } from "@/lib/email/unsubscribe";
import { sendableWhere } from "@/lib/subscribers/list";
import type { OfferInput } from "./compose";

/**
 * Sending an offer to the list.
 *
 * The shape here is a queue, not a loop, and that is the whole design. When a
 * send starts, every recipient gets a row in one transaction — then the actual
 * sending works through those rows. A process that dies halfway leaves the
 * database saying exactly who has had it and who has not, so picking it up
 * again cannot send anybody a second copy. A loop over an array in memory can
 * say neither of those things once it stops, and the failure mode of getting
 * it wrong is mailing four hundred people twice.
 *
 * It also means the audience is frozen at the moment Send is pressed. Somebody
 * who joins a minute later is not in this send; somebody who unsubscribes a
 * minute later is skipped when their row comes up, because the check is made
 * again at the last moment before the email goes.
 */

/**
 * How many go out per pass.
 *
 * Deliberately modest. Resend's limit is a couple of requests a second, and a
 * serverless function has a ceiling on how long it may run — so a pass that
 * tried to do everything would be killed partway through on any list worth
 * having. Small passes, resumed, finish; one big pass does not.
 */
export const BATCH_SIZE = 40;

/** Who would get it if it went now. */
export async function audienceSize(): Promise<number> {
  return prisma.subscriber.count({ where: sendableWhere("EMAIL") });
}

export type StartResult =
  | { ok: true; offerId: string; recipients: number }
  | { ok: false; error: string };

/**
 * Freezes the audience and marks the offer as sending.
 *
 * Does not send anything itself: that is `deliverBatch`, called repeatedly
 * until there is nothing left. Separating them is what makes the send
 * survivable — this part is one short transaction that either happened or did
 * not, and the long part can be interrupted as often as it likes.
 */
export async function startSend(input: OfferInput): Promise<StartResult> {
  const user = await requireRole(STAFF_ROLES);

  const recipients = await prisma.subscriber.findMany({
    where: sendableWhere("EMAIL"),
    select: { id: true, email: true },
  });
  if (!recipients.length) {
    return { ok: false, error: "Nobody has confirmed an address yet, so there is nobody to send to." };
  }

  const offer = await prisma.$transaction(async (tx) => {
    const created = await tx.offer.create({
      data: {
        ...input,
        status: "SENDING",
        startedAt: new Date(),
        createdById: user.id,
        createdByName: user.name,
      },
    });
    await tx.offerSend.createMany({
      data: recipients.map((r) => ({
        offerId: created.id,
        subscriberId: r.id,
        email: r.email,
      })),
    });
    return created;
  });

  return { ok: true, offerId: offer.id, recipients: recipients.length };
}

export type BatchResult = { sent: number; failed: number; remaining: number };

/**
 * Sends the next batch of one offer, and reports what is left.
 *
 * Every row is re-checked against the subscriber's current state immediately
 * before the email goes. An unsubscribe that arrives while a send is in flight
 * has to be honoured — it is the single most important thing a sender can get
 * right, and "the send had already started" is not a defence anybody has won
 * with. Such a row is marked FAILED with a reason rather than silently
 * dropped, so the count still adds up.
 */
export async function deliverBatch(offerId: string): Promise<BatchResult> {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.status !== "SENDING") return { sent: 0, failed: 0, remaining: 0 };

  const pending = await prisma.offerSend.findMany({
    where: { offerId, status: "PENDING" },
    take: BATCH_SIZE,
    orderBy: { id: "asc" },
    include: { subscriber: true },
  });

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    const stopped = row.subscriber.emailStoppedAt !== null;
    const unconfirmed = row.subscriber.emailConfirmedAt === null;
    if (stopped || unconfirmed) {
      await prisma.offerSend.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          error: stopped ? "Unsubscribed before this went out" : "Address never confirmed",
        },
      });
      failed += 1;
      continue;
    }

    // The link is per subscriber, and the template puts the same one in the
    // List-Unsubscribe header. A shared link would take the wrong person off.
    const result = await sendMail(
      marketingEmail({
        to: row.email,
        subject: offer.subject,
        heading: offer.heading,
        body: offer.body,
        buttonLabel: offer.buttonLabel,
        url: offer.url.startsWith("/") ? absoluteUrl(offer.url) : offer.url,
        unsubscribeUrl: unsubscribeUrl(row.subscriberId),
      }),
    );

    await prisma.offerSend.update({
      where: { id: row.id },
      data: result.ok
        ? { status: "SENT", sentAt: new Date(), error: null }
        : { status: "FAILED", error: result.error.slice(0, 500) },
    });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  const remaining = await prisma.offerSend.count({ where: { offerId, status: "PENDING" } });
  if (remaining === 0) {
    const anyFailed = await prisma.offerSend.count({ where: { offerId, status: "FAILED" } });
    await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: anyFailed > 0 ? "SENT_WITH_FAILURES" : "SENT",
        finishedAt: new Date(),
      },
    });
  }

  return { sent, failed, remaining };
}

/** Every offer still mid-flight, oldest first. What the cron picks up. */
export async function unfinishedOffers(): Promise<string[]> {
  const rows = await prisma.offer.findMany({
    where: { status: "SENDING" },
    orderBy: { startedAt: "asc" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** One offer to himself, to see what it looks like before four hundred people do. */
export async function sendTest(input: OfferInput, to: string): Promise<boolean> {
  await requireRole(STAFF_ROLES);
  const result = await sendMail(
    marketingEmail({
      to,
      subject: `[test] ${input.subject}`,
      heading: input.heading,
      body: input.body,
      buttonLabel: input.buttonLabel,
      url: input.url.startsWith("/") ? absoluteUrl(input.url) : input.url,
      // A real-looking link that does nothing: a test send must never be able
      // to take the person testing it off the list.
      unsubscribeUrl: absoluteUrl("/unsubscribe?bad=1"),
    }),
  );
  return result.ok;
}
