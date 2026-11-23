import type { Metadata } from "next";
import Link from "next/link";
import "../../kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { audienceSize } from "@/lib/offers/send";
import { STORE_TIME_ZONE } from "@/lib/hours";

export const metadata: Metadata = {
  title: "Offers · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Everything that has been sent, and the way to send another.
 *
 * The number at the top is the only metric here on purpose: how many people
 * have confirmed an address. It is the one figure that changes what he should
 * do — it is worth writing an offer for four hundred people and it is not worth
 * writing one for six — and a page of open rates he cannot act on would just be
 * a page he stops opening.
 */
export default async function OffersPage() {
  await requireRole(STAFF_ROLES, "/admin/offers");
  const [audience, offers] = await Promise.all([
    audienceSize(),
    prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { _count: { select: { sends: true } } },
    }),
  ]);

  const when = (at: Date) =>
    at.toLocaleString("en-US", {
      timeZone: STORE_TIME_ZONE,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      <KuroHeader />
      <main className="mx-auto max-w-[840px] px-6 pt-8 pb-24 sm:px-10">
        <p className="kuro-label kuro-label-accent">Manager</p>
        <h1 className="kuro-serif mt-4 text-[clamp(34px,5vw,54px)]">Offers.</h1>
        <p className="mt-4 text-[16px] leading-[1.7]" style={{ color: "var(--muted)" }}>
          {audience === 0 ? (
            <>Nobody has confirmed an address yet. The sign-up is on the homepage.</>
          ) : (
            <>
              <strong style={{ color: "var(--ink)" }}>{audience}</strong>{" "}
              {audience === 1 ? "person has" : "people have"} confirmed an address and can be
              sent to.
            </>
          )}
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/admin/offers/new" className="kuro-cta">
            Write an offer
          </Link>
          <Link
            href="/admin/subscribers"
            className="rounded-full border px-6 py-3.5 text-[15px] font-semibold"
            style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
          >
            See who they are
          </Link>
          <Link
            href="/admin"
            className="rounded-full border px-6 py-3.5 text-[15px] font-semibold"
            style={{ borderColor: "var(--line)", color: "var(--muted)" }}
          >
            Back to the menu
          </Link>
        </div>

        <ul className="mt-14 flex flex-col">
          {offers.map((offer) => (
            <li key={offer.id} className="border-t py-6" style={{ borderColor: "var(--line)" }}>
              <Link href={`/admin/offers/${offer.id}`} className="block">
                <p className="text-[17px]">{offer.subject}</p>
                <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted-dim)" }}>
                  {when(offer.createdAt)} · {offer.createdByName} · {offer._count.sends}{" "}
                  {offer._count.sends === 1 ? "recipient" : "recipients"} ·{" "}
                  {offer.status === "SENDING"
                    ? "still sending"
                    : offer.status === "SENT_WITH_FAILURES"
                      ? "sent, some did not arrive"
                      : offer.status.toLowerCase()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {offers.length === 0 ? (
          <p className="mt-14 text-[15px]" style={{ color: "var(--muted)" }}>
            Nothing sent yet.
          </p>
        ) : null}
      </main>
    </div>
  );
}
