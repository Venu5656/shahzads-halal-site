import type { Metadata } from "next";
import Link from "next/link";
import "../../../kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { OfferComposer } from "@/components/admin/OfferComposer";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";
import { audienceSize } from "@/lib/offers/send";

export const metadata: Metadata = {
  title: "Write an offer · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  const user = await requireRole(STAFF_ROLES, "/admin/offers/new");
  const audience = await audienceSize();

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      <KuroHeader />
      <main className="mx-auto max-w-[640px] px-6 pt-8 pb-24 sm:px-10">
        <Link href="/admin/offers" className="kuro-label" style={{ color: "var(--muted)" }}>
          ← Offers
        </Link>
        <h1 className="kuro-serif mt-5 mb-9 text-[clamp(32px,5vw,48px)]">Write an offer.</h1>
        <OfferComposer audience={audience} from={user.email} />
      </main>
    </div>
  );
}
