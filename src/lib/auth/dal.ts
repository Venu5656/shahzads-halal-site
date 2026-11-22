import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { SESSION_COOKIE } from "./cookies";
import { validateSessionToken } from "./session";

/**
 * The data access layer: the ONLY place that decides who the current user is.
 * Every page, server action and route handler that needs a user goes through
 * here — the proxy's cookie check is just a fast pre-filter, never the gate.
 */

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** The signed-in user, or null. Memoised per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
});

/** The signed-in user, or a redirect to /login that comes back here afterwards. */
export async function requireUser(returnTo = "/admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/**
 * The signed-in user if they hold one of `roles`. Anyone else gets a 404 rather
 * than a 403, so the manager area does not advertise that it exists.
 */
export async function requireRole(roles: Role[], returnTo = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!roles.includes(user.role)) notFound();
  return user;
}

export const STAFF_ROLES: Role[] = ["MANAGER", "OWNER"];
