import "server-only";
import { cookies } from "next/headers";
import type { OtpPurpose, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CHALLENGE_COOKIE, challengeCookieOptions } from "./cookies";
import { generateOtpCode, hmac, randomToken, safeEqualHex, sha256 } from "./crypto";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  VERIFIED_PHONE_GRACE_MS,
  codeUsable,
  decideSend,
  retryMessage,
} from "./otp-policy";
import { requestMeta } from "./request";
import { SmsNotConfiguredError, getSmsSender, rememberDevCode } from "./sms";

/**
 * One-time codes.
 *
 * A code belongs to a *challenge*: a random token in an httpOnly cookie on the
 * browser that asked for it. Only the hash of that token is stored, and the
 * code's HMAC is bound to it — so a code is useless from any other browser,
 * and nothing in the database can be replayed.
 */

const HOUR_MS = 60 * 60 * 1000;

const codeHashFor = (challengeHash: string, code: string) =>
  hmac("otp", `${challengeHash}:${code}`);

export type IssueInput = {
  phone: string;
  purpose: OtpPurpose;
  payload?: Prisma.InputJsonValue;
  userId?: string;
};

export type IssueResult = { ok: true } | { ok: false; error: string };

export async function issueCode(input: IssueInput): Promise<IssueResult> {
  const meta = await requestMeta();

  let sender;
  try {
    sender = getSmsSender();
  } catch (error) {
    if (error instanceof SmsNotConfiguredError) {
      console.error(`[auth] ${error.message}`);
      return {
        ok: false,
        error: "We can't send text messages right now. Please call the store to order.",
      };
    }
    throw error;
  }

  const challenge = randomToken();
  const challengeHash = sha256(challenge);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Serialise sends per phone number so two simultaneous requests cannot both
  // slip under the rate limit.
  const refusal = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.phone}))::text`;

    const since = new Date(Date.now() - HOUR_MS);
    const [phoneSends, ipSends] = await Promise.all([
      tx.otpCode.findMany({
        where: { phone: input.phone, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      meta.ipHash
        ? tx.otpCode.findMany({
            where: { requestIpHash: meta.ipHash, createdAt: { gte: since } },
            select: { createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const decision = decideSend(
      phoneSends.map((r) => r.createdAt),
      ipSends.map((r) => r.createdAt),
    );
    if (!decision.ok) {
      return decision.reason === "cooldown"
        ? `We just sent a code. ${retryMessage(decision.retryAfterSec)}`
        : `Too many codes requested. ${retryMessage(decision.retryAfterSec)}`;
    }

    await tx.otpCode.create({
      data: {
        phone: input.phone,
        purpose: input.purpose,
        codeHash: codeHashFor(challengeHash, code),
        challengeHash,
        payload: input.payload,
        userId: input.userId,
        expiresAt,
        requestIpHash: meta.ipHash,
      },
    });
    return null;
  });

  if (refusal) return { ok: false, error: refusal };

  try {
    await sender.send(
      input.phone,
      `${code} is your Shahzad's Halal Food code. It expires in 5 minutes. Never share it.`,
    );
  } catch (error) {
    console.error("[auth] SMS send failed", error);
    await prisma.otpCode.deleteMany({ where: { challengeHash } });
    return { ok: false, error: "We couldn't text that number. Check it and try again." };
  }

  rememberDevCode(challengeHash, code, expiresAt);
  (await cookies()).set(CHALLENGE_COOKIE, challenge, challengeCookieOptions);
  return { ok: true };
}

/** The code row this browser is currently working with, if any. */
export async function getActiveChallenge() {
  const challenge = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  if (!challenge || challenge.length > 128) return null;
  return prisma.otpCode.findUnique({ where: { challengeHash: sha256(challenge) } });
}

export type ActiveChallenge = NonNullable<Awaited<ReturnType<typeof getActiveChallenge>>>;

export type VerifyResult =
  | { ok: true; challenge: ActiveChallenge }
  | { ok: false; error: string; restart?: boolean };

/** Checks the six digits the customer typed against this browser's challenge. */
export async function verifyCode(code: string): Promise<VerifyResult> {
  const challenge = await getActiveChallenge();
  if (!challenge) {
    return { ok: false, error: "That code has expired. Please start again.", restart: true };
  }

  const state = codeUsable(challenge);
  if (state === "expired") {
    return { ok: false, error: "That code has expired. Tap “Send a new code”." };
  }
  if (state === "locked") {
    return { ok: false, error: "Too many wrong tries. Tap “Send a new code”." };
  }
  if (state === "used") {
    return { ok: false, error: "That code was already used. Please start again.", restart: true };
  }

  // Spend an attempt *before* comparing, atomically, so parallel guesses can't
  // exceed the limit.
  const now = new Date();
  const spent = await prisma.otpCode.updateMany({
    where: {
      id: challenge.id,
      attempts: { lt: OTP_MAX_ATTEMPTS },
      verifiedAt: null,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: { attempts: { increment: 1 } },
  });
  if (spent.count === 0) {
    return { ok: false, error: "That code can't be used any more. Tap “Send a new code”." };
  }

  if (!safeEqualHex(codeHashFor(challenge.challengeHash, code), challenge.codeHash)) {
    const left = OTP_MAX_ATTEMPTS - (challenge.attempts + 1);
    return {
      ok: false,
      error:
        left > 0
          ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "That code isn't right, and that was the last try. Tap “Send a new code”.",
    };
  }

  const marked = await prisma.otpCode.updateMany({
    where: { id: challenge.id, verifiedAt: null },
    data: { verifiedAt: now },
  });
  if (marked.count === 0) {
    return { ok: false, error: "That code was already used. Please start again.", restart: true };
  }

  return { ok: true, challenge: { ...challenge, verifiedAt: now } };
}

/**
 * A challenge whose code was entered correctly but not yet spent — e.g. a
 * customer who logged in with a number we have never seen and now needs to
 * tell us their name.
 */
export async function getVerifiedUnspentChallenge() {
  const challenge = await getActiveChallenge();
  if (!challenge?.verifiedAt || challenge.consumedAt) return null;
  if (Date.now() - challenge.verifiedAt.getTime() > VERIFIED_PHONE_GRACE_MS) return null;
  return challenge;
}

/** Spends a verified challenge exactly once. Returns false if it was already spent. */
export async function consumeChallenge(id: string): Promise<boolean> {
  const result = await prisma.otpCode.updateMany({
    where: { id, verifiedAt: { not: null }, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return result.count === 1;
}

export async function clearChallengeCookie(): Promise<void> {
  (await cookies()).delete({ name: CHALLENGE_COOKIE, path: "/" });
}
