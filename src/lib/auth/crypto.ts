import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set to at least 32 characters. Generate one with: openssl rand -base64 32",
    );
  }
  return secret;
}

/**
 * Keyed hash. Used for IP addresses, which come from a tiny input space (four
 * billion IPv4s), so a plain SHA-256 could be reversed by brute force from a
 * database dump. Without the server secret an HMAC cannot. `purpose`
 * domain-separates the uses from each other.
 */
export function hmac(purpose: string, value: string): string {
  return createHmac("sha256", authSecret()).update(`${purpose}\u0000${value}`).digest("hex");
}

/** Unkeyed hash, for high-entropy random tokens (sessions, challenges). */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** 256 bits of randomness, cookie-safe. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
