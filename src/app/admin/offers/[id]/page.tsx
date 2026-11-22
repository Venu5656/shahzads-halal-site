import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../../kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { PushButton } from "@/components/admin/PushButton";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { STORE_TIME_ZONE } from "@/lib/hours";

export const metadata: Metadata = {
  title: "Offer · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * One offer, and how it went.
 *
 * The counts are read from the send rows rather than from a tally kept on the
 * offer, so they cannot be wrong: the rows ARE the record of who got it.
 *
 * Failures are listed with their reason, because the only useful thing to do
 * with a bounced address is look at it. Most of them are typos somebody made
 * at the counter, and seeing three in a row from the same evening is how you
 * find out the tablet's keyboard is sticking.
 */
export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(STAFF_ROLES, "/admin/offers");
  const { id } = await params;

  const offer = await prisma.offer.findUnique({ where: { id } });
  if (!offer) notFound();

  const [sent, failed, pending, failures] = await Promise.all([
    prisma.offerSend.count({ where: { offerId: id, status: "SENT" } }),
    prisma.offerSend.count({ where: { offerId: id, status: "FAILED" } }),
    prisma.offerSend.count({ where: { offerId: id, status: "PENDING" } }),
    prisma.offerSend.findMany({
      where: { offerId: id, status: "FAILED" },
      take: 50,
      select: { email: true, error: true },
    }),
  ]);

  const when = (at: Date | null) =>
    at
      ? at.toLocaleString("en-US", {
          timeZone: STORE_TIME_ZONE,
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      <KuroHeader />
      <main className="mx-auto max-w-[760px] px-6 pt-8 pb-24 sm:px-10">
        <Link href="/admin/offers" className="kuro-label" style={{ color: "var(--muted)" }}>
          ← Offers
        </Link>

        <h1 className="kuro-serif mt-5 text-[clamp(30px,4.4vw,44px)]">{offer.subject}</h1>
        <p className="mt-3 text-[14px]" style={{ color: "var(--muted-dim)" }}>
          Written by {offer.createdByName} · started {when(offer.startedAt)}
          {offer.finishedAt ? ` · finished ${when(offer.finishedAt)}` : ""}
        </p>

        <dl className="mt-9 grid grid-cols-3 gap-px border-t" style={{ borderColor: "var(--line)" }}>
          {[
            ["Sent", String(sent)],
            ["Did not arrive", String(failed)],
            ["Still to go", String(pending)],
          ].map(([term, value]) => (
            <div key={term} className="py-6">
              <dt className="kuro-label">{term}</dt>
              <dd className="kuro-serif mt-2 text-[28px]">{value}</dd>
            </div>
          ))}
        </dl>

        {pending > 0 ? (
          <div className="mt-2">
            <p className="mb-4 text-[15px] leading-[1.7]" style={{ color: "var(--muted)" }}>
              The rest go out on their own, a batch at a time. This button sends the next batch
              now if you would rather not wait.
            </p>
            <PushButton offerId={offer.id} />
          </div>
        ) : null}

        <section className="mt-14">
          <h2 className="kuro-label kuro-label-accent">What it said</h2>
          <div
            className="mt-5 rounded-3xl border p-7"
            style={{ borderColor: "var(--line)", background: "rgb(242 236 228 / 0.04)" }}
          >
            <p className="kuro-serif text-[26px]">{offer.heading}</p>
            {offer.body.map((paragraph, i) => (
              <p key={i} className="mt-4 text-[15.5px] leading-[1.8]" style={{ color: "var(--muted)" }}>
                {paragraph}
              </p>
            ))}
            <p className="kuro-label mt-7" style={{ color: "var(--muted-dim)" }}>
              Button: {offer.buttonLabel} → {offer.url}
            </p>
          </div>
        </section>

        {failures.length ? (
          <section className="mt-14">
            <h2 className="kuro-label kuro-label-accent">Did not arrive</h2>
            <ul className="mt-5 flex flex-col gap-2 text-[14.5px]">
              {failures.map((row) => (
                <li key={row.email}>
                  {row.email}{" "}
                  <span style={{ color: "var(--muted-dim)" }}>— {row.error ?? "unknown"}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
