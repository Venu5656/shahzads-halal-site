import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  fieldErrorsFrom,
  loginSchema,
  profileSchema,
  signupSchema,
} from "@/lib/auth/schemas";

const validSignup = {
  name: "Aisha Khan",
  phone: "(732) 555-0123",
  email: "aisha@example.com",
  password: "a good enough password",
  acceptTerms: "on",
  marketingOptIn: null,
};

describe("signupSchema", () => {
  const valid = validSignup;

  it("accepts a minimal sign-up and normalises it", () => {
    const r = signupSchema.parse(valid);
    expect(r).toEqual({
      name: "Aisha Khan",
      phone: "+17325550123",
      email: "aisha@example.com",
      password: "a good enough password",
      acceptTerms: true,
      marketingOptIn: false,
    });
  });

  it("lower-cases email and reads the checkbox", () => {
    const r = signupSchema.parse({ ...valid, email: " Aisha@Example.COM ", marketingOptIn: "on" });
    expect(r.email).toBe("aisha@example.com");
    expect(r.marketingOptIn).toBe(true);
  });

  it("now requires an email — it is where the verification link goes", () => {
    const r = signupSchema.safeParse({ ...valid, email: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).email).toMatch(/Enter your email/);
  });

  it("will not create an account without the terms ticked", () => {
    const r = signupSchema.safeParse({ ...valid, acceptTerms: null });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).acceptTerms).toMatch(/Accept the terms/);
  });

  it("keeps the marketing opt-in separate and off unless ticked", () => {
    expect(signupSchema.parse({ ...valid, marketingOptIn: null }).marketingOptIn).toBe(false);
    expect(signupSchema.parse({ ...valid, marketingOptIn: "on" }).marketingOptIn).toBe(true);
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
  it("needs an identifier and a password", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "something" }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: "848 202 1430", password: "" }).success).toBe(false);
  });

  it("takes a mobile number and normalises it", () => {
    const r = loginSchema.parse({ identifier: "848 202 1430", password: "x" });
    expect(r.identifier).toEqual({ kind: "phone", value: "+18482021430" });
  });

  it("takes an email address and lower-cases it", () => {
    const r = loginSchema.parse({ identifier: " Aisha@Example.COM ", password: "x" });
    expect(r.identifier).toEqual({ kind: "email", value: "aisha@example.com" });
  });

  it("rejects something that is neither", () => {
    expect(loginSchema.safeParse({ identifier: "not@valid", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: "12345", password: "x" }).success).toBe(false);
  });

  it("applies no strength rules when logging in — it either matches or it does not", () => {
    expect(loginSchema.safeParse({ identifier: "848 202 1430", password: "short" }).success).toBe(
      true,
    );
  });
});

describe("password rules at sign-up", () => {
  it.each(["short", "password", "7325550123"])("rejects %j", (password) => {
    const r = signupSchema.safeParse({ ...validSignup, password });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).password).toBeDefined();
  });
});

describe("changePasswordSchema", () => {
  it("requires both fields and refuses a no-op change", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "", newPassword: "long enough" }).success).toBe(false);
    const same = changePasswordSchema.safeParse({
      currentPassword: "the same one here",
      newPassword: "the same one here",
    });
    expect(same.success).toBe(false);
    if (!same.success) expect(fieldErrorsFrom(same.error).newPassword).toMatch(/already have/);
    expect(
      changePasswordSchema.safeParse({ currentPassword: "old one", newPassword: "a brand new one" })
        .success,
    ).toBe(true);
  });
});

describe("profileSchema", () => {
  it("cannot be used to change the phone number or the password", () => {
    const r = profileSchema.parse({
      name: "Sam",
      email: "sam@example.com",
      marketingOptIn: null,
      phone: "+15555550100",
      password: "sneaky",
      role: "OWNER",
    });
    expect(r).toEqual({ name: "Sam", email: "sam@example.com", marketingOptIn: false });
  });

  it("will not blank out the address an account is reachable at", () => {
    expect(profileSchema.safeParse({ name: "Sam", email: "", marketingOptIn: null }).success).toBe(
      false,
    );
  });
});
