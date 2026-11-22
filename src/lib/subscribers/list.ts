import "server-only";
import { randomToken, sha256 } from "@/lib/auth/crypto";
import { decideSend, SEND_WINDOW_MS, tokenUsable } from "@/lib/auth/email-policy";
import { formatPhone } from "@/lib/auth/phone";
import { requestOrigin } from "@/lib/auth/request";
import { prisma } from "@/lib/db";
import { absoluteUrl, sendMail } from "@/lib/email/mailer";
import { listConfirmationEmail } from "@/lib/email/templates";
import {
  EMAIL_DISCLOSURE_VERSION,
  SMS_DISCLOSURE_VERSION,
  type ConsentSource,
} from "@/lib/consent/disclosure";
import type { JoinInput } from "./schemas";

/**
 * Joining and leaving the promotions list.
 *
 * Two rules shape every function here.
 *
 * One: the state columns on Subscriber and the rows in ConsentEvent are
 * written in the same transaction, always. A subscriber marked as having
 * agreed with no row to show for it is the exact situation the ledger exists
 * to prevent, and the only way to guarantee it cannot happen is to never
 * write one without the other.
 *
 * Two: the answer the form gives back never depends on whether the address is
 * already on the list. Not because membership is a secret worth much, but
 * because a form that says "you're already subscribed" to one person and
 * "check your email" to another is a membership oracle, and building one on
 * purpose is a decision nobody would defend out loud.
 */

/** A confirmation link is good for a week — nobody reads mail on our schedule. */
export const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const CONFIRM_TTL_DAYS = 7;

export type JoinResult =
  | { ok: true }
  /** Too many links to this address or from this IP. Say the same thing anyway. */
  | { ok: false; reason: "rate_limited" };

/**
 * Puts somebody on the list, pending their confirmation.
 *
 * The SMS consent is recorded here, at the moment the box was ticked, because
 * that is when it happened and a consent record that invents its own timestamp
 * is worthless. Sending is gated elsewhere, on smsConfirmedAt — see the
 * Subscriber model for why a ticked box is not enough to text somebody.
 */
export async function join(input: JoinInput, source: ConsentSource = "join-form"): Promise<JoinResult> {
  const { email, phone, smsConsent } = input;
  const { ip, userAgent } = await requestOrigin();
  const now = new Date();
  const since = new Date(now.getTime() - SEND_WINDOW_MS);

  const [addressSends, ipSends] = await Promise.all([
    prisma.subscriberToken.findMany({
      where: { email, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    ip
      ? prisma.consentEvent.findMany({
          where: { ip, createdAt: { gte: since }, action: "GRANTED", channel: "EMAIL" },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const sends = addressSends.map((row) => row.createdAt);
  const decision = decideSend(sends, sends, ipSends.map((row) => row.createdAt), now);
  if (!decision.ok) return { ok: false, reason: "rate_limited" };

  const token = randomToken();
  const base = { ip, userAgent, target: email, source } as const;

  const subscriber = await prisma.$transaction(async (tx) => {
    // Re-joining clears a previous stop. Somebody who asks again has asked
    // again, and holding an old opt-out against them is its own complaint.
    const row = await tx.subscriber.upsert({
      where: { email },
      create: {
        email,
        phone,
        smsConsentAt: smsConsent ? now : null,
      },
      update: {
        // A blank number does not erase one we already have: they left the
        // field empty, which is not the same as asking us to forget it.
        ...(phone ? { phone } : {}),
        ...(smsConsent ? { smsConsentAt: now, smsStoppedAt: null } : {}),
        emailStoppedAt: null,
      },
    });

    await tx.subscriberToken.create({
      data: {
        tokenHash: sha256(token),
        subscriberId: row.id,
        email,
        expiresAt: new Date(now.getTime() + CONFIRM_TTL_MS),
      },
    });

    await tx.consentEvent.createMany({
      data: [
        {
          ...base,
          subscriberId: row.id,
          channel: "EMAIL",
          action: "GRANTED",
          disclosureVersion: EMAIL_DISCLOSURE_VERSION,
        },
        ...(smsConsent && phone
          ? [
              {
                ...base,
                subscriberId: row.id,
                channel: "SMS" as const,
                action: "GRANTED" as const,
                target: phone,
                disclosureVersion: SMS_DISCLOSURE_VERSION,
              },
            ]
          : []),
      ],
    });

    return row;
  });

  // Sent on every join, including one from an address already confirmed. It
  // keeps "check your email" true for everyone, and opening the link twice
  // does nothing the first time did not.
  await sendMail(
    listConfirmationEmail({
      to: email,
      url: absoluteUrl(`/join/confirm?token=${token}`),
      days: CONFIRM_TTL_DAYS,
      phoneLabel: smsConsent && subscriber.phone ? formatPhone(subscriber.phone) : null,
    }),
  );

  return { ok: true };
}

export type ConfirmResult =
  | { state: "confirmed"; email: string; textsPending: boolean }
  /** Already used, expired, or never existed — all one answer, see below. */
  | { state: "expired" };

/**
 * Spends a confirmation token.
 *
 * Expired, already spent and never existed are one answer on purpose. They are
 * indistinguishable to the person holding the link — who in every case needs
 * the same next step — and distinguishing them would turn the endpoint into a
 * way to test whether a token was ever real.
 *
 * The spend is a conditional updateMany, so a mail client prefetching the link
 * and the human clicking it cannot both count as a confirmation.
 */
export async function confirm(token: unknown): Promise<ConfirmResult> {
  if (typeof token !== "string" || token.length < 20 || token.length > 256) {
    return { state: "expired" };
  }

  const tokenHash = sha256(token);
  const row = await prisma.subscriberToken.findUnique({
    where: { tokenHash },
    include: { subscriber: true },
  });
  if (!row) return { state: "expired" };

  // An already-confirmed subscriber opening a second link is not an error:
  // tell them they are on the list rather than that something expired.
  if (!tokenUsable(row) && row.subscriber.emailConfirmedAt && !row.subscriber.emailStoppedAt) {
    return {
      state: "confirmed",
      email: row.subscriber.email,
      textsPending: Boolean(row.subscriber.smsConsentAt && !row.subscriber.smsConfirmedAt),
    };
  }
  if (!tokenUsable(row)) return { state: "expired" };

  const { ip, userAgent } = await requestOrigin();
  const now = new Date();

  const spent = await prisma.$transaction(async (tx) => {
    const { count } = await tx.subscriberToken.updateMany({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (count === 0) return false;

    await tx.subscriber.update({
      where: { id: row.subscriberId },
      // A link issued for one address can never confirm another: the token
      // carries the address it was sent to, and that is what is checked.
      data: { emailConfirmedAt: row.subscriber.emailConfirmedAt ?? now, emailStoppedAt: null },
    });

    await tx.consentEvent.create({
      data: {
        subscriberId: row.subscriberId,
        channel: "EMAIL",
        action: "CONFIRMED",
        target: row.email,
        disclosureVersion: EMAIL_DISCLOSURE_VERSION,
        source: "email-confirm",
        ip,
        userAgent,
      },
    });

    return true;
  });

  if (!spent) return { state: "expired" };
  return {
    state: "confirmed",
    email: row.email,
    textsPending: Boolean(row.subscriber.smsConsentAt && !row.subscriber.smsConfirmedAt),
  };
}

/**
 * Stops one channel for one subscriber, and writes down that they stopped.
 *
 * Stopped, never deleted. A deleted row is a row the next import can re-add,
 * and "we lost your opt-out" is not a defence anybody has ever won with.
 */
export async function stop(options: {
  subscriberId: string;
  channel: "EMAIL" | "SMS";
  source: ConsentSource;
}): Promise<boolean> {
  const { subscriberId, channel, source } = options;
  const { ip, userAgent } = await requestOrigin();
  const now = new Date();

  const subscriber = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
  if (!subscriber) return false;

  const target = channel === "EMAIL" ? subscriber.email : subscriber.phone;
  if (!target) return false;

  await prisma.$transaction(async (tx) => {
    await tx.subscriber.update({
      where: { id: subscriberId },
      data: channel === "EMAIL" ? { emailStoppedAt: now } : { smsStoppedAt: now },
    });
    await tx.consentEvent.create({
      data: {
        subscriberId,
        channel,
        action: "WITHDRAWN",
        target,
        disclosureVersion:
          channel === "EMAIL" ? EMAIL_DISCLOSURE_VERSION : SMS_DISCLOSURE_VERSION,
        source,
        ip,
        userAgent,
      },
    });
  });

  return true;
}

/**
 * Who may actually be sent to, per channel. The one place a send should ask.
 *
 * Email needs a confirmed address and no stop. SMS needs all of that plus a
 * confirmed number, which nothing can set yet — so this returns an empty list
 * for SMS today, and will keep doing so until the number confirmation exists.
 * That is the intended behaviour: the alternative is texting people whose
 * numbers somebody else typed.
 */
export function sendableWhere(channel: "EMAIL" | "SMS") {
  if (channel === "EMAIL") {
    return { emailConfirmedAt: { not: null }, emailStoppedAt: null } as const;
  }
  return {
    emailConfirmedAt: { not: null },
    smsConsentAt: { not: null },
    smsConfirmedAt: { not: null },
    smsStoppedAt: null,
  } as const;
}
