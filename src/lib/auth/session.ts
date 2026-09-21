import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "./crypto";
import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions } from "./cookies";
import { requestMeta } from "./request";

/**
 * Database sessions. The cookie holds a random token; the database holds only
 * its SHA-256. Signing out deletes the row, so a stolen cookie dies the moment
 * its owner signs out — something a stateless JWT cannot do.
 */

export const sessionUserSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  marketingOptIn: true,
  createdAt: true,
} as const;

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const meta = await requestMeta();
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: meta.userAgent,
      ipHash: meta.ipHash,
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

/** Resolves a cookie token to its user, sliding the expiry forward when half spent. */
export async function validateSessionToken(token: string) {
  if (token.length > 128) return null;
  const id = sha256(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: sessionUserSelect } },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }
  if (session.expiresAt.getTime() - now < SESSION_TTL_MS / 2) {
    await prisma.session.update({
      where: { id },
      data: { expiresAt: new Date(now + SESSION_TTL_MS) },
    });
  }
  return { sessionId: id, user: session.user };
}

/** Sign out this device. */
export async function endCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete({ name: SESSION_COOKIE, path: "/" });
}

/** Sign out every device, this one included. */
export async function endAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
}
