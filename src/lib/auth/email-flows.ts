import "server-only";
import { prisma } from "@/lib/db";
import { sha256 } from "./crypto";
import { spendEmailToken } from "./email-tokens";
import { revokeAllSessions } from "./session";

/**
 * Reading and spending emailed links from a page render.
 *
 * These deliberately live outside actions.ts: every export of a "use server"
 * module is a public endpoint, and these take a token as their only argument.
 * Keeping them here means the only way to reach them is the route that is
 * supposed to — /verify-email and /reset-password.
 */

export type VerificationResult =
  | { ok: true; email: string; changed: boolean }
  | { ok: false; reason: "invalid" | "expired" };

/** Opens a verification link and marks the address proved. */
export async function consumeVerificationToken(token: string): Promise<VerificationResult> {
  const spent = await spendEmailToken(token, "VERIFY_EMAIL");
  if (!spent.ok) return spent;

  const user = await prisma.user.findUnique({
    where: { id: spent.userId },
    select: { id: true, email: true, pendingEmail: true, emailVerifiedAt: true },
  });
  if (!user) return { ok: false, reason: "invalid" };

  // A link issued for a change of address moves the account onto it.
  if (user.pendingEmail && user.pendingEmail === spent.email) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: spent.email, pendingEmail: null, emailVerifiedAt: new Date() },
    });
    // Moving an account to a new address ends every session. If the change was
    // not the owner's doing, this is what evicts whoever made it. The cookie
    // itself is left alone — this runs while rendering a page, where Next.js
    // forbids writing cookies, and a cookie pointing at a deleted session is
    // already worthless.
    await revokeAllSessions(user.id);
    return { ok: true, email: spent.email, changed: true };
  }

  // The token carries the address it was sent to, so a stale link cannot
  // verify an address the account has since moved away from.
  if (user.email !== spent.email) return { ok: false, reason: "invalid" };

  if (!user.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }
  return { ok: true, email: user.email, changed: false };
}

/**
 * Checks a reset link before the form is drawn, so a stale link says so up
 * front instead of after someone has chosen a new password. Reading it does
 * not spend it — resetPassword() does that.
 */
export async function resetTokenState(
  token: string,
): Promise<{ ok: true; email: string } | { ok: false }> {
  if (!token || token.length > 128) return { ok: false };
  const row = await prisma.emailToken.findUnique({
    where: { tokenHash: sha256(token) },
    select: { purpose: true, email: true, expiresAt: true, consumedAt: true },
  });
  if (!row || row.purpose !== "RESET_PASSWORD") return { ok: false };
  if (row.consumedAt || row.expiresAt.getTime() <= Date.now()) return { ok: false };
  return { ok: true, email: row.email };
}
