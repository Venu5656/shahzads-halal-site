import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyForm } from "@/components/auth/VerifyForm";
import { getActiveChallenge } from "@/lib/auth/otp";
import { maskPhone } from "@/lib/auth/phone";
import { safeNextPath } from "@/lib/auth/redirect";
import { peekDevCode } from "@/lib/auth/sms";

export const metadata: Metadata = { title: "Enter your code · Shahzad's Halal Food" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const challenge = await getActiveChallenge();
  if (!challenge || challenge.consumedAt) redirect("/login");
  if (challenge.verifiedAt) redirect(`/signup/details?next=${encodeURIComponent(next)}`);

  const devCode = peekDevCode(challenge.challengeHash);
  const startOver = challenge.purpose === "CHANGE_PHONE" ? "/account" : challenge.purpose === "SIGNUP" ? "/signup" : "/login";

  return (
    <AuthCard
      eyebrow={challenge.purpose === "CHANGE_PHONE" ? "Confirm your new number" : "Check your texts"}
      title="Enter your"
      accent="code."
      intro={
        <>
          We sent a 6-digit code to <b className="font-medium text-cream">{maskPhone(challenge.phone)}</b>.
          It expires in 5 minutes.{" "}
          <Link href={startOver} className="text-gold underline-offset-4 hover:underline">
            Wrong number?
          </Link>
        </>
      }
    >
      {devCode ? (
        <div
          data-testid="dev-otp"
          className="mb-6 rounded-2xl border border-dashed border-gold/60 bg-gold/10 px-4 py-3 text-[14px] text-cream"
        >
          <b className="block text-[12px] font-extrabold tracking-[0.14em] text-gold uppercase">
            Development mode — SMS is off
          </b>
          Your code is <span className="font-display text-[22px] font-extrabold tracking-[0.2em]">{devCode}</span>.
          In production this screen never shows it.
        </div>
      ) : null}
      <VerifyForm next={next} sentAt={challenge.createdAt.getTime()} />
    </AuthCard>
  );
}
