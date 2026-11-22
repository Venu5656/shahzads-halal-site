import type { Metadata } from "next";
import "../kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { PriceForm } from "@/components/admin/PriceForm";
import { StockForm } from "@/components/admin/StockForm";
import { logout } from "@/lib/auth/actions";
import { STAFF_ROLES, requireRole } from "@/lib/auth/dal";
import { listForManager } from "@/lib/menu/manage";
import { stockModeOf } from "@/lib/menu/stock";
import { STORE_TIME_ZONE } from "@/lib/hours";

export const metadata: Metadata = {
  title: "Manager area · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The menu manager — the only reason this site has a login.
 *
 * Two controls per dish, because there are exactly two things Shahzad needs to
 * change here: the price, when he changes it on the ordering page too, and
 * whether a dish is on, when the lamb runs out at one in the morning.
 *
 * Nothing else. No dashboard, no charts, no order queue: the orders are not
 * ours to show. A manager screen that mostly shows things you cannot act on is
 * a screen nobody opens, and this one has to be opened in a hurry, one-handed,
 * on a phone behind a counter.
 *
 * The log-out button is here rather than in the site header, because the header
 * is what a customer sees and a customer should never learn this site has a
 * login — but somebody signed in on the shop's shared tablet has to be able to
 * sign out.
 */
export default async function AdminPage() {
  const user = await requireRole(STAFF_ROLES, "/admin");
  const items = await listForManager();
  const now = new Date();

  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    const list = byCategory.get(item.categoryName) ?? [];
    list.push(item);
    byCategory.set(item.categoryName, list);
  }

  const offNow = items.filter((item) => stockModeOf(item, now) !== "in-stock");
  const unpriced = items.filter((item) => item.basePriceCents === null);

  const until = (at: Date) =>
    at.toLocaleString("en-US", {
      timeZone: STORE_TIME_ZONE,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      <KuroHeader />

      <main className="mx-auto max-w-[1100px] px-6 pt-8 pb-24 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="kuro-label kuro-label-accent">Manager</p>
            <h1 className="kuro-serif mt-4 text-[clamp(34px,5vw,54px)]">The menu.</h1>
            <p className="mt-4 text-[15.5px]" style={{ color: "var(--muted)" }}>
              Signed in as {user.name}. Prices here are what customers see on this site —
              change them on the ordering page too, or the two will disagree.
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border px-5 py-3 text-[14px] font-semibold"
              style={{ borderColor: "var(--line)", color: "var(--muted)" }}
            >
              Log out
            </button>
          </form>
        </div>

        {/* What is wrong right now, before the long list. The two states worth
            being reminded of are a dish that is off and a dish with no price,
            because both of them lose a sale while nobody is looking. */}
        {offNow.length || unpriced.length ? (
          <div
            className="mt-10 rounded-3xl border p-6"
            style={{ borderColor: "var(--line)", background: "rgb(242 236 228 / 0.04)" }}
          >
            {offNow.length ? (
              <>
                <p className="kuro-label kuro-label-accent">Off right now</p>
                <ul className="mt-3 flex flex-col gap-1.5 text-[15px]">
                  {offNow.map((item) => (
                    <li key={item.id}>
                      {item.name} —{" "}
                      <span style={{ color: "var(--muted)" }}>
                        {item.outOfStockUntil
                          ? `back ${until(item.outOfStockUntil)}`
                          : "until you switch it on"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {unpriced.length ? (
              <p
                className={offNow.length ? "mt-5 text-[15px]" : "text-[15px]"}
                style={{ color: "var(--muted)" }}
              >
                {unpriced.length} {unpriced.length === 1 ? "dish has" : "dishes have"} no price, so
                the menu says &ldquo;ask in store&rdquo;: {unpriced.map((i) => i.name).join(", ")}.
              </p>
            ) : null}
          </div>
        ) : null}

        {[...byCategory.entries()].map(([category, group]) => (
          <section key={category} className="mt-14">
            <h2 className="kuro-label kuro-label-accent">{category}</h2>
            <ul className="mt-5 flex flex-col">
              {group.map((item) => {
                const mode = stockModeOf(item, now);
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-4 border-t py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <div className="min-w-0 sm:pt-2.5">
                      <p className="text-[17px] leading-tight">{item.name}</p>
                      <p className="mt-1.5 text-[13px]" style={{ color: "var(--muted-dim)" }}>
                        {mode === "in-stock" ? "On" : "Off"}
                        {item.lastPriceChangeAt
                          ? ` · price last changed ${until(item.lastPriceChangeAt)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-4 sm:items-end">
                      <PriceForm itemId={item.id} priceCents={item.basePriceCents} />
                      <StockForm itemId={item.id} mode={mode} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
