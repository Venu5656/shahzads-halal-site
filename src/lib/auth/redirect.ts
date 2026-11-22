/**
 * Where to send someone after they sign in. Only same-site relative paths are
 * allowed — "//evil.com" and "/\evil.com" are protocol-relative tricks that
 * browsers treat as another origin.
 */
export function safeNextPath(next: unknown, fallback = "/admin"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  // Never bounce back into the sign-in flow itself.
  if (/^\/(login|signup)(\/|\?|$)/.test(next)) return fallback;
  return next;
}
