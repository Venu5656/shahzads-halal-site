import "server-only";
import { headers } from "next/headers";
import { hmac } from "./crypto";

/**
 * Who is asking, for rate limiting and the session list. The IP is only ever
 * stored as an HMAC.
 *
 * x-forwarded-for is trustworthy on Vercel (the platform overwrites it); a
 * self-hosted deployment must put a proxy in front that does the same, or the
 * per-IP limit can be dodged. The per-phone limits do not depend on it.
 */
export async function requestMeta(): Promise<{ ipHash: string | null; userAgent: string | null }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return {
    ipHash: ip ? hmac("ip", ip) : null,
    userAgent: h.get("user-agent")?.slice(0, 256) ?? null,
  };
}

/**
 * The requesting IP in clear, and the user agent.
 *
 * Deliberately separate from requestMeta, and deliberately rare. Every IP this
 * application stores is an HMAC, because the only question ever asked of a
 * login IP is whether it equals another one — and a hash answers that without
 * keeping anybody's address.
 *
 * Consent is the exception. A consent record is read by a human being, often
 * years later, deciding whether a permission was genuine; the row has to say
 * where the person was, not that we once knew. A hashed consent IP is the
 * appearance of evidence instead of evidence, which is worse than none.
 *
 * So this exists, it is used by the consent ledger, and nothing else should
 * call it without a reason as specific as that one.
 */
export async function requestOrigin(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return {
    ip: ip ? ip.slice(0, 45) : null,
    userAgent: h.get("user-agent")?.slice(0, 256) ?? null,
  };
}
