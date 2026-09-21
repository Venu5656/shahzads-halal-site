import { z } from "zod";
import { normalizePhone } from "./phone";
import { OTP_LENGTH } from "./otp-policy";

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

export const optionalEmailSchema = z
  .string()
  .trim()
  .max(254, "That email is too long.")
  .transform((value) => value.toLowerCase())
  .pipe(z.union([z.literal(""), z.email("Enter a valid email, or leave it blank.")]))
  .transform((value) => (value === "" ? null : value));

/** HTML checkboxes submit "on" when ticked and nothing when not. */
export const checkboxSchema = z
  .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
  .transform((value) => value === "on" || value === "true");

export const codeSchema = z
  .string({ error: "Enter the 6-digit code." })
  .transform((value) => value.replace(/\s|-/g, ""))
  .pipe(z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), "Enter the 6-digit code."));

export const signupSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  marketingOptIn: checkboxSchema,
});

export const loginSchema = z.object({ phone: phoneSchema });

export const detailsSchema = z.object({
  name: nameSchema,
  email: optionalEmailSchema,
  marketingOptIn: checkboxSchema,
});

export const profileSchema = detailsSchema;

/** What a SIGNUP challenge carries until the code is confirmed. */
export const signupPayloadSchema = z.object({
  name: nameSchema,
  email: z.string().nullable(),
  marketingOptIn: z.boolean(),
});

export type SignupPayload = z.infer<typeof signupPayloadSchema>;

/** Form state returned by every auth server action. */
export type FormState = {
  error?: string;
  notice?: string;
  /** When a code was just (re)sent, so the client can run the resend countdown. */
  sentAt?: number;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
} | undefined;

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
