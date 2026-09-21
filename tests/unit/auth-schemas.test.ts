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
  password: "a good enough password",
  email: "",
  marketingOptIn: null,
};

describe("signupSchema", () => {
  const valid = {
    name: "Aisha Khan",
    phone: "(732) 555-0123",
    password: "a good enough password",
    email: "",
    marketingOptIn: null,
  };

  it("accepts a minimal sign-up and normalises it", () => {
    const r = signupSchema.parse(valid);
    expect(r).toEqual({
      name: "Aisha Khan",
      phone: "+17325550123",
      password: "a good enough password",
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
  it("needs a phone and a password", () => {
    expect(loginSchema.safeParse({ phone: "", password: "something" }).success).toBe(false);
    expect(loginSchema.safeParse({ phone: "848 202 1430", password: "" }).success).toBe(false);
    expect(loginSchema.parse({ phone: "848 202 1430", password: "x" }).phone).toBe("+18482021430");
  });

  it("applies no strength rules when logging in — it either matches or it does not", () => {
    expect(loginSchema.safeParse({ phone: "848 202 1430", password: "short" }).success).toBe(true);
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
      email: "",
      marketingOptIn: null,
      phone: "+15555550100",
      password: "sneaky",
      role: "OWNER",
    });
    expect(r).toEqual({ name: "Sam", email: null, marketingOptIn: false });
  });
});
