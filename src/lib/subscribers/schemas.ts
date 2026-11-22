import { z } from "zod";
import { normalizePhone } from "@/lib/auth/phone";
import { emailSchema } from "@/lib/auth/schemas";

/**
 * The join form's rules. One required field and two optional ones.
 *
 * No name and no password, because neither is needed to send somebody an
 * offer, and every field that is not needed is a field that costs signups and
 * has to be protected afterwards.
 */

/** Empty means "didn't give one", which is allowed. Anything else must parse. */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(32, "That number is too long.")
  .transform((value, ctx) => {
    if (!value) return null;
    const e164 = normalizePhone(value);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "Enter a valid US mobile number, or leave it blank." });
      return z.NEVER;
    }
    return e164;
  });

/**
 * An HTML checkbox submits "on" when ticked and nothing at all when not.
 *
 * Anything else — an empty string, a hand-rolled POST saying "yes", a missing
 * field — reads as unticked rather than as an error. Both directions are
 * defensible for most inputs; for this one they are not. Failing closed means
 * somebody is not texted. Failing with a validation error on a field they
 * never touched means a form that refuses to submit and never says why, and a
 * strict reading would be the only thing standing between a crafted POST and
 * a recorded consent nobody gave.
 */
const checkbox = z
  .unknown()
  .transform((value) => value === "on" || value === "true" || value === true);

export const joinSchema = z
  .object({
    email: emailSchema,
    phone: optionalPhoneSchema.nullish().transform((v) => v ?? null),
    smsConsent: checkbox,
  })
  .superRefine((value, ctx) => {
    // Ticking the box without a number is the one combination that cannot
    // mean anything. Reported on the number, where the fix is.
    if (value.smsConsent && !value.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Add your mobile number if you want texts.",
      });
    }
  });

export type JoinInput = z.infer<typeof joinSchema>;
