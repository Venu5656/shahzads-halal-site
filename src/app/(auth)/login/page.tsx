import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard, AuthTabs } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { FormAlert } from "@/components/ui/form";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Log in · Shahzad's Halal Food" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; signedOut?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <>
      <AuthTabs active="login" next={params.next ? next : undefined} />
      <AuthCard
        eyebrow="Welcome back"
        title="Log"
        accent="in."
        intro="Your mobile number and password get you back in."
      >
        {params.signedOut === "all" ? (
          <div className="mb-5">
            <FormAlert notice="You're signed out on every device." />
          </div>
        ) : null}
        <LoginForm next={next} />
      </AuthCard>
    </>
  );
}
