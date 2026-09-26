"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "./dal";
import { issueEmailToken, spendEmailToken } from "./email-tokens";
import { cooldownMessage, maskEmail } from "./email-policy";
import { decideLogin, lockoutMessage } from "./login-policy";
import { decoyVerify, hashPassword, needsRehash, verifyPassword } from "./password";
import { safeNextPath } from "./redirect";
import { requestMeta } from "./request";
import {
  emailOnlySchema,
  field,
  fieldErrorsFrom,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type FormState,
} from "./schemas";
import { createSession, endAllSessions, endCurrentSession } from "./session";

/**
 * Sign up, log in, log out, and the two emailed journeys: proving an address
 * and resetting a forgotten password.
 *
 * Signing up no longer logs you in. The account is created unverified, a link
 * goes to the address, and the password only works once that link is opened —
 * which is what stops someone signing up with an address that isn't theirs and
 * what keeps a typo'd address from becoming an unreachable customer.
 *
 * Phone numbers are still collected (the kitchen calls about pickups) but are
 * not proved: SMS verification slots in on top when 10DLC registration clears.
 *
 * Every server action here is a public POST endpoint, so each validates its own
 * input with Zod and re-derives the user from the session.
 */

const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Deliberately identical whether the account is unknown or the password is wrong. */
const BAD_CREDENTIALS = "That email or number and password don't match.";

// ------------------------------------------------------------------ sign up

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const values = {
    name: field(form, "name") ?? "",
    phone: field(form, "phone") ?? "",
    email: field(form, "email") ?? "",
  };
  const parsed = signupSchema.safeParse({
    ...values,
    password: field(form, "password") ?? "",
    acceptTerms: form.get("acceptTerms"),
    marketingOptIn: form.get("marketingOptIn"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { name, phone, email, password, marketingOptIn } = parsed.data;
  const passwordHash = await hashPassword(password);

  let user: { id: string; name: string } | null = null;
  try {
    user = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        passwordHash,
        marketingOptIn,
        role: "CUSTOMER",
      },
      select: { id: true, name: true },
    });
  } catch (error) {
    const taken =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!taken) throw error;
    // Either the address or the number already has an account. Both cases end
    // on the same screen as a real signup: saying "that number is taken" would
    // turn this form into a way to ask whether someone eats here.
  }

  if (user) {
    await issueEmailToken({
      userId: user.id,
      name: user.name,
      email,
      purpose: "VERIFY_EMAIL",
    });
  } else {
    // The address may belong to an account that never finished verifying —
    // most likely this same person, trying again. Send that account its link.
    // A verified account gets nothing: it already exists, and its owner can
    // log in or reset. Either way the browser sees the same screen.
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerifiedAt: true },
    });
    if (existing && !existing.emailVerifiedAt) {
      await issueEmailToken({
        userId: existing.id,
        name: existing.name,
        email,
        purpose: "VERIFY_EMAIL",
      });
    }
  }

  redirect(`/check-email?to=${encodeURIComponent(email)}&for=verify`);
}

// ------------------------------------------------------------------- log in

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { identifier: field(form, "identifier") ?? "" };
  const parsed = loginSchema.safeParse({
    identifier: values.identifier,
    password: field(form, "password") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { identifier, password } = parsed.data;
  const meta = await requestMeta();
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);

  const [identifierFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: { identifier: identifier.value, success: false, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    meta.ipHash
      ? prisma.loginAttempt.findMany({
          where: { ipHash: meta.ipHash, success: false, createdAt: { gte: since } },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const decision = decideLogin(
    identifierFailures.map((a) => a.createdAt),
    ipFailures.map((a) => a.createdAt),
  );
  if (!decision.ok) return { error: lockoutMessage(decision.retryAfterSec), values };

  const user = await prisma.user.findUnique({
    where:
      identifier.kind === "email" ? { email: identifier.value } : { phone: identifier.value },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      emailVerifiedAt: true,
    },
  });

  // An unknown account still costs a full scrypt, so response time gives away
  // nothing about who has one.
  const ok = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : await decoyVerify(password);

  await prisma.loginAttempt.create({
    data: { identifier: identifier.value, ipHash: meta.ipHash, success: ok },
  });

  if (!ok || !user) {
    // An invited manager who has not set a password yet cannot log in, and
    // must not be told that a half-made account exists.
    return { error: BAD_CREDENTIALS, values };
  }

  // The password was right, so we may talk about this account: sending them
  // somewhere useful is not a leak, it is the point of verification. No new
  // link is issued here — the one from signup is probably still good, and the
  // page carries a resend button that reports its own cooldown honestly.
  if (!user.emailVerifiedAt) {
    redirect(`/check-email?to=${encodeURIComponent(user.email)}&for=verify&again=1`);
  }

  // Upgrade hashes written with older parameters, now that we have the password.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      ...(needsRehash(user.passwordHash!) ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  await createSession(user.id);
  redirect(safeNextPath(field(form, "next")));
}

// ------------------------------------------------------- proving an address

export async function resendVerification(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse({ email: field(form, "email") ?? "" });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, emailVerifiedAt: true },
  });

  if (user && !user.emailVerifiedAt) {
    const result = await issueEmailToken({
      userId: user.id,
      name: user.name,
      email,
      purpose: "VERIFY_EMAIL",
    });
    if (!result.sent) return { error: cooldownMessage(result.retryAfterSec) };
  }

  return { notice: `Sent. Check ${maskEmail(email)} for the link.` };
}

// ---------------------------------------------------- forgotten passwords

export async function requestPasswordReset(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const values = { email: field(form, "email") ?? "" };
  const parsed = emailOnlySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, emailVerifiedAt: true },
  });

  if (user) {
    // An unverified account gets a verification link instead: letting someone
    // set a password on an address they have never proved would make the
    // verification step pointless.
    await issueEmailToken({
      userId: user.id,
      name: user.name,
      email,
      purpose: user.emailVerifiedAt ? "RESET_PASSWORD" : "VERIFY_EMAIL",
    });
  }

  redirect(`/check-email?to=${encodeURIComponent(email)}&for=reset`);
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: field(form, "token") ?? "",
    newPassword: field(form, "newPassword") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { token, newPassword } = parsed.data;
  const spent = await spendEmailToken(token, "RESET_PASSWORD");
  if (!spent.ok) {
    return {
      error:
        spent.reason === "expired"
          ? "That link has expired or was already used. Ask for a new one."
          : "That link isn't valid. Ask for a new one.",
    };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: spent.userId },
    data: {
      passwordHash,
      // Proving control of the inbox proves the address; an account that reset
      // its password has demonstrably received mail there.
      emailVerifiedAt: new Date(),
    },
  });

  // Whoever knew the old password is signed out everywhere. If the reset was
  // prompted by someone else being in the account, this is what evicts them.
  await endAllSessions(spent.userId);
  // Any other reset link still in flight dies with it.
  await prisma.emailToken.updateMany({
    where: { userId: spent.userId, purpose: "RESET_PASSWORD", consumedAt: null },
    data: { consumedAt: new Date() },
  });

  redirect("/login?reset=1");
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
