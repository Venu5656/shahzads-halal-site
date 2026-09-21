import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Manager area · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

/**
 * Placeholder for the phase 5 manager dashboard. It already sits behind the
 * real role check, so the gate is tested before anything valuable is behind it.
 */
export default async function AdminPage() {
  const user = await requireRole(STAFF_ROLES, "/admin");

  return (
    <>
      <SiteHeader>
        <Link
          href="/account"
          className="rounded-full px-4 py-2 text-[15px] font-medium text-muted transition-colors hover:bg-cream/5 hover:text-cream"
        >
          Account
        </Link>
      </SiteHeader>
      <main className="wrap pt-10 pb-24 sm:pt-16">
        <span className="eyebrow">Manager area</span>
        <h1 className="mt-3 mb-6 font-display text-[clamp(48px,9vw,96px)] leading-[0.88] font-black tracking-normal uppercase">
          Coming in{" "}
          <em className="font-serif text-[0.8em] font-bold tracking-[-0.03em] text-gold normal-case italic">
            phase 5.
          </em>
        </h1>
        <p className="max-w-[560px] text-muted">
          Signed in as {user.name} ({user.role.toLowerCase()}). The live order queue, menu and
          price editing, and the sales dashboard will be built here.
        </p>
      </main>
    </>
  );
}
