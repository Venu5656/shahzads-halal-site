import "server-only";
import { hmac, safeEqualHex } from "@/lib/auth/crypto";
import { absoluteUrl } from "./mailer";

/**
 * Turning the offers off, from the offers.
 *
 * The link has to work for somebody who is not signed in, has no account to
 * sign in to, cannot remember giving us the address, and is reading on a
 * phone — which is the whole point of an opt-out, and a version that asks for
 * a password is not one.
 *
 * So it carries no database row and no session: the subscriber id, and an HMAC
 * of that id under the server secret. Nothing is revealed that the recipient
 * does not already know, a forged one fails the check, and there is nothing to
 * expire or clean up. The signature is domain-separated by purpose, so an
 * unsubscribe link can never be replayed as anything else.
 *
 * Deliberately no expiry. The law asks that an opt-out keep working for at
 * least thirty days after sending; honouring an old link forever is both
 * simpler and kinder than one that stops.
 *
 * The purpose string still says "unsubscribe:v1" though the id it signs is now
 * a Subscriber rather than a User. Bumping it would invalidate every link
 * already sitting in somebody's inbox, and an unsubscribe link that stops
 * working is the one kind of breakage this file exists to prevent.
 */

const PURPOSE = "unsubscribe:v1";

export function unsubscribeSignature(subscriberId: string): string {
  return hmac(PURPOSE, subscriberId);
}

/** The URL to put in an email footer. */
export function unsubscribeUrl(subscriberId: string): string {
  const params = new URLSearchParams({ u: subscriberId, s: unsubscribeSignature(subscriberId) });
  return absoluteUrl(`/api/unsubscribe?${params.toString()}`);
}

/**
 * Checks a link. Returns the subscriber id it is good for, or null — callers
 * must treat null as "do nothing", never as "unsubscribe whoever this is".
 */
export function verifyUnsubscribe(subscriberId: unknown, signature: unknown): string | null {
  if (typeof subscriberId !== "string" || typeof signature !== "string") return null;
  if (!subscriberId || !signature) return null;
  return safeEqualHex(unsubscribeSignature(subscriberId), signature) ? subscriberId : null;
}

/**
 * The headers that let a mail client show its own "Unsubscribe" button next to
 * the sender's name. Gmail and Apple Mail both honour these, and a reader who
 * uses that button never has to find the link in the footer.
 *
 * One-Click is List-Unsubscribe=One-Click per RFC 8058; it needs the URL to
 * accept POST, which the route does.
 */
export function unsubscribeHeaders(subscriberId: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(subscriberId)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
