import { z } from "zod";
import { normalizePhone } from "./phone";
import { MAX_PASSWORD_LENGTH, passwordProblem } from "./login-policy";

/**
 * Server-side validation for every auth form. The browser-side `required` and
 * `type=tel` attributes are a convenience; these are the actual rules.
 */

// Letters, marks, spaces and the punctuation real names use.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .\-]*$/u;

export const nameSchema = z
  .string({ error: "Tell us your name." })
  .trim()
  .min(1, "Tell us your name.")
  .max(60, "That name is too long — 60 characters max.")
  .regex(NAME_PATTERN, "Use letters only in your name.");

export const phoneSchema = z
  .string({ error: "Enter your mobile number." })
  .trim()
  .min(1, "Enter your mobile number.")
  .transform((value, ctx) => {
    const e164 = normalizePhone(value);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "Enter a valid US mobile number." });
      return z.NEVER;
    }
    return e164;
  });

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

/** A checkbox that has to be ticked, such as accepting the terms. */
export function requiredCheckboxSchema(message: string) {
  return z
    .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
    .transform((value) => value === "on" || value === "true")
    .refine((checked) => checked, { message });
}

/** HTML checkboxes submit "on" when ticked and nothing when not. */
export const checkboxSchema = z
  .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
  .transform((value) => value === "on" || value === "true");

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

export const signupSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    password: newPasswordSchema,
    acceptTerms: requiredCheckboxSchema("Accept the terms to continue."),
    // Kept separate from the terms rather than bundled into one tick:
    // consent to two different things collected by one checkbox is worth
    // nothing, and the age is the one an account actually turns on.
    confirmAge: requiredCheckboxSchema(
      "You need to be 18 or older to open an account and pay online.",
    ),
    marketingOptIn: checkboxSchema,
  })
  // The only rule that needs two fields: don't let the password be the number.
  .superRefine((value, ctx) => {
    const problem = passwordProblem(value.password, value.phone);
    if (problem) ctx.addIssue({ code: "custom", path: ["password"], message: problem });
  });

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

export const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  marketingOptIn: checkboxSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: givenPasswordSchema,
    newPassword: newPasswordSchema,
  })
  .superRefine((value, ctx) => {
    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "That's the password you already have.",
      });
    }
  });

export const changePhoneSchema = z.object({
  phone: phoneSchema,
  password: givenPasswordSchema,
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
