/**
 * Brute-force limits for password login, as pure functions so they can be
 * tested without a database.
 *
 * Only failures count. Someone typing their own password correctly is never
 * locked out, and a lockout on one number cannot lock out the whole café's
 * shared IP for longer than the IP window.
 */

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Failed attempts against one phone number before it is frozen. */
export const MAX_FAILURES_PER_PHONE = 8;
/** Failed attempts from one IP before that address is frozen. */
export const MAX_FAILURES_PER_IP = 30;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export type LoginDecision =
  | { ok: true }
  | { ok: false; reason: "phone_locked" | "ip_locked"; retryAfterSec: number };

/** May this login be tried? `failures` are the times of recent failed attempts. */
export function decideLogin(
  phoneFailures: Date[],
  ipFailures: Date[],
  now: Date = new Date(),
): LoginDecision {
  const t = now.getTime();
  const recent = (dates: Date[]) =>
    dates
      .map((d) => d.getTime())
      .filter((time) => t - time < LOGIN_WINDOW_MS)
      .sort((a, b) => b - a);

  const phone = recent(phoneFailures);
  if (phone.length >= MAX_FAILURES_PER_PHONE) {
    const oldest = phone[MAX_FAILURES_PER_PHONE - 1]!;
    return {
      ok: false,
      reason: "phone_locked",
      retryAfterSec: Math.ceil((LOGIN_WINDOW_MS - (t - oldest)) / 1000),
    };
  }

  const ip = recent(ipFailures);
  if (ip.length >= MAX_FAILURES_PER_IP) {
    const oldest = ip[MAX_FAILURES_PER_IP - 1]!;
    return {
      ok: false,
      reason: "ip_locked",
      retryAfterSec: Math.ceil((LOGIN_WINDOW_MS - (t - oldest)) / 1000),
    };
  }

  return { ok: true };
}

/**
 * Rejects the passwords that actually get people owned: too short, and the
 * handful everyone tries first. Length is the rule that matters, so anything
 * long enough and not obvious is accepted — no forced symbols.
 */
const OBVIOUS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "iloveyou",
  "letmein1",
  "shahzads",
  "halalfood",
  "shahzadshalal",
]);

export function passwordProblem(password: string, phone?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `That's longer than ${MAX_PASSWORD_LENGTH} characters.`;
  }
  const flat = password.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (OBVIOUS.has(flat)) return "That password is too easy to guess.";
  if (/^(.)\1+$/.test(password)) return "That password is too easy to guess.";
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const typed = password.replace(/\D/g, "");
    if (digits.length >= 7 && typed.length >= 7 && digits.includes(typed)) {
      return "Don't use your phone number as your password.";
    }
  }
  return null;
}

export function lockoutMessage(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
