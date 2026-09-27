/**
 * Whether payments are wired up yet.
 *
 * Deliberately free of server-only imports so both the page and the client
 * bundle can ask. It only ever reports whether keys *exist* — never what they
 * are — and the secret key is read on the server alone.
 */

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET,
  );
}

/** The publishable key, which is designed to ship to the browser. */
export function publishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}
