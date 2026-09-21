import { describe, expect, it } from "vitest";
import {
  MAX_FAILURES_PER_IP,
  MAX_FAILURES_PER_PHONE,
  decideLogin,
  lockoutMessage,
  passwordProblem,
} from "@/lib/auth/login-policy";

const NOW = new Date("2026-09-21T18:00:00Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

describe("decideLogin", () => {
  it("allows a first attempt", () => {
    expect(decideLogin([], [], NOW)).toEqual({ ok: true });
  });

  it("allows attempts right up to the limit", () => {
    const seven = Array.from({ length: MAX_FAILURES_PER_PHONE - 1 }, (_, i) => ago(i * 10));
    expect(decideLogin(seven, [], NOW).ok).toBe(true);
  });

  it("freezes a number after eight failures, and says for how long", () => {
    const eight = Array.from({ length: MAX_FAILURES_PER_PHONE }, (_, i) => ago(60 + i * 60));
    const d = decideLogin(eight, [], NOW);
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.reason).toBe("phone_locked");
      // The oldest of the eight was 8 minutes ago, so 7 minutes of the 15 remain.
      expect(d.retryAfterSec).toBe(7 * 60);
    }
  });

  it("forgets failures older than the window", () => {
    const old = Array.from({ length: 20 }, (_, i) => ago(15 * 60 + i));
    expect(decideLogin(old, [], NOW).ok).toBe(true);
  });

  it("freezes an IP separately, for shared connections", () => {
    const many = Array.from({ length: MAX_FAILURES_PER_IP }, (_, i) => ago(i * 20));
    const d = decideLogin([], many, NOW);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe("ip_locked");
  });

  it("does not care what order the timestamps arrive in", () => {
    const shuffled = [ago(300), ago(60), ago(240), ago(120), ago(30), ago(200), ago(10), ago(400)];
    expect(decideLogin(shuffled, [], NOW).ok).toBe(false);
  });
});

describe("passwordProblem", () => {
  it.each([
    "correct horse battery",
    "8charsss",
    "a-perfectly-fine-one",
    "    spaces are fine    ",
  ])("accepts %j", (password) => {
    expect(passwordProblem(password)).toBeNull();
  });

  it.each([
    ["short", /at least 8/i],
    ["", /at least 8/i],
    ["password", /easy to guess/i],
    ["PASSWORD123", /easy to guess/i],
    ["12345678", /easy to guess/i],
    ["aaaaaaaaaa", /easy to guess/i],
    ["x".repeat(129), /longer than/i],
  ])("rejects %j", (password, message) => {
    expect(passwordProblem(password)).toMatch(message);
  });

  it("rejects the customer's own phone number", () => {
    expect(passwordProblem("7325550123", "+17325550123")).toMatch(/phone number/i);
    expect(passwordProblem("my-7325550123", "+17325550123")).toMatch(/phone number/i);
    expect(passwordProblem("unrelated password", "+17325550123")).toBeNull();
  });
});

describe("lockoutMessage", () => {
  it.each([
    [30, "Too many failed attempts. Try again in 1 minute."],
    [61, "Too many failed attempts. Try again in 2 minutes."],
  ])("%s seconds", (seconds, expected) => {
    expect(lockoutMessage(seconds)).toBe(expected);
  });
});
