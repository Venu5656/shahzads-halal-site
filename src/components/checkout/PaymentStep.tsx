import { formatCents } from "@/lib/money";

/**
 * The payment step.
 *
 * Card, Apple Pay and Google Pay all arrive here once the restaurant's Stripe
 * keys are in the environment. Until then the step says so plainly instead of
 * rendering a card form that cannot work — and the rest of checkout, including
 * every price on the page, is already the real thing.
 */
export function PaymentStep({
  totalCents,
  configured,
}: {
  totalCents: number;
  configured: boolean;
}) {
  if (!configured) {
    return (
      <section className="rounded-[26px] border border-gold/35 bg-gold/10 p-6 sm:p-7">
        <h2 className="mb-2 font-display text-[26px] leading-none font-extrabold uppercase text-cream">
          Payment isn&apos;t switched on yet
        </h2>
        <p className="mb-4 text-[15px] leading-relaxed text-cream/85">
          Everything above is real — the prices, the tax, the totals are all computed on the server.
          The card form appears here as soon as the restaurant&apos;s Stripe account is connected.
        </p>
        <p className="text-[14px] leading-relaxed text-muted">
          Setup steps are in <code className="text-gold">docs/OWNER-PAYMENT-SETUP.md</code>.
        </p>
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-bold tracking-[0.14em] uppercase text-muted">
              To pay
            </span>
            <span className="font-display text-[30px] leading-none font-black">
              {formatCents(totalCents)}
            </span>
          </div>
          <button
            type="button"
            disabled
            className="btn btn-red mt-4 w-full cursor-not-allowed justify-center !rounded-2xl !py-4 text-[17px] opacity-50"
          >
            Pay {formatCents(totalCents)}
          </button>
        </div>
      </section>
    );
  }

  // Wired up in the second half of phase 4, once keys exist to test against.
  return (
    <section className="rounded-[26px] border border-line bg-card p-6 sm:p-7">
      <h2 className="mb-4 font-display text-[26px] leading-none font-extrabold uppercase">
        Payment
      </h2>
      <p className="text-[15px] leading-relaxed text-muted">
        Card, Apple Pay and Google Pay. {formatCents(totalCents)} to pay.
      </p>
    </section>
  );
}
