// Deliberately not marked "server-only": it holds no secrets (scrypt needs no
// key) and the database seed imports it to set the first owner's password.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with scrypt, which ships with Node — no native build step,
 * no extra dependency, and memory-hard, so custom hardware buys an attacker
 * much less than it would against a plain hash.
 *
 * Stored as: scrypt$N$r$p$salt$hash (base64url), so the parameters travel with
 * the hash and can be raised later without invalidating existing passwords.
 */

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

// 2^16 · 8 · 1 ≈ 64 MB per hash, ~100ms on a laptop.
const N = 65536;
const R = 8;
const P = 1;
const KEY_BYTES = 64;
const SALT_BYTES = 16;
// scrypt needs 128 · N · r bytes; give it headroom or Node refuses.
const MAX_MEM = 128 * N * R * 2;

const b64 = (b: Buffer) => b.toString("base64url");

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_BYTES, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  });
  return `scrypt$${N}$${R}$${P}$${b64(salt)}$${b64(key)}`;
}

/**
 * Constant-time check. Returns false rather than throwing on a malformed
 * hash, so one bad row cannot take the login page down.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, salt, key] = stored.split("$");
    if (scheme !== "scrypt" || !n || !r || !p || !salt || !key) return false;

    const expected = Buffer.from(key, "base64url");
    const actual = await scrypt(
      password.normalize("NFKC"),
      Buffer.from(salt, "base64url"),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEM },
    );

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * Burns the same work a real check would, so the response time cannot reveal
 * whether a phone number has an account. The decoy hash is made once per
 * process from random input, so it can never match anything.
 */
let decoy: Promise<string> | null = null;
export async function decoyVerify(password: string): Promise<false> {
  decoy ??= hashPassword(randomBytes(32).toString("base64url"));
  await verifyPassword(password, await decoy);
  return false;
}

/** True when a stored hash was made with weaker parameters than we use now. */
export function needsRehash(stored: string): boolean {
  const [scheme, n, r, p] = stored.split("$");
  return scheme !== "scrypt" || Number(n) < N || Number(r) < R || Number(p) < P;
}
