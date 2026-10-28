import "server-only";
import { hmac, safeEqualHex } from "@/lib/auth/crypto";
import { absoluteUrl } from "./mailer";

/**
 * Turning marketing email off, from the email.
 *
 * The link has to work for somebody who is not signed in, cannot remember
 * whether they ever had an account, and is reading on a phone — that is the
 * whole point of an opt-out, and a version that demands a password is not one.
 *
 * So it carries no database row and no session: the user id, and an HMAC of
 * that id under the server secret. Nothing is revealed by the link that the
 * recipient does not already know, a forged one fails the check, and there is
 * nothing to expire or clean up. The signature is domain-separated by purpose,
 * so an unsubscribe link can never be replayed as anything else.
 *
 * Deliberately no expiry. The law asks that an opt-out keep working for at
 * least thirty days after sending; honouring an old link forever is both
 * simpler and kinder than one that stops.
 */

const PURPOSE = "unsubscribe:v1";

export function unsubscribeSignature(userId: string): string {
  return hmac(PURPOSE, userId);
}

/** The URL to put in an email footer. */
export function unsubscribeUrl(userId: string): string {
  const params = new URLSearchParams({ u: userId, s: unsubscribeSignature(userId) });
  return absoluteUrl(`/api/unsubscribe?${params.toString()}`);
}

/**
 * Checks a link. Returns the user id it is good for, or null — callers must
 * treat null as "do nothing", never as "unsubscribe whoever this is".
 */
export function verifyUnsubscribe(userId: unknown, signature: unknown): string | null {
  if (typeof userId !== "string" || typeof signature !== "string") return null;
  if (!userId || !signature) return null;
  return safeEqualHex(unsubscribeSignature(userId), signature) ? userId : null;
}

/**
 * The headers that let a mail client show its own "Unsubscribe" button next to
 * the sender's name. Gmail and Apple Mail both honour these, and a reader who
 * uses that button never has to find the link in the footer.
 *
 * One-Click is List-Unsubscribe=One-Click per RFC 8058; it needs the URL to
 * accept POST, which the route does.
 */
export function unsubscribeHeaders(userId: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(userId)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
