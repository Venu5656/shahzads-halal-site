import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/orders/quote";

/** The order, priced by the server. These are the numbers that get charged. */
export function OrderSummary({ quote }: { quote: Quote }) {
  const taxPercent = (quote.taxRatePpm / 10_000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const hasExemptLines = quote.taxableSubtotalCents !== quote.subtotalCents;

  return (
    <section className="rounded-[26px] border border-line bg-card p-6 sm:p-7">
      <h2 className="mb-5 font-display text-[26px] leading-none font-extrabold uppercase">
        Your order
        <span className="ml-3 align-middle text-[16px] font-bold text-muted">
          {quote.itemCount} {quote.itemCount === 1 ? "item" : "items"}
        </span>
      </h2>

      <ul className="divide-y divide-line">
        {quote.lines.map((line, index) => (
          <li key={`${line.itemSlug}-${index}`} className="flex gap-4 py-4 first:pt-0">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-cream/8 text-[15px] font-bold"
            >
              {line.quantity}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[21px] leading-tight font-extrabold uppercase">
                {line.nameSnapshot}
              </p>
              {line.selectedOptions.length ? (
                <p className="mt-1 text-[14px] leading-snug text-muted">
                  {line.selectedOptions
                    .map((option) =>
                      option.priceCents
                        ? `${option.optionName} (+${formatCents(option.priceCents)})`
                        : option.optionName,
                    )
                    .join(" · ")}
                </p>
              ) : null}
              {line.note ? (
                <p className="mt-1 text-[14px] leading-snug text-gold">“{line.note}”</p>
              ) : null}
            </div>
            <span className="shrink-0 text-[16px] font-bold">
              {formatCents(line.lineTotalCents)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-[16px]">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{formatCents(quote.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">
            Sales tax ({taxPercent}%)
            {hasExemptLines ? (
              <span className="block text-[13px]">
                on {formatCents(quote.taxableSubtotalCents)} — bottled water is exempt
              </span>
            ) : null}
          </dt>
          <dd>{formatCents(quote.taxCents)}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-[15px] font-bold tracking-[0.14em] uppercase text-muted">Total</dt>
          <dd className="font-display text-[34px] leading-none font-black">
            {formatCents(quote.totalCents)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
