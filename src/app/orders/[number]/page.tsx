import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { requireUser } from "@/lib/auth/dal";
import { getOrderForUser } from "@/lib/orders/queries";
import { formatCents } from "@/lib/money";
import { formatPhone } from "@/lib/auth/phone";
import { PICKUP_LEAD_MINUTES } from "@/lib/hours";

export const metadata: Metadata = {
  title: "Your order · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

/** The status is the whole point of the page; never serve a cached one. */
export const dynamic = "force-dynamic";

/**
 * One order, for the person who placed it.
 *
 * This is where checkout lands and where the receipt's link points. The order
 * number is short enough to guess, so it is treated as a label and not a
 * credential: the query filters on the signed-in user, and somebody else's
 * order is a 404 rather than a "not yours", which would confirm it exists.
 */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const user = await requireUser(`/orders/${number}`);
  const order = await getOrderForUser(number, user.id);
  if (!order) notFound();

  // Anything still on its way gets the pickup line; only a finished order
  // falls back to saying when it was placed.
  const waiting =
    order.status === "PAID" || order.status === "CONFIRMED" || order.status === "PREPARING";

  return (
    <>
      <SiteHeader />
      <main className="wrap pt-10 pb-24 sm:pt-14">
        <span className="eyebrow">Pickup only · 152 Easton Ave</span>
        <h1 className="mt-3 font-display text-[clamp(44px,8vw,86px)] leading-[0.9] font-black uppercase">
          Order{" "}
          <em className="font-serif text-[0.78em] font-bold tracking-[-0.03em] text-gold normal-case italic">
            {order.orderNumber}
          </em>
        </h1>
        <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-muted">
          {waiting
            ? `Give the name ${order.customerName} at the counter. Ready about ${PICKUP_LEAD_MINUTES} minutes from when the kitchen confirms it.`
            : order.status === "READY"
              ? "It is bagged and waiting. Give your name at the counter."
              : `Placed ${order.placedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`}
        </p>

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* ------------------------------------------------- progress */}
          <section aria-labelledby="progress-heading">
            <h2
              id="progress-heading"
              className="mb-5 font-display text-[28px] leading-none font-black uppercase"
            >
              Where it is
            </h2>
            <OrderProgress status={order.status} isActive={order.isActive} />
            {order.isActive ? (
              <p className="mt-4 text-[14px] text-muted">
                This updates on its own while the order is live.
              </p>
            ) : null}
          </section>

          {/* -------------------------------------------------- receipt */}
          <section aria-labelledby="receipt-heading" className="lg:sticky lg:top-8 lg:self-start">
            <h2
              id="receipt-heading"
              className="mb-5 font-display text-[28px] leading-none font-black uppercase"
            >
              What you ordered
            </h2>

            <ul className="divide-y divide-line border-y border-line">
              {order.lines.map((line) => (
                <li key={line.id} className="flex gap-4 py-4">
                  <span className="shrink-0 text-[16px] font-bold text-gold tabular-nums">
                    {line.quantity}×
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold">{line.name}</span>
                    {line.options.length ? (
                      <span className="mt-1 block text-[14px] leading-snug text-muted">
                        {line.options.map((o) => o.optionName).join(" · ")}
                      </span>
                    ) : null}
                    {line.note ? (
                      <span className="mt-1 block text-[14px] leading-snug text-gold">
                        &ldquo;{line.note}&rdquo;
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[16px] font-bold tabular-nums">
                    {formatCents(line.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 grid grid-cols-[1fr_auto] gap-y-2 text-[15px]">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-right tabular-nums">{formatCents(order.subtotalCents)}</dd>
              <dt className="text-muted">Sales tax</dt>
              <dd className="text-right tabular-nums">{formatCents(order.taxCents)}</dd>
              {order.tipCents ? (
                <>
                  <dt className="text-muted">Tip</dt>
                  <dd className="text-right tabular-nums">{formatCents(order.tipCents)}</dd>
                </>
              ) : null}
              <dt className="mt-2 border-t border-line pt-3 text-[17px] font-bold">Total</dt>
              <dd className="mt-2 border-t border-line pt-3 text-right text-[17px] font-bold tabular-nums">
                {formatCents(order.totalCents)}
              </dd>
              {order.refundedCents ? (
                <>
                  <dt className="text-[15px] text-brand-2">Refunded</dt>
                  <dd className="text-right text-[15px] text-brand-2 tabular-nums">
                    −{formatCents(order.refundedCents)}
                  </dd>
                </>
              ) : null}
            </dl>

            <div className="mt-8 border-t border-line pt-6 text-[15px] leading-relaxed text-muted">
              <p className="font-bold text-cream">{order.customerName}</p>
              <p>{formatPhone(order.customerPhone)}</p>
              <p className="mt-3">152 Easton Ave, New Brunswick, NJ 08901</p>
            </div>
          </section>
        </div>

        <p className="mt-14 text-[15px] text-muted">
          <Link href="/account#orders" className="text-gold underline-offset-4 hover:underline">
            All your orders
          </Link>
          {" · "}
          <a href="tel:+18482021430" className="text-gold underline-offset-4 hover:underline">
            Call the shop
          </a>
        </p>
      </main>
    </>
  );
}
