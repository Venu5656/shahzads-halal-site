import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard, AuthTabs } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Sign up · Shahzad's Halal Food" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <>
      <AuthTabs active="signup" next={params.next ? next : undefined} />
      <AuthCard
        eyebrow="New here?"
        title="Join the"
        accent="late-night crew."
        intro="Order ahead, skip the line, and we'll text you when it's hot."
      >
        <SignupForm next={next} />
      </AuthCard>
    </>
  );
}
