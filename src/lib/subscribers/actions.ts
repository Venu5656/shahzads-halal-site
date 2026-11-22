"use server";

import { maskEmail } from "@/lib/auth/email-policy";
import { field, fieldErrorsFrom, type FormState } from "@/lib/auth/schemas";
import { join } from "./list";
import { joinSchema } from "./schemas";

/**
 * The join form's server action.
 *
 * A public POST endpoint like every server action, so it validates its own
 * input and trusts nothing the browser said.
 *
 * The answer is the same whether the address was new, already pending or
 * already confirmed, and the same whether the hourly send cap refused the
 * email or not. Two reasons. It keeps the form from being a way to ask "is
 * this address on Shahzad's list"; and a refusal that says "too many
 * requests" to somebody who has sent one request is telling them about
 * somebody else's.
 */
export async function joinList(_prev: FormState, form: FormData): Promise<FormState> {
  const values = {
    email: field(form, "email") ?? "",
    phone: field(form, "phone") ?? "",
  };
  const parsed = joinSchema.safeParse({
    ...values,
    smsConsent: form.get("smsConsent"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  await join(parsed.data);

  return {
    notice: `Check ${maskEmail(parsed.data.email)} and open the link — that's the last step.`,
  };
}
