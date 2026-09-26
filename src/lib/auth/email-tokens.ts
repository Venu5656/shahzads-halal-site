import "server-only";
import type { EmailTokenPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import { absoluteUrl, sendMail } from "@/lib/email/mailer";
import { passwordResetEmail, verificationEmail } from "@/lib/email/templates";
import { randomToken, sha256 } from "./crypto";
import {
  RESET_TTL_MS,
  VERIFY_TTL_MS,
  decideSend,
  expiryFor,
  SEND_WINDOW_MS,
} from "./email-policy";
import { requestMeta } from "./request";

/**
 * Issuing and spending the links we email.
 *
 * The token exists in exactly two places: the link in someone's inbox, and its
 * SHA-256 in our database. A dump of the database therefore proves nothing and
 * unlocks nothing — the same reason session tokens are stored this way.
 *
 * Spending a token is a single conditional UPDATE, so two clicks on the same
 * link (a mail client prefetching it, then the human) cannot both succeed.
 */

const PATHS: Record<EmailTokenPurpose, string> = {
  VERIFY_EMAIL: "/verify-email",
  RESET_PASSWORD: "/reset-password",
};

export type IssueResult =
  | { sent: true }
  | { sent: false; reason: "rate_limited"; retryAfterSec: number };

/**
 * Creates a token for `user`, emails the link, and returns whether it went.
 *
 * Callers must treat a refusal as "say the same thing you always say" — the
 * screens above this never reveal whether an address has an account.
 */
export async function issueEmailToken(options: {
  userId: string;
  name: string;
  email: string;
  purpose: EmailTokenPurpose;
}): Promise<IssueResult> {
  const { userId, name, email, purpose } = options;
  const meta = await requestMeta();
  const since = new Date(Date.now() - SEND_WINDOW_MS);

  const [samePurposeSends, addressSends, ipSends] = await Promise.all([
    prisma.emailToken.findMany({
      where: { email, purpose, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.emailToken.findMany({
      where: { email, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    meta.ipHash
      ? prisma.emailToken.findMany({
          where: { ipHash: meta.ipHash, createdAt: { gte: since } },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const decision = decideSend(
    samePurposeSends.map((t) => t.createdAt),
    addressSends.map((t) => t.createdAt),
    ipSends.map((t) => t.createdAt),
  );
  if (!decision.ok) return { sent: false, reason: "rate_limited", retryAfterSec: decision.retryAfterSec };

  // A new link retires the old ones, so a forwarded email cannot be used after
  // its owner has asked for a fresh one.
  await prisma.emailToken.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const token = randomToken();
  await prisma.emailToken.create({
    data: {
      tokenHash: sha256(token),
      purpose,
      userId,
      email,
      expiresAt: expiryFor(purpose === "RESET_PASSWORD" ? "RESET_PASSWORD" : "VERIFY_EMAIL"),
      ipHash: meta.ipHash,
    },
  });

  const url = absoluteUrl(`${PATHS[purpose]}?token=${encodeURIComponent(token)}`);
  const mail =
    purpose === "RESET_PASSWORD"
      ? passwordResetEmail({ to: email, name, url, minutes: Math.round(RESET_TTL_MS / 60000) })
      : verificationEmail({ to: email, name, url, hours: Math.round(VERIFY_TTL_MS / 3600000) });

  // A send failure is logged inside sendMail. The customer still sees "check
  // your inbox": telling them the provider is down invites retries that make
  // it worse, and the resend button is right there.
  await sendMail(mail);
  return { sent: true };
}

export type SpentToken =
  | { ok: true; userId: string; email: string; name: string }
  | { ok: false; reason: "invalid" | "expired" };

/**
 * Spends a token: marks it consumed and hands back who it belonged to.
 *
 * `UPDATE ... WHERE consumedAt IS NULL` is what makes this single-use — the
 * database, not this process, decides who got there first.
 */
export async function spendEmailToken(
  token: string,
  purpose: EmailTokenPurpose,
): Promise<SpentToken> {
  // Bound the work an attacker can make us do before any database call.
  if (!token || token.length > 128) return { ok: false, reason: "invalid" };

  const tokenHash = sha256(token);
  const existing = await prisma.emailToken.findUnique({
    where: { tokenHash },
    select: { id: true, purpose: true, expiresAt: true, consumedAt: true },
  });

  if (!existing || existing.purpose !== purpose) return { ok: false, reason: "invalid" };
  if (existing.consumedAt) return { ok: false, reason: "expired" };
  if (existing.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

  const spent = await prisma.emailToken.updateMany({
    where: { id: existing.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  // Someone else (a second click, a prefetching mail client) won the race.
  if (spent.count !== 1) return { ok: false, reason: "expired" };

  const row = await prisma.emailToken.findUnique({
    where: { id: existing.id },
    select: { userId: true, email: true, user: { select: { name: true } } },
  });
  if (!row) return { ok: false, reason: "invalid" };

  return { ok: true, userId: row.userId, email: row.email, name: row.user.name };
}
