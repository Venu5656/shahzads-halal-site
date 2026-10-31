import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { CheckoutBlocked } from "@/components/checkout/CheckoutBlocked";
import { buildCheckout } from "@/lib/orders/checkout";
import { isChargeable } from "@/lib/orders/quote";
import { formatPhone } from "@/lib/auth/phone";
import { stripeConfigured } from "@/lib/payments/stripe-config";

export const metadata: Metadata = {
  title: "Checkout · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

/** Prices are read live; nothing about this page may be cached. */
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const view = await buildCheckout();
  if (!view) redirect("/login?next=%2Fcheckout");

  const { quote, block, user, pickupLeadMinutes } = view;

  // A total below the card minimum cannot be charged at all, so say so here
  // rather than letting Stripe reject it.
  const tooSmall = quote && !isChargeable(quote);

  return (
    <>
      <SiteHeader />
      <main className="wrap max-w-[860px] pt-10 pb-28 sm:pt-14">
        <span className="eyebrow">Pickup only · 152 Easton Ave</span>
        <h1 className="mt-3 mb-8 font-display text-[clamp(44px,8vw,76px)] leading-[0.9]">
          Check{" "}
          <em className="font-serif text-[0.8em] font-bold tracking-[-0.03em] text-gold normal-case italic">
            out.
          </em>
        </h1>

        {block ? (
          <CheckoutBlocked block={block} />
        ) : tooSmall ? (
          <CheckoutBlocked block={{ kind: "too_small", totalCents: quote!.totalCents }} />
        ) : null}

        {quote ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
            <OrderSummary quote={quote} />

            <aside className="flex flex-col gap-5">
              <section className="rounded-[26px] border border-line bg-card p-6 sm:p-7">
                <h2 className="mb-4 font-display text-[26px] leading-none">
                  Collecting
                </h2>
                <dl className="flex flex-col gap-3 text-[16px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Name</dt>
                    <dd className="font-medium">{user.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Phone</dt>
                    <dd className="font-medium">{formatPhone(user.phone)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Receipt</dt>
                    <dd className="max-w-[60%] truncate font-medium">{user.email}</dd>
                  </div>
                </dl>
                <p className="mt-4 border-t border-line pt-4 text-[14px] leading-relaxed text-muted">
                  Ready about <strong className="text-cream">{pickupLeadMinutes} minutes</strong>{" "}
                  after the kitchen confirms your order — we&apos;ll text and email you the moment
                  it does. Wrong details?{" "}
                  <Link href="/account" className="text-gold underline-offset-4 hover:underline">
                    Fix them here
                  </Link>
                  .
                </p>
              </section>

              {!block && !tooSmall ? (
                <PaymentStep
                  totalCents={quote.totalCents}
                  configured={stripeConfigured()}
                />
              ) : null}
            </aside>
          </div>
        ) : null}
      </main>
    </>
  );
}
