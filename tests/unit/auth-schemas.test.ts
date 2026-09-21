import { describe, expect, it } from "vitest";
import {
  codeSchema,
  detailsSchema,
  fieldErrorsFrom,
  loginSchema,
  signupSchema,
} from "@/lib/auth/schemas";

describe("signupSchema", () => {
  const valid = { name: "Aisha Khan", phone: "(732) 555-0123", email: "", marketingOptIn: null };

  it("accepts a minimal sign-up and normalises it", () => {
    const r = signupSchema.parse(valid);
    expect(r).toEqual({
      name: "Aisha Khan",
      phone: "+17325550123",
      email: null,
      marketingOptIn: false,
    });
  });

  it("lower-cases email and reads the checkbox", () => {
    const r = signupSchema.parse({ ...valid, email: " Aisha@Example.COM ", marketingOptIn: "on" });
    expect(r.email).toBe("aisha@example.com");
    expect(r.marketingOptIn).toBe(true);
  });

  it.each(["José", "Mary-Jane O'Neil", "Nguyễn Văn A", "李雷"])("accepts the name %s", (name) => {
    expect(signupSchema.safeParse({ ...valid, name }).success).toBe(true);
  });

  it.each(["", "   ", "<script>", "a".repeat(61), "123", "Robert'); DROP TABLE"])(
    "rejects the name %j",
    (name) => {
      expect(signupSchema.safeParse({ ...valid, name }).success).toBe(false);
    },
  );

  it("rejects a bad email and a bad phone, one message per field", () => {
    const r = signupSchema.safeParse({ ...valid, email: "nope", phone: "123" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrorsFrom(r.error);
      expect(errors.email).toMatch(/valid email/);
      expect(errors.phone).toMatch(/valid US mobile/);
    }
  });

  it("refuses to let a form smuggle in a role", () => {
    const r = signupSchema.parse({ ...valid, role: "OWNER" });
    expect(r).not.toHaveProperty("role");
  });
});

describe("loginSchema", () => {
  it("needs a phone", () => {
    expect(loginSchema.safeParse({ phone: "" }).success).toBe(false);
    expect(loginSchema.parse({ phone: "848 202 1430" }).phone).toBe("+18482021430");
  });
});

describe("codeSchema", () => {
  it.each([
    ["123456", "123456"],
    ["123 456", "123456"],
    ["123-456", "123456"],
    ["000042", "000042"],
  ])("accepts %s", (input, out) => {
    expect(codeSchema.parse(input)).toBe(out);
  });

  it.each(["12345", "1234567", "abcdef", "12 34 5", ""])("rejects %s", (input) => {
    expect(codeSchema.safeParse(input).success).toBe(false);
  });
});

describe("detailsSchema", () => {
  it("does not accept a phone number — the verified one is used", () => {
    const r = detailsSchema.parse({ name: "Sam", email: "", marketingOptIn: null, phone: "+15555550100" });
    expect(r).not.toHaveProperty("phone");
  });
});
