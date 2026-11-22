import { describe, expect, it } from "vitest";
import { fieldErrorsFrom } from "@/lib/auth/schemas";
import {
  EMAIL_DISCLOSURE,
  EMAIL_DISCLOSURE_VERSION,
  SMS_DISCLOSURE,
  SMS_DISCLOSURE_VERSION,
} from "@/lib/consent/disclosure";
import { joinSchema } from "@/lib/subscribers/schemas";

describe("the join form's rules", () => {
  it("takes an address on its own", () => {
    const r = joinSchema.parse({ email: " Aisha@Example.COM ", phone: "", smsConsent: null });
    expect(r).toEqual({ email: "aisha@example.com", phone: null, smsConsent: false });
  });

  it("normalises a number that is given", () => {
    const r = joinSchema.parse({
      email: "a@b.test",
      phone: "(732) 555-0123",
      smsConsent: "on",
    });
    expect(r.phone).toBe("+17325550123");
    expect(r.smsConsent).toBe(true);
  });

  it("refuses a number it cannot read, rather than storing the typo", () => {
    const r = joinSchema.safeParse({ email: "a@b.test", phone: "12345", smsConsent: null });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).phone).toMatch(/valid US mobile/);
  });

  it("will not take a texts tick with no number to text", () => {
    const r = joinSchema.safeParse({ email: "a@b.test", phone: "", smsConsent: "on" });
    expect(r.success).toBe(false);
    // Reported on the number, which is where the fix is.
    if (!r.success) expect(fieldErrorsFrom(r.error).phone).toMatch(/mobile number/);
  });

  it("still needs an address", () => {
    expect(joinSchema.safeParse({ email: "", phone: "", smsConsent: null }).success).toBe(false);
    expect(joinSchema.safeParse({ email: "nope", phone: "", smsConsent: null }).success).toBe(
      false,
    );
  });

  it("treats an absent checkbox as unticked, never as agreement", () => {
    for (const value of [null, undefined, ""]) {
      const r = joinSchema.safeParse({ email: "a@b.test", phone: "", smsConsent: value });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.smsConsent).toBe(false);
    }
  });
});

/**
 * The disclosure is the thing a court reads. Each clause below is there
 * because its absence is a documented way to lose: the sender carries the
 * burden of proving consent under the TCPA, and consent to "hear from us" is
 * not consent to be texted by a machine four times a month.
 *
 * If one of these fails, the fix is the wording — not the test.
 */
describe("what somebody is shown before they agree", () => {
  it("names who is texting, that it recurs, and that it is automated", () => {
    expect(SMS_DISCLOSURE).toMatch(/Shahzad/);
    expect(SMS_DISCLOSURE).toMatch(/recurring/i);
    expect(SMS_DISCLOSURE).toMatch(/automated/i);
  });

  it("says how often, at most", () => {
    expect(SMS_DISCLOSURE).toMatch(/\d+\s*a month/i);
  });

  it("says it is not a condition of buying anything", () => {
    expect(SMS_DISCLOSURE).toMatch(/not a condition/i);
  });

  it("warns about message rates and says how to stop", () => {
    expect(SMS_DISCLOSURE).toMatch(/rates may apply/i);
    expect(SMS_DISCLOSURE).toMatch(/STOP/);
    expect(SMS_DISCLOSURE).toMatch(/HELP/);
  });

  it("tells an email subscriber what arrives and how to leave", () => {
    expect(EMAIL_DISCLOSURE).toMatch(/offers/i);
    expect(EMAIL_DISCLOSURE).toMatch(/unsubscribe/i);
  });

  it("versions each channel separately, so one can change without the other", () => {
    expect(EMAIL_DISCLOSURE_VERSION).not.toBe(SMS_DISCLOSURE_VERSION);
    for (const version of [EMAIL_DISCLOSURE_VERSION, SMS_DISCLOSURE_VERSION]) {
      expect(version).toMatch(/^\d{4}-\d{2}-(email|sms)-v\d+$/);
    }
  });
});
