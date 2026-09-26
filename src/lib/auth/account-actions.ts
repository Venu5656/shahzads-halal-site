"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "./dal";
import { issueEmailToken } from "./email-tokens";
import { cooldownMessage } from "./email-policy";
import { hashPassword, verifyPassword } from "./password";
import {
  changePasswordSchema,
  changePhoneSchema,
  field,
  fieldErrorsFrom,
  profileSchema,
  type FormState,
} from "./schemas";
import { endAllSessions, createSession } from "./session";

/**
 * Name, email and whether they want the occasional deal emailed to them.
 *
 * A new address is never switched in on the spot: it is parked in
 * `pendingEmail` and a link goes to it. Until that link is opened, mail — and
 * any future password reset — keeps going to the old address, so typing the
 * wrong thing here cannot lock anyone out of their own account.
 */
export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { name: field(form, "name") ?? "", email: field(form, "email") ?? "" };
  const parsed = profileSchema.safeParse({
    ...values,
    marketingOptIn: form.get("marketingOptIn"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const wantsNewEmail = parsed.data.email !== user.email;

  if (wantsNewEmail) {
    const taken = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (taken && taken.id !== user.id) {
      return {
        fieldErrors: { email: "That address is already on another account." },
        values,
      };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      marketingOptIn: parsed.data.marketingOptIn,
      ...(wantsNewEmail ? { pendingEmail: parsed.data.email } : {}),
    },
  });

  revalidatePath("/account");
  revalidatePath("/");

  if (!wantsNewEmail) return { notice: "Saved." };

  const sent = await issueEmailToken({
    userId: user.id,
    name: parsed.data.name,
    email: parsed.data.email,
    purpose: "VERIFY_EMAIL",
  });
  if (!sent.sent) return { notice: `Saved. ${cooldownMessage(sent.retryAfterSec)}` };

  return {
    notice: `Saved. Confirm the new address from the link we just sent to ${parsed.data.email} — until then we'll keep using your current one.`,
  };
}

/** Sends the confirmation link again, for an address still waiting to be proved. */
export async function resendAccountVerification(): Promise<FormState> {
  const user = await requireUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, pendingEmail: true, emailVerifiedAt: true },
  });
  if (!row) return { error: "Try again." };

  const target = row.pendingEmail ?? (row.emailVerifiedAt ? null : row.email);
  if (!target) return { notice: "That address is already confirmed." };

  const sent = await issueEmailToken({
    userId: user.id,
    name: row.name,
    email: target,
    purpose: "VERIFY_EMAIL",
  });
  if (!sent.sent) return { error: cooldownMessage(sent.retryAfterSec) };
  return { notice: `Sent. Check ${target} for the link.` };
}

/**
 * Changing the number that logs you in needs the current password — otherwise
 * anyone borrowing an unlocked phone could move the account to their own
 * number and lock the owner out.
 */
export async function changePhone(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { phone: field(form, "phone") ?? "" };
  const parsed = changePhoneSchema.safeParse({
    phone: values.phone,
    password: field(form, "password") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  if (parsed.data.phone === user.phone) {
    return { fieldErrors: { phone: "That's already your number." }, values };
  }
  if (!(await checkPassword(user.id, parsed.data.password))) {
    return { fieldErrors: { password: "That's not your current password." }, values };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: parsed.data.phone, phoneVerified: false },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        fieldErrors: { phone: "That number belongs to another account." },
        values,
      };
    }
    throw error;
  }

  revalidatePath("/account");
  return { notice: "Your number has been updated. Use it to log in from now on." };
}

/**
 * Changing the password signs every other device out, which is the point of
 * changing it after losing a phone. This session is re-issued so the person
 * doing it stays logged in.
 */
export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: field(form, "currentPassword") ?? "",
    newPassword: field(form, "newPassword") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  if (!(await checkPassword(user.id, parsed.data.currentPassword))) {
    return { fieldErrors: { currentPassword: "That's not your current password." } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  await endAllSessions(user.id);
  await createSession(user.id);

  revalidatePath("/account");
  return { notice: "Password changed. Every other device has been signed out." };
}

async function checkPassword(userId: string, password: string): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  return row?.passwordHash ? verifyPassword(password, row.passwordHash) : false;
}
