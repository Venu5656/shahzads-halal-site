import type { Metadata } from "next";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { logout } from "@/lib/auth/actions";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Manager area · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

/**
 * The manager area — the only reason anyone signs in to this site.
 *
 * Ordering, payment, tracking and support are DoorDash's. What is left for
 * Shahzad is the menu: changing a price when he changes it on the ordering
 * page, and marking something sold out when the lamb runs out at one in the
 * morning. The editors for both are built next; the gate is already real.
 *
 * The log-out button lives here rather than in the site header. The header is
 * what a customer sees, and a customer should never learn this site has a
 * login — but somebody who has signed in on the shop's shared tablet has to be
 * able to sign out again.
 */
export default async function AdminPage() {
  const user = await requireRole(STAFF_ROLES, "/admin");

  return (
    <>
      <KuroHeader />
      <main className="wrap pt-10 pb-24 sm:pt-16">
        <span className="eyebrow">Manager area</span>
        <h1 className="mt-3 mb-6 font-display text-[clamp(48px,9vw,96px)] leading-[0.88] font-black tracking-normal uppercase">
          Coming in{" "}
          <em className="font-serif text-[0.8em] font-bold tracking-[-0.03em] text-gold normal-case italic">
            phase 5.
          </em>
        </h1>
        <p className="max-w-[560px] text-muted">
          Signed in as {user.name} ({user.role.toLowerCase()}). Price editing and the sold-out
          switch will be built here.
        </p>
        <form action={logout} className="mt-8">
          <button type="submit" className="btn btn-ghost">
            Log out
          </button>
        </form>
      </main>
    </>
  );
}
