import { z } from "zod";
import { normalizePhone } from "./phone";
import { MAX_PASSWORD_LENGTH, passwordProblem } from "./login-policy";

/**
 * Server-side validation for the auth forms. The browser-side `required` and
 * `type=email` attributes are a convenience; these are the actual rules.
 *
 * Shorter than it was. There is no sign-up form any more — only the shop has
 * an account, and the people who want offers join a list instead, which
 * validates itself in src/lib/subscribers/schemas.ts. What is left here is
 * logging in and the two emailed journeys.
 */

/**
 * Every account needs an address we can prove: it is where the verification
 * link and any password reset go. Lower-cased on the way in so "Sam@" and
 * "sam@" cannot become two accounts.
 */
export const emailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email is too long.")
  .transform((value) => value.toLowerCase())
  .pipe(z.email("Enter a valid email address."));

/**
 * The login box takes either an email address or a mobile number, because
 * people remember whichever they gave us. Anything with an @ is treated as an
 * email; everything else is run through the phone normaliser.
 */
export const loginIdentifierSchema = z
  .string({ error: "Enter your email or mobile number." })
  .trim()
  .min(1, "Enter your email or mobile number.")
  .max(254, "That's too long.")
  .transform((value, ctx) => {
    if (value.includes("@")) {
      const email = value.toLowerCase();
      if (!z.email().safeParse(email).success) {
        ctx.addIssue({ code: "custom", message: "Enter a valid email address." });
        return z.NEVER;
      }
      return { kind: "email" as const, value: email };
    }
    const e164 = normalizePhone(value);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "Enter your email or a valid US mobile number." });
      return z.NEVER;
    }
    return { kind: "phone" as const, value: e164 };
  });

/**
 * A password being *set*. Never trimmed — leading and trailing spaces are the
 * customer's business — but capped so a megabyte of text cannot tie up a
 * server thread in scrypt.
 */
export const newPasswordSchema = z
  .string({ error: "Choose a password." })
  .min(1, "Choose a password.")
  .max(MAX_PASSWORD_LENGTH, `That's longer than ${MAX_PASSWORD_LENGTH} characters.`)
  // Strength is checked on the field, not on the whole form, so a weak
  // password is reported even when another field is also wrong.
  .superRefine((value, ctx) => {
    const problem = passwordProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

/** A password being *typed to log in*: no rules, it either matches or it does not. */
export const givenPasswordSchema = z
  .string({ error: "Enter your password." })
  .min(1, "Enter your password.")
  .max(MAX_PASSWORD_LENGTH, "That's not your password.");

export const loginSchema = z.object({
  identifier: loginIdentifierSchema,
  password: givenPasswordSchema,
});

/** Asking for a link — verification or reset. Always answered the same way. */
export const emailOnlySchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1).max(128),
    newPassword: newPasswordSchema,
  });

/** Form state returned by every auth server action. */
export type FormState =
  | {
      error?: string;
      notice?: string;
      fieldErrors?: Partial<Record<string, string>>;
      values?: Record<string, string>;
    }
  | undefined;

/** Flattens Zod issues into one message per field, for inline display. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Reads a FormData field as a string (never a File). */
export function field(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}
