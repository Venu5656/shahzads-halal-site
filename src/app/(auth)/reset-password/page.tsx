import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { resetTokenState } from "@/lib/auth/email-flows";
import { maskEmail } from "@/lib/auth/email-policy";

export const metadata: Metadata = {
  title: "Choose a new password · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

/** Reading the token must not be cached — and it is checked, not spent, here. */
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const state = token ? await resetTokenState(token) : ({ ok: false } as const);

  if (!state.ok) {
    return (
      <AuthCard
        eyebrow="That link didn't work"
        title="Link"
        accent="expired."
        intro="Reset links last an hour and can only be used once. Ask for a fresh one and it'll be in your inbox in a moment."
      >
        <Link
          href="/forgot-password"
          className="btn btn-red w-full justify-center !rounded-2xl !py-4 text-[17px]"
        >
          Send me a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Password reset"
      title="Choose a"
      accent="new one."
      intro={<>Setting a new password for {maskEmail(state.email)}.</>}
    >
      <ResetPasswordForm token={token!} />
    </AuthCard>
  );
}
