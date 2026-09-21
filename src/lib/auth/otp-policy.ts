/**
 * The rules for one-time codes, as pure functions so they can be unit tested
 * without a database. The numbers are the ones agreed in the build brief.
 */

export const OTP_LENGTH = 6;
/** A code is good for five minutes. */
export const OTP_TTL_MS = 5 * 60 * 1000;
/** Wrong guesses allowed against a single code before it is burned. */
export const OTP_MAX_ATTEMPTS = 5;
/** Minimum gap between two codes to the same phone. */
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
/** Codes one phone number may receive per rolling hour. */
export const OTP_MAX_PER_PHONE_PER_HOUR = 5;
/** Codes one IP address may request per rolling hour (a dorm shares an IP). */
export const OTP_MAX_PER_IP_PER_HOUR = 20;
/** After verifying a new number, how long the customer has to finish signing up. */
export const VERIFIED_PHONE_GRACE_MS = 15 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;

export type SendDecision =
  | { ok: true }
  | { ok: false; reason: "cooldown" | "phone_limit" | "ip_limit"; retryAfterSec: number };

/**
 * May we send another code? `phoneSends` / `ipSends` are the creation times of
 * codes already issued in the last hour, in any order.
 */
export function decideSend(
  phoneSends: Date[],
  ipSends: Date[],
  now: Date = new Date(),
): SendDecision {
  const t = now.getTime();
  const inLastHour = (d: Date) => t - d.getTime() < HOUR_MS;
  const phone = phoneSends.filter(inLastHour).map((d) => d.getTime()).sort((a, b) => b - a);
  const ip = ipSends.filter(inLastHour).map((d) => d.getTime()).sort((a, b) => b - a);

  const latest = phone[0];
  if (latest !== undefined && t - latest < OTP_RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      reason: "cooldown",
      retryAfterSec: Math.ceil((OTP_RESEND_COOLDOWN_MS - (t - latest)) / 1000),
    };
  }

  if (phone.length >= OTP_MAX_PER_PHONE_PER_HOUR) {
    // The window reopens when the oldest send in it ages out.
    const oldest = phone[OTP_MAX_PER_PHONE_PER_HOUR - 1]!;
    return {
      ok: false,
      reason: "phone_limit",
      retryAfterSec: Math.ceil((HOUR_MS - (t - oldest)) / 1000),
    };
  }

  if (ip.length >= OTP_MAX_PER_IP_PER_HOUR) {
    const oldest = ip[OTP_MAX_PER_IP_PER_HOUR - 1]!;
    return {
      ok: false,
      reason: "ip_limit",
      retryAfterSec: Math.ceil((HOUR_MS - (t - oldest)) / 1000),
    };
  }

  return { ok: true };
}

export type CodeState = {
  expiresAt: Date;
  attempts: number;
  verifiedAt: Date | null;
  consumedAt: Date | null;
};

export type CheckResult = "ok" | "expired" | "locked" | "used";

/** Can this code still be tried at all? (Checked before comparing the digits.) */
export function codeUsable(code: CodeState, now: Date = new Date()): CheckResult {
  if (code.consumedAt || code.verifiedAt) return "used";
  if (code.attempts >= OTP_MAX_ATTEMPTS) return "locked";
  if (code.expiresAt.getTime() <= now.getTime()) return "expired";
  return "ok";
}

/** Human wording for a refused send, e.g. "Try again in 25 seconds." */
export function retryMessage(retryAfterSec: number): string {
  if (retryAfterSec < 60) {
    return `Try again in ${retryAfterSec} second${retryAfterSec === 1 ? "" : "s"}.`;
  }
  const minutes = Math.ceil(retryAfterSec / 60);
  return `Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
