"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "./dal";
import { issueCode } from "./otp";
import { field, fieldErrorsFrom, phoneSchema, profileSchema, type FormState } from "./schemas";

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { name: field(form, "name") ?? "", email: field(form, "email") ?? "" };
  const parsed = profileSchema.safeParse({
    ...values,
    marketingOptIn: form.get("marketingOptIn"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      marketingOptIn: parsed.data.marketingOptIn,
    },
  });
  revalidatePath("/account");
  revalidatePath("/");
  return { notice: "Saved." };
}

/** A new number must be proven with a code before it replaces the old one. */
export async function startPhoneChange(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { phone: field(form, "phone") ?? "" };
  const parsed = phoneSchema.safeParse(values.phone);
  if (!parsed.success) {
    return { fieldErrors: { phone: parsed.error.issues[0]?.message }, values };
  }
  if (parsed.data === user.phone) {
    return { fieldErrors: { phone: "That's already your number." }, values };
  }

  const sent = await issueCode({ phone: parsed.data, purpose: "CHANGE_PHONE", userId: user.id });
  if (!sent.ok) return { error: sent.error, values };

  redirect(`/verify?next=${encodeURIComponent("/account")}`);
}
