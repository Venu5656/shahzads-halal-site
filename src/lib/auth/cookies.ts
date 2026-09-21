/**
 * Cookie names and options. Deliberately free of server-only imports so the
 * proxy can share them.
 *
 * On HTTPS the names carry the __Host- prefix, which makes the browser refuse
 * the cookie unless it is Secure, host-only and path=/ — so a sibling
 * subdomain can never plant or read it.
 */

export const SECURE_COOKIES = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

const prefix = SECURE_COOKIES ? "__Host-" : "";

export const SESSION_COOKIE = `${prefix}shz_session`;
export const CHALLENGE_COOKIE = `${prefix}shz_otp`;

/** Sessions last 30 days and slide forward while in use. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** The sign-in challenge only needs to outlive the code plus the details step. */
export const CHALLENGE_TTL_MS = 20 * 60 * 1000;

export const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: SECURE_COOKIES,
  path: "/",
};

export const sessionCookieOptions = {
  ...baseCookieOptions,
  maxAge: SESSION_TTL_MS / 1000,
};

export const challengeCookieOptions = {
  ...baseCookieOptions,
  maxAge: CHALLENGE_TTL_MS / 1000,
};
