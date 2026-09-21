import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { DetailsForm } from "@/components/auth/DetailsForm";
import { getVerifiedUnspentChallenge } from "@/lib/auth/otp";
import { formatPhone } from "@/lib/auth/phone";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Finish signing up · Shahzad's Halal Food" };

/** Reached after logging in with a verified number that has no account yet. */
export default async function DetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const challenge = await getVerifiedUnspentChallenge();
  if (!challenge || challenge.purpose === "CHANGE_PHONE") redirect("/login");

  return (
    <AuthCard
      eyebrow="Number confirmed"
      title="Almost"
      accent="there."
      intro={
        <>
          There&apos;s no account for <b className="font-medium text-cream">{formatPhone(challenge.phone)}</b> yet.
          Tell us your name and you&apos;re in.
        </>
      }
    >
      <DetailsForm next={next} />
    </AuthCard>
  );
}
