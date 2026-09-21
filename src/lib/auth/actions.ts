"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "./dal";
import {
  clearChallengeCookie,
  consumeChallenge,
  getActiveChallenge,
  getVerifiedUnspentChallenge,
  issueCode,
  verifyCode,
  type ActiveChallenge,
} from "./otp";
import { safeNextPath } from "./redirect";
import {
  codeSchema,
  detailsSchema,
  field,
  fieldErrorsFrom,
  loginSchema,
  signupPayloadSchema,
  signupSchema,
  type FormState,
} from "./schemas";
import { createSession, endAllSessions, endCurrentSession } from "./session";

/**
 * Every server action is a public POST endpoint. Each one validates its own
 * input with Zod and re-derives the user from the session — nothing is taken
 * on trust from the form.
 *
 * Account existence is never revealed before the phone number is proven:
 * "Sign up" with a number that already has an account just signs that account
 * in, and "Log in" with an unknown number sends a code anyway and asks for a
 * name only after the code is confirmed.
 */

const verifyUrl = (next: string) => `/verify?next=${encodeURIComponent(next)}`;

// ------------------------------------------------------------------ sign up

export async function startSignup(_prev: FormState, form: FormData): Promise<FormState> {
  const values = {
    name: field(form, "name") ?? "",
    phone: field(form, "phone") ?? "",
    email: field(form, "email") ?? "",
  };
  const parsed = signupSchema.safeParse({
    ...values,
    marketingOptIn: form.get("marketingOptIn"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { name, phone, email, marketingOptIn } = parsed.data;
  const sent = await issueCode({
    phone,
    purpose: "SIGNUP",
    payload: { name, email, marketingOptIn },
  });
  if (!sent.ok) return { error: sent.error, values };

  redirect(verifyUrl(safeNextPath(field(form, "next"))));
}

// ------------------------------------------------------------------- log in

export async function startLogin(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { phone: field(form, "phone") ?? "" };
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const sent = await issueCode({ phone: parsed.data.phone, purpose: "LOGIN" });
  if (!sent.ok) return { error: sent.error, values };

  redirect(verifyUrl(safeNextPath(field(form, "next"))));
}

// ------------------------------------------------------------------- verify

export async function submitCode(_prev: FormState, form: FormData): Promise<FormState> {
  const next = safeNextPath(field(form, "next"));
  const parsed = codeSchema.safeParse(field(form, "code") ?? "");
  if (!parsed.success) return { fieldErrors: { code: parsed.error.issues[0]?.message } };

  const result = await verifyCode(parsed.data);
  if (!result.ok) return { error: result.error };

  return completeVerifiedChallenge(result.challenge, next);
}

export async function resendCode(_prev: FormState): Promise<FormState> {
  const challenge = await getActiveChallenge();
  if (!challenge || challenge.verifiedAt || challenge.consumedAt) {
    return { error: "This sign-in has expired. Please start again." };
  }

  const sent = await issueCode({
    phone: challenge.phone,
    purpose: challenge.purpose,
    payload: (challenge.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    userId: challenge.userId ?? undefined,
  });
  return sent.ok ? { notice: "We sent you a new code.", sentAt: Date.now() } : { error: sent.error };
}

async function completeVerifiedChallenge(
  challenge: ActiveChallenge,
  next: string,
): Promise<FormState> {
  if (challenge.purpose === "CHANGE_PHONE") return completePhoneChange(challenge);

  const existing = await prisma.user.findUnique({ where: { phone: challenge.phone } });

  if (existing) {
    if (!(await consumeChallenge(challenge.id))) {
      return { error: "That code was already used. Please start again." };
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { phoneVerified: true, lastLoginAt: new Date() },
    });
    await signInAndLeave(existing.id, next);
  }

  // A new number. If they came through sign-up we already have their details.
  const payload = signupPayloadSchema.safeParse(challenge.payload);
  if (challenge.purpose === "SIGNUP" && payload.success) {
    if (!(await consumeChallenge(challenge.id))) {
      return { error: "That code was already used. Please start again." };
    }
    const userId = await createCustomer(challenge.phone, payload.data);
    await signInAndLeave(userId, next);
  }

  // Logged in with a number we have never seen: the phone is now proven, so it
  // is safe to say there is no account yet and ask for their name.
  redirect(`/signup/details?next=${encodeURIComponent(next)}`);
}

async function completePhoneChange(challenge: ActiveChallenge): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.id !== challenge.userId) {
    return { error: "Please log in again to change your number." };
  }

  const owner = await prisma.user.findUnique({ where: { phone: challenge.phone } });
  if (!(await consumeChallenge(challenge.id))) {
    return { error: "That code was already used. Please start again." };
  }
  await clearChallengeCookie();

  if (owner && owner.id !== user.id) {
    return { error: "That number belongs to another account. Log in with it instead." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { phone: challenge.phone, phoneVerified: true },
  });
  redirect("/account?updated=phone");
}

// ---------------------------------------------- finish sign-up after log in

export async function finishSignup(_prev: FormState, form: FormData): Promise<FormState> {
  const next = safeNextPath(field(form, "next"));
  const values = { name: field(form, "name") ?? "", email: field(form, "email") ?? "" };

  const challenge = await getVerifiedUnspentChallenge();
  if (!challenge || challenge.purpose === "CHANGE_PHONE") {
    return { error: "Your verification expired. Please log in again." };
  }

  const parsed = detailsSchema.safeParse({
    ...values,
    marketingOptIn: form.get("marketingOptIn"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  if (!(await consumeChallenge(challenge.id))) {
    return { error: "Your verification expired. Please log in again." };
  }
  const userId = await createCustomer(challenge.phone, parsed.data);
  await signInAndLeave(userId, next);
  return undefined;
}

// ------------------------------------------------------------------ log out

export async function logout(): Promise<void> {
  await endCurrentSession();
  redirect("/");
}

export async function logoutEverywhere(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await endAllSessions(user.id);
  else await endCurrentSession();
  redirect("/login?signedOut=all");
}

// ------------------------------------------------------------------ helpers

async function createCustomer(
  phone: string,
  details: { name: string; email: string | null; marketingOptIn: boolean },
): Promise<string> {
  try {
    const user = await prisma.user.create({
      data: {
        phone,
        name: details.name,
        email: details.email,
        marketingOptIn: details.marketingOptIn,
        phoneVerified: true,
        lastLoginAt: new Date(),
        role: "CUSTOMER",
      },
      select: { id: true },
    });
    return user.id;
  } catch (error) {
    // Two tabs racing to create the same account: the loser signs in to the winner's.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.user.findUniqueOrThrow({ where: { phone } });
      return existing.id;
    }
    throw error;
  }
}

async function signInAndLeave(userId: string, next: string): Promise<never> {
  await createSession(userId);
  await clearChallengeCookie();
  redirect(next);
}
