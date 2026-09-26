import { describe, expect, it } from "vitest";
import {
  MAX_SENDS_PER_ADDRESS,
  MAX_SENDS_PER_IP,
  RESEND_COOLDOWN_MS,
  RESET_TTL_MS,
  SEND_WINDOW_MS,
  VERIFY_TTL_MS,
  cooldownMessage,
  decideSend,
  expiryFor,
  maskEmail,
  tokenUsable,
  ttlFor,
} from "@/lib/auth/email-policy";

const ago = (ms: number, now: Date) => new Date(now.getTime() - ms);

describe("link lifetimes", () => {
  it("gives a reset link an hour and a verification link a day", () => {
    expect(ttlFor("RESET_PASSWORD")).toBe(60 * 60 * 1000);
    expect(ttlFor("VERIFY_EMAIL")).toBe(24 * 60 * 60 * 1000);
  });

  it("keeps a reset link shorter-lived than a verification link", () => {
    expect(RESET_TTL_MS).toBeLessThan(VERIFY_TTL_MS);
  });

  it("dates the expiry from now", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    expect(expiryFor("RESET_PASSWORD", now).toISOString()).toBe("2026-02-01T01:00:00.000Z");
    expect(expiryFor("VERIFY_EMAIL", now).toISOString()).toBe("2026-02-02T00:00:00.000Z");
  });
});

describe("tokenUsable", () => {
  const now = new Date("2026-02-01T12:00:00Z");

  it("accepts a fresh, unspent token", () => {
    expect(tokenUsable({ expiresAt: ago(-1000, now), consumedAt: null }, now)).toBe(true);
  });

  it("rejects one that was already spent", () => {
    expect(tokenUsable({ expiresAt: ago(-1000, now), consumedAt: now }, now)).toBe(false);
  });

  it("rejects one that has expired", () => {
    expect(tokenUsable({ expiresAt: ago(1, now), consumedAt: null }, now)).toBe(false);
  });

  it("treats the expiry instant itself as expired", () => {
    expect(tokenUsable({ expiresAt: now, consumedAt: null }, now)).toBe(false);
  });
});

describe("decideSend", () => {
  const now = new Date("2026-02-01T12:00:00Z");

  it("allows the first link to an address", () => {
    expect(decideSend([], [], [], now)).toEqual({ ok: true });
  });

  it("holds a second link back until the cooldown passes", () => {
    const decision = decideSend([ago(10_000, now)], [ago(10_000, now)], [], now);
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("cooldown");
      expect(decision.retryAfterSec).toBe(50);
    }
  });

  it("allows another once the cooldown has passed", () => {
    expect(decideSend([ago(RESEND_COOLDOWN_MS + 1, now)], [ago(RESEND_COOLDOWN_MS + 1, now)], [], now)).toEqual({ ok: true });
  });

  it("caps how many links one address can pull in an hour", () => {
    const sends = Array.from({ length: MAX_SENDS_PER_ADDRESS }, (_, i) =>
      ago(RESEND_COOLDOWN_MS * (i + 2), now),
    );
    const decision = decideSend(sends, sends, [], now);
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toBe("address_capped");
  });

  it("forgets sends older than the window", () => {
    const stale = Array.from({ length: MAX_SENDS_PER_ADDRESS + 3 }, () =>
      ago(SEND_WINDOW_MS + 60_000, now),
    );
    expect(decideSend(stale, stale, [], now)).toEqual({ ok: true });
  });

  it("caps an IP, so one machine cannot spray links at many addresses", () => {
    const ipSends = Array.from({ length: MAX_SENDS_PER_IP }, (_, i) => ago(i * 1000 + 5000, now));
    const decision = decideSend([], [], ipSends, now);
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toBe("ip_capped");
  });

  it("lets a household share an IP without tripping the address cap", () => {
    const ipSends = Array.from({ length: MAX_SENDS_PER_ADDRESS + 2 }, (_, i) =>
      ago(i * 1000 + 5000, now),
    );
    expect(decideSend([], [], ipSends, now)).toEqual({ ok: true });
  });

  it("lets a different purpose through the cooldown", () => {
    // Just sent a verification link; asking to reset a password is a different
    // request and must not be met with silence.
    const justSent = [ago(5_000, now)];
    expect(decideSend([], justSent, [], now)).toEqual({ ok: true });
  });

  it("reports how long is left, never a negative wait", () => {
    const sends = Array.from({ length: MAX_SENDS_PER_ADDRESS }, () =>
      ago(SEND_WINDOW_MS - 30_000, now),
    );
    const decision = decideSend(sends, sends, [], now);
    if (!decision.ok) {
      expect(decision.retryAfterSec).toBeGreaterThan(0);
      expect(decision.retryAfterSec).toBeLessThanOrEqual(SEND_WINDOW_MS / 1000);
    }
  });
});

describe("maskEmail", () => {
  it.each([
    ["shahzad@example.com", "s•••••d@example.com"],
    ["sam@example.com", "s•m@example.com"],
    ["jo@example.com", "j••@example.com"],
    ["a@b.co", "a••@b.co"],
  ])("masks %s as %s", (input, expected) => {
    expect(maskEmail(input)).toBe(expected);
  });

  it("never leaks the whole local part of a long address", () => {
    const masked = maskEmail("averylongaddressindeed@example.com");
    expect(masked).not.toContain("averylongaddressindeed");
    expect(masked.endsWith("@example.com")).toBe(true);
  });

  it("does not throw on something that isn't an address", () => {
    expect(maskEmail("not-an-address")).toBe("•••");
  });
});

describe("cooldownMessage", () => {
  it("counts in seconds when the wait is short", () => {
    expect(cooldownMessage(30)).toContain("30 seconds");
  });

  it("rounds up to minutes when the wait is long", () => {
    expect(cooldownMessage(61)).toContain("2 minutes");
    expect(cooldownMessage(3600)).toContain("60 minutes");
  });

  it("never tells someone to wait zero seconds", () => {
    expect(cooldownMessage(0)).toContain("5 seconds");
  });
});
