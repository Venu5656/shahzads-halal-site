import { describe, expect, it } from "vitest";
import { decoyVerify, hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("accepts the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    await expect(verifyPassword("correct horse battery", hash)).resolves.toBe(true);
    await expect(verifyPassword("correct horse batterY", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("never stores the password itself", async () => {
    const hash = await hashPassword("hunter2-is-a-classic");
    expect(hash).not.toContain("hunter2");
    expect(hash).toMatch(/^scrypt\$65536\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  });

  it("salts, so two identical passwords hash differently", async () => {
    const [a, b] = await Promise.all([hashPassword("same password"), hashPassword("same password")]);
    expect(a).not.toBe(b);
    await expect(verifyPassword("same password", a)).resolves.toBe(true);
    await expect(verifyPassword("same password", b)).resolves.toBe(true);
  });

  it("handles unicode consistently however it is typed", async () => {
    // "é" composed vs decomposed — the same password to a human.
    const hash = await hashPassword("café champion");
    await expect(verifyPassword("café champion", hash)).resolves.toBe(true);
  });

  it("keeps spaces and long passphrases intact", async () => {
    const long = "a string of words that goes on for quite a while indeed ".repeat(2);
    const hash = await hashPassword(long);
    await expect(verifyPassword(long, hash)).resolves.toBe(true);
    await expect(verifyPassword(long.trim(), hash)).resolves.toBe(false);
  });

  it("returns false rather than throwing on a damaged hash", async () => {
    for (const bad of ["", "nonsense", "scrypt$", "scrypt$65536$8$1$only-one-part", "bcrypt$a$b$c$d$e"]) {
      await expect(verifyPassword("whatever", bad)).resolves.toBe(false);
    }
  });

  it("flags hashes made with weaker settings for upgrade", async () => {
    expect(needsRehash(await hashPassword("fresh password"))).toBe(false);
    expect(needsRehash("scrypt$16384$8$1$c2FsdA$aGFzaA")).toBe(true);
    expect(needsRehash("md5$whatever")).toBe(true);
  });

  it("decoy checks always fail, so an unknown number costs the same work", async () => {
    await expect(decoyVerify("anything at all")).resolves.toBe(false);
  });
});
