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
