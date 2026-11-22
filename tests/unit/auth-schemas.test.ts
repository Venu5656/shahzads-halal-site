import { describe, expect, it } from "vitest";
import { fieldErrorsFrom, loginSchema, resetPasswordSchema } from "@/lib/auth/schemas";


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

describe("the rules on a password being set", () => {
  it.each(["short", "password"])("rejects %j", (password) => {
    const r = resetPasswordSchema.safeParse({ token: "t".repeat(40), newPassword: password });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).newPassword).toBeDefined();
  });

  it("accepts one that is merely long enough", () => {
    const r = resetPasswordSchema.safeParse({
      token: "t".repeat(40),
      newPassword: "a good enough password",
    });
    expect(r.success).toBe(true);
  });
});
