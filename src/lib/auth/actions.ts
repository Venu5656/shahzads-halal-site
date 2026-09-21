"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "./dal";
import { decideLogin, lockoutMessage } from "./login-policy";
import { decoyVerify, hashPassword, needsRehash, verifyPassword } from "./password";
import { safeNextPath } from "./redirect";
import { requestMeta } from "./request";
import {
  field,
  fieldErrorsFrom,
  loginSchema,
  signupSchema,
  type FormState,
} from "./schemas";
import { createSession, endAllSessions, endCurrentSession } from "./session";

/**
 * Sign up, log in, log out.
 *
 * Accounts are created immediately: the phone number is the login name, a
 * password is the proof, and nothing is texted. Nothing here proves the number
 * actually belongs to the person — when SMS is switched on, verification slots
 * in on top and sets User.phoneVerified.
 *
 * Every server action is a public POST endpoint, so each validates its own
 * input with Zod and re-derives the user from the session.
 */

const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Deliberately identical whether the number is unknown or the password is wrong. */
const BAD_CREDENTIALS = "That number and password don't match.";

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
    marketingOptIn: form.get("marketingOptIn"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { name, phone, password, email, marketingOptIn } = parsed.data;
  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        email,
        marketingOptIn,
        role: "CUSTOMER",
        lastLoginAt: new Date(),
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        fieldErrors: {
          phone: "There's already an account with that number. Log in instead.",
        },
        values,
      };
    }
    throw error;
  }

  await createSession(userId);
  redirect(safeNextPath(field(form, "next")));
}

// ------------------------------------------------------------------- log in

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { phone: field(form, "phone") ?? "" };
  const parsed = loginSchema.safeParse({
    phone: values.phone,
    password: field(form, "password") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { phone, password } = parsed.data;
  const meta = await requestMeta();
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);

  const [phoneFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: { phone, success: false, createdAt: { gte: since } },
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
    phoneFailures.map((a) => a.createdAt),
    ipFailures.map((a) => a.createdAt),
  );
  if (!decision.ok) return { error: lockoutMessage(decision.retryAfterSec), values };

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, passwordHash: true },
  });

  // An unknown number still costs a full scrypt, so response time gives away
  // nothing about who has an account.
  const ok = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : await decoyVerify(password);

  await prisma.loginAttempt.create({
    data: { phone, ipHash: meta.ipHash, success: ok },
  });

  if (!ok) {
    // An invited manager who has not set a password yet cannot log in, and
    // must not be told that a half-made account exists.
    return { error: BAD_CREDENTIALS, values };
  }

  // Upgrade hashes written with older parameters, now that we have the password.
  await prisma.user.update({
    where: { id: user!.id },
    data: {
      lastLoginAt: new Date(),
      ...(needsRehash(user!.passwordHash!) ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  await createSession(user!.id);
  redirect(safeNextPath(field(form, "next")));
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
