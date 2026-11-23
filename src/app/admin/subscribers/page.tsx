import type { Metadata } from "next";
import Link from "next/link";
import "../../kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";
import { PAGE_SIZE, roster, rosterTotals } from "@/lib/subscribers/roster";
import { STORE_TIME_ZONE } from "@/lib/hours";

export const metadata: Metadata = {
  title: "The list · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Everyone who asked to hear about deals.
 *
 * The offers page shows a count, which is the right thing on that screen. This
 * is the list itself, because the count is not something he owns — and owning
 * the customers was the point of giving the ordering away.
 *
 * The search is here for the question somebody actually asks, which is not
 * "show me segment three", it is "am I on this?" at the counter, with their
 * phone in their hand.
 */

const STATE_COLOUR: Record<string, string> = {
  active: "var(--accent)",
  pending: "var(--muted)",
  stopped: "var(--muted-dim)",
  none: "var(--muted-dim)",
};

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireRole(STAFF_ROLES, "/admin/subscribers");
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 120);
  const page = Math.max(0, Number.parseInt(sp.page ?? "0", 10) || 0);

  const [totals, list] = await Promise.all([rosterTotals(), roster(q, page)]);

  const when = (at: Date) =>
    at.toLocaleDateString("en-US", {
      timeZone: STORE_TIME_ZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const href = (p: number) =>
    `/admin/subscribers?${new URLSearchParams({ ...(q ? { q } : {}), ...(p ? { page: String(p) } : {}) })}`;

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      <KuroHeader />

      <main className="mx-auto max-w-[1100px] px-6 pt-8 pb-24 sm:px-10">
        <Link href="/admin" className="kuro-label" style={{ color: "var(--muted)" }}>
          ← Menu
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="kuro-label kuro-label-accent">Manager</p>
            <h1 className="kuro-serif mt-4 text-[clamp(34px,5vw,54px)]">The list.</h1>
            <p className="mt-4 max-w-[62ch] text-[15.5px]" style={{ color: "var(--muted)" }}>
              {totals.all === 0 ? (
                <>Nobody has joined yet. The sign-up is on the homepage.</>
              ) : (
                <>
                  <strong style={{ color: "var(--ink)" }}>{totals.all}</strong>{" "}
                  {totals.all === 1 ? "person" : "people"} —{" "}
                  <strong style={{ color: "var(--ink)" }}>{totals.email}</strong> can be emailed,{" "}
                  {totals.pending} never confirmed, {totals.stopped} asked to stop.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/offers"
              className="rounded-full border px-5 py-3 text-[14px] font-semibold"
              style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
            >
              Offers
            </Link>
            {/* A plain link, not a fetch: it is a file, and the browser already
                knows how to save one. */}
            <a
              href="/api/admin/subscribers.csv"
              className="rounded-full border px-5 py-3 text-[14px] font-semibold"
              style={{ borderColor: "var(--line)", color: "var(--muted)" }}
            >
              Download CSV
            </a>
          </div>
        </div>

        <form className="mt-10 flex flex-wrap gap-3" action="/admin/subscribers">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="An address or a phone number"
            aria-label="Search the list"
            className="h-13 min-w-0 flex-1 rounded-2xl border px-4 py-3.5 text-[16px] outline-none"
            style={{
              borderColor: "var(--line)",
              background: "rgb(242 236 228 / 0.04)",
              color: "var(--ink)",
            }}
          />
          <button
            type="submit"
            className="rounded-full border px-6 py-3.5 text-[15px] font-semibold"
            style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
          >
            Search
          </button>
          {q ? (
            <Link
              href="/admin/subscribers"
              className="self-center text-[14.5px]"
              style={{ color: "var(--muted)" }}
            >
              Clear
            </Link>
          ) : null}
        </form>

        {list.rows.length === 0 ? (
          <p className="mt-12 text-[15.5px]" style={{ color: "var(--muted)" }}>
            {q ? `Nobody on the list matches “${q}”.` : "Nothing here yet."}
          </p>
        ) : (
          <>
            <ul className="mt-10 flex flex-col">
              {list.rows.map((row) => (
                <li key={row.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <Link
                    href={`/admin/subscribers/${row.id}`}
                    className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[16.5px]">{row.email}</p>
                      <p className="mt-1 text-[13px]" style={{ color: "var(--muted-dim)" }}>
                        {row.phone ? `${row.phone} · ` : ""}joined {when(row.joinedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-5">
                      <span
                        className="kuro-label"
                        style={{ color: STATE_COLOUR[row.emailState] }}
                      >
                        email {row.emailState}
                      </span>
                      <span className="kuro-label" style={{ color: STATE_COLOUR[row.smsState] }}>
                        {row.smsState === "none" ? "no sms" : `sms ${row.smsState}`}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {list.pages > 1 ? (
              <div className="mt-10 flex items-center gap-6">
                {page > 0 ? (
                  <Link href={href(page - 1)} className="text-[15px]" style={{ color: "var(--ink)" }}>
                    ← Newer
                  </Link>
                ) : null}
                <span className="kuro-label" style={{ color: "var(--muted-dim)" }}>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, list.total)} of{" "}
                  {list.total}
                </span>
                {page + 1 < list.pages ? (
                  <Link href={href(page + 1)} className="text-[15px]" style={{ color: "var(--ink)" }}>
                    Older →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
