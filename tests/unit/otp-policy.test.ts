import { describe, expect, it } from "vitest";
import {
  OTP_MAX_ATTEMPTS,
  codeUsable,
  decideSend,
  retryMessage,
} from "@/lib/auth/otp-policy";

const NOW = new Date("2026-09-20T18:00:00Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

describe("decideSend", () => {
  it("allows the first code", () => {
    expect(decideSend([], [], NOW)).toEqual({ ok: true });
  });

  it("enforces the 30-second resend cooldown", () => {
    const d = decideSend([ago(10)], [], NOW);
    expect(d).toEqual({ ok: false, reason: "cooldown", retryAfterSec: 20 });
    expect(decideSend([ago(30)], [], NOW).ok).toBe(true);
  });

  it("allows at most 5 codes per phone per rolling hour", () => {
    const five = [ago(60), ago(600), ago(1200), ago(1800), ago(2400)];
    const d = decideSend(five, [], NOW);
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.reason).toBe("phone_limit");
      // The oldest send (40 min ago) ages out in 20 minutes.
      expect(d.retryAfterSec).toBe(20 * 60);
    }
  });

  it("forgets sends older than an hour", () => {
    const old = [ago(3601), ago(3700), ago(4000), ago(5000), ago(6000), ago(7000)];
    expect(decideSend(old, [], NOW).ok).toBe(true);
  });

  it("allows at most 20 codes per IP per hour", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => ago(60 + i * 60));
    const d = decideSend([], twenty, NOW);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe("ip_limit");
    expect(decideSend([], twenty.slice(1), NOW).ok).toBe(true);
  });

  it("does not care about the order it is given timestamps in", () => {
    const shuffled = [ago(2400), ago(60), ago(1800), ago(600), ago(1200)];
    expect(decideSend(shuffled, [], NOW).ok).toBe(false);
  });
});

describe("codeUsable", () => {
  const fresh = {
    expiresAt: new Date(NOW.getTime() + 60_000),
    attempts: 0,
    verifiedAt: null,
    consumedAt: null,
  };

  it("accepts a fresh code", () => {
    expect(codeUsable(fresh, NOW)).toBe("ok");
  });

  it("rejects an expired code", () => {
    expect(codeUsable({ ...fresh, expiresAt: ago(1) }, NOW)).toBe("expired");
    expect(codeUsable({ ...fresh, expiresAt: NOW }, NOW)).toBe("expired");
  });

  it("locks a code after 5 wrong attempts", () => {
    expect(codeUsable({ ...fresh, attempts: OTP_MAX_ATTEMPTS - 1 }, NOW)).toBe("ok");
    expect(codeUsable({ ...fresh, attempts: OTP_MAX_ATTEMPTS }, NOW)).toBe("locked");
  });

  it("never accepts a code twice", () => {
    expect(codeUsable({ ...fresh, verifiedAt: NOW }, NOW)).toBe("used");
    expect(codeUsable({ ...fresh, consumedAt: NOW }, NOW)).toBe("used");
  });
});

describe("retryMessage", () => {
  it.each([
    [1, "Try again in 1 second."],
    [20, "Try again in 20 seconds."],
    [61, "Try again in 2 minutes."],
    [60 * 20, "Try again in 20 minutes."],
  ])("%s seconds -> %s", (s, msg) => {
    expect(retryMessage(s)).toBe(msg);
  });
});
