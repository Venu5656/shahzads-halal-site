import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { consumeVerificationToken } from "@/lib/auth/email-flows";

export const metadata: Metadata = {
  title: "Confirming your email · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

/**
 * The page a verification link lands on.
 *
 * Opening the link spends the token, so this route is deliberately dynamic and
 * uncached: a prefetch or a CDN copy would burn the link before the customer
 * ever saw the result.
 */
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await consumeVerificationToken(token)
    : ({ ok: false, reason: "invalid" } as const);

  if (result.ok) {
    return (
      <AuthCard
        eyebrow="All set"
        title="Email"
        accent="confirmed."
        intro={
          result.changed
            ? "Your account now uses this address. For safety we've signed you out everywhere — log in again with the new address."
            : "That's your address proved. Log in and you're ready to order."
        }
      >
        <Link
          href="/login"
          className="btn btn-red w-full justify-center !rounded-2xl !py-4 text-[17px]"
        >
          Log in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="That link didn't work"
      title="Link"
      accent={result.reason === "expired" ? "expired." : "not valid."}
      intro={
        result.reason === "expired"
          ? "Links last a day and can only be used once — this one is spent. Enter your address and we'll send a fresh one."
          : "That link doesn't match an account. It may have been broken across two lines by your mail app. Enter your address and we'll send a new one."
      }
    >
      <ResendVerificationForm defaultEmail="" />
      <p className="mt-7 text-center text-[13px] leading-relaxed text-muted">
        Already confirmed?{" "}
        <Link href="/login" className="text-gold underline-offset-4 hover:underline">
          Log in
        </Link>
        .
      </p>
    </AuthCard>
  );
}
