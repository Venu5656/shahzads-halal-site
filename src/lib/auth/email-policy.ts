/**
 * Rules for emailed links — lifetimes, resend cooldowns and send caps — as
 * pure functions, so they can be tested without a database or a mail server.
 *
 * Two different clocks matter here:
 *   * how long a link stays usable (short for a password reset, longer for a
 *     verification someone might open on another device tomorrow), and
 *   * how often we are willing to send, which protects both our sending
 *     reputation and the inbox of someone whose address a stranger typed.
 */

export type EmailPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD";

/** A verification link is good for a day; people check mail on their own schedule. */
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** A reset link is good for an hour — it is the more dangerous of the two. */
export const RESET_TTL_MS = 60 * 60 * 1000;

/** Wait this long before the same address may ask for another link. */
export const RESEND_COOLDOWN_MS = 60 * 1000;

/** The window the per-address and per-IP caps are counted over. */
export const SEND_WINDOW_MS = 60 * 60 * 1000;

/** Links to one address per hour, across both purposes. */
export const MAX_SENDS_PER_ADDRESS = 5;

/** Links from one IP per hour. Higher, because a household shares an address. */
export const MAX_SENDS_PER_IP = 20;

export function ttlFor(purpose: EmailPurpose): number {
  return purpose === "RESET_PASSWORD" ? RESET_TTL_MS : VERIFY_TTL_MS;
}

export function expiryFor(purpose: EmailPurpose, now: Date = new Date()): Date {
  return new Date(now.getTime() + ttlFor(purpose));
}

export type SendDecision =
  | { ok: true }
  | { ok: false; reason: "cooldown" | "address_capped" | "ip_capped"; retryAfterSec: number };

/**
 * May we send another link right now?
 *
 * The cooldown is per purpose and the hourly cap is per address. That split
 * matters: someone who has just been sent a verification link and immediately
 * asks to reset their password is making a different request, and should not
 * be met with silence — while the cap still protects the inbox overall.
 *
 * The caller decides what to *tell* the person: a refusal here must never be
 * shown as "that address is taken", only as "check your inbox, give it a
 * minute".
 */
export function decideSend(
  samePurposeSends: Date[],
  addressSends: Date[],
  ipSends: Date[],
  now: Date = new Date(),
): SendDecision {
  const t = now.getTime();
  const within = (dates: Date[]) =>
    dates
      .map((d) => d.getTime())
      .filter((time) => t - time < SEND_WINDOW_MS)
      .sort((a, b) => b - a);

  const newest = within(samePurposeSends)[0];
  if (newest !== undefined && t - newest < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      reason: "cooldown",
      retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - (t - newest)) / 1000),
    };
  }

  const address = within(addressSends);
  if (address.length >= MAX_SENDS_PER_ADDRESS) {
    const oldest = address[MAX_SENDS_PER_ADDRESS - 1]!;
    return {
      ok: false,
      reason: "address_capped",
      retryAfterSec: Math.ceil((SEND_WINDOW_MS - (t - oldest)) / 1000),
    };
  }

  const ip = within(ipSends);
  if (ip.length >= MAX_SENDS_PER_IP) {
    const oldest = ip[MAX_SENDS_PER_IP - 1]!;
    return {
      ok: false,
      reason: "ip_capped",
      retryAfterSec: Math.ceil((SEND_WINDOW_MS - (t - oldest)) / 1000),
    };
  }

  return { ok: true };
}

/** Is a token still usable? Pure, so the expiry rule is testable on its own. */
export function tokenUsable(
  token: { expiresAt: Date; consumedAt: Date | null },
  now: Date = new Date(),
): boolean {
  return token.consumedAt === null && token.expiresAt.getTime() > now.getTime();
}

/**
 * Hides the local part of an address for display: shahzad@example.com becomes
 * s••••d@example.com. Used on the "check your email" screen, which is shown
 * whether or not an account exists — so it must not confirm the address is
 * real, only echo what was typed.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "•••";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}••${domain}`;
  return `${local[0]}${"•".repeat(Math.min(6, local.length - 2))}${local.at(-1)}${domain}`;
}

export function cooldownMessage(retryAfterSec: number): string {
  if (retryAfterSec <= 60) {
    return `Give it ${Math.max(5, retryAfterSec)} seconds before asking for another link.`;
  }
  const minutes = Math.ceil(retryAfterSec / 60);
  return `Too many links requested. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
