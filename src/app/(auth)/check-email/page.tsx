import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { emailSchema } from "@/lib/auth/schemas";
import { maskEmail, VERIFY_TTL_MS, RESET_TTL_MS } from "@/lib/auth/email-policy";

export const metadata: Metadata = {
  title: "Check your email · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

/**
 * Shown after asking for a password reset, and after trying to log in to an
 * account whose address has never been proved.
 *
 * It says the same thing in both cases and never confirms whether an account
 * exists — the address it echoes back is simply the one that was typed,
 * masked, and it is validated here so the page cannot be used to bounce
 * arbitrary text back at someone.
 */
export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; for?: string; again?: string }>;
}) {
  const params = await searchParams;
  const parsed = emailSchema.safeParse(params.to ?? "");
  const masked = parsed.success ? maskEmail(parsed.data) : "your inbox";
  const isReset = params.for === "reset";
  const hours = Math.round(VERIFY_TTL_MS / 3600000);
  const minutes = Math.round(RESET_TTL_MS / 60000);

  return (
    <AuthCard
      eyebrow={isReset ? "Password reset" : "One more step"}
      title="Check"
      accent="your email."
      intro={
        <>
          We&apos;ve sent a link to <strong className="text-cream">{masked}</strong>.{" "}
          {isReset
            ? `Open it within ${minutes} minutes to choose a new password.`
            : `Open it within ${hours} hours to finish setting up your account.`}
        </>
      }
    >
      {params.again === "1" ? (
        <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-[15px] leading-relaxed text-cream">
          Your password was right — the address just hasn&apos;t been confirmed yet. Open the
          link that came with the invitation, or ask for a fresh one below.
        </p>
      ) : null}

      <ul className="mb-7 flex flex-col gap-3 text-[15px] leading-relaxed text-muted">
        <li>Nothing after a minute? Look in spam or promotions.</li>
        {isReset ? (
          <li>
            If that address doesn&apos;t have an account, no email was sent — that&apos;s why we
            can&apos;t tell you either way.
          </li>
        ) : (
          <li>The link only works once, and a new one replaces the old.</li>
        )}
      </ul>

      {isReset ? null : <ResendVerificationForm defaultEmail={parsed.success ? parsed.data : ""} />}

      <p className="mt-7 text-center text-[13px] leading-relaxed text-muted">
        <Link href="/login" className="text-gold underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
