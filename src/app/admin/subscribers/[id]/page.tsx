import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../../kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";
import { person } from "@/lib/subscribers/roster";
import { STORE_TIME_ZONE } from "@/lib/hours";

export const metadata: Metadata = {
  title: "On the list · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * One person, and the proof that they asked.
 *
 * This page exists for a situation that has not happened yet and eventually
 * will: somebody says they never signed up. Under the TCPA the burden is on
 * the sender, per message, and it runs to $1,500 of it. The ConsentEvent rows
 * are the answer — what they typed, when, from which address, and the exact
 * wording they agreed to — and until this page they were written and never
 * readable.
 *
 * The ledger is append-only, enforced by a database trigger rather than by
 * convention, so what is shown here cannot have been tidied up afterwards.
 * That is the entire value of it: a record somebody could have edited proves
 * nothing at all.
 */

const ACTION_WORD: Record<string, string> = {
  GRANTED: "asked for offers",
  CONFIRMED: "confirmed it",
  REVOKED: "asked to stop",
};

export default async function SubscriberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(STAFF_ROLES, "/admin/subscribers");
  const who = await person((await params).id);
  if (!who) notFound();

  const when = (at: Date) =>
    at.toLocaleString("en-US", {
      timeZone: STORE_TIME_ZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const facts: [string, string][] = [
    ["Joined", when(who.createdAt)],
    ["Email", who.emailState],
    ["SMS", who.smsState === "none" ? "never given a number" : who.smsState],
    ["Offers sent", String(who.sends)],
  ];

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      <KuroHeader />

      <main className="mx-auto max-w-[840px] px-6 pt-8 pb-24 sm:px-10">
        <Link href="/admin/subscribers" className="kuro-label" style={{ color: "var(--muted)" }}>
          ← The list
        </Link>

        <h1 className="kuro-serif mt-4 text-[clamp(28px,4.4vw,44px)] break-words">{who.email}</h1>
        {who.phone ? (
          <p className="mt-3 text-[15.5px]" style={{ color: "var(--muted)" }}>
            {who.phone}
          </p>
        ) : null}

        <dl
          className="mt-10 grid gap-px border-t sm:grid-cols-4"
          style={{ borderColor: "var(--line)" }}
        >
          {facts.map(([term, value]) => (
            <div key={term} className="border-b py-5 sm:border-b-0" style={{ borderColor: "var(--line)" }}>
              <dt className="kuro-label">{term}</dt>
              <dd className="mt-2 text-[15.5px]" style={{ color: "var(--ink)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-14">
          <h2 className="kuro-label kuro-label-accent">What they agreed to, and when</h2>
          {who.events.length === 0 ? (
            <p className="mt-5 text-[15.5px]" style={{ color: "var(--muted)" }}>
              No consent events recorded. Anyone on the list from before the ledger existed will
              look like this.
            </p>
          ) : (
            <ul className="mt-5 flex flex-col">
              {who.events.map((e) => (
                <li
                  key={e.id}
                  className="border-t py-5"
                  style={{ borderColor: "var(--line)" }}
                >
                  <p className="text-[16px]">
                    {e.channel === "EMAIL" ? "Email" : "SMS"} ·{" "}
                    {ACTION_WORD[e.action] ?? e.action.toLowerCase()}
                  </p>
                  <p className="mt-1.5 text-[14px]" style={{ color: "var(--muted)" }}>
                    {when(e.createdAt)} · {e.target}
                  </p>
                  <p
                    className="mt-1.5 font-mono text-[12.5px] break-words"
                    style={{ color: "var(--muted-dim)" }}
                  >
                    wording {e.disclosureVersion} · via {e.source}
                    {e.ip ? ` · from ${e.ip}` : ""}
                  </p>
                  {e.userAgent ? (
                    <p
                      className="mt-1 font-mono text-[12px] break-words"
                      style={{ color: "var(--muted-dim)" }}
                    >
                      {e.userAgent}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-8 max-w-[62ch] text-[14px]" style={{ color: "var(--muted-dim)" }}>
            These rows cannot be changed or deleted — the database refuses it, so what is above is
            what was written at the time. That is the point of keeping them.
          </p>
        </section>
      </main>
    </div>
  );
}
