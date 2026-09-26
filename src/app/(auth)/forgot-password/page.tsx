import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Forgotten password · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  // Someone already logged in wants the change-password form, not this one.
  if (await getCurrentUser()) redirect("/account");

  return (
    <AuthCard
      eyebrow="Forgotten password"
      title="Send me"
      accent="a link."
      intro="Type the address on your account. If it's registered, a link to choose a new password is on its way."
    >
      <ForgotPasswordForm />
      <p className="mt-7 text-center text-[13px] leading-relaxed text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-gold underline-offset-4 hover:underline">
          Log in
        </Link>
        .
      </p>
    </AuthCard>
  );
}
