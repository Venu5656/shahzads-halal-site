import Link from "next/link";
import { formatCents } from "@/lib/money";
import { fmtHour } from "@/lib/hours";
import { MIN_CHARGE_CENTS } from "@/lib/orders/quote";
import type { CheckoutBlock } from "@/lib/orders/checkout";

/**
 * Why this order cannot go through, in the customer's terms.
 *
 * Every case says what to do next rather than only what went wrong — at 2 AM
 * "closed" without an opening time is just annoying.
 */
export function CheckoutBlocked({ block }: { block: CheckoutBlock }) {
  const { title, body, action } = describe(block);

  return (
    <section
      role="alert"
      className="mb-8 rounded-[26px] border border-brand-2/40 bg-brand/10 p-6 sm:p-7"
    >
      <h2 className="mb-2 font-display text-[28px] leading-none font-extrabold uppercase text-cream">
        {title}
      </h2>
      <div className="text-[16px] leading-relaxed text-cream/85">{body}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

function describe(block: CheckoutBlock): {
  title: string;
  body: React.ReactNode;
  action: React.ReactNode | null;
} {
  const browse = (
    <Link href="/menu" className="btn btn-red !rounded-2xl !py-3.5">
      Back to the menu
    </Link>
  );

  switch (block.kind) {
    case "empty":
      return {
        title: "Nothing to pay for",
        body: <>Your cart is empty. The mix platter is a good place to start.</>,
        action: browse,
      };

    case "closed":
      return {
        title: "The kitchen is closed",
        body: (
          <>
            We open again at{" "}
            <strong className="text-cream">
              {block.opensAt === null ? "10 AM" : fmtHour(block.opensAt)}
            </strong>
            . Your cart will still be here.
          </>
        ),
        action: browse,
      };

    case "cutoff":
      return {
        title: "Too late for tonight",
        body: (
          <>
            Online orders stop at <strong className="text-cream">2:40 AM</strong> so the kitchen can
            finish by three. We start taking them again at{" "}
            <strong className="text-cream">
              {block.opensAt === null ? "10 AM" : fmtHour(block.opensAt)}
            </strong>
            , and your cart will still be here.
          </>
        ),
        action: browse,
      };

    case "paused":
      return {
        title: "We've paused online orders",
        body: (
          <>
            {block.message ??
              "The kitchen is slammed right now, so we've stopped taking online orders for a bit."}{" "}
            Try again shortly, or call{" "}
            <a href="tel:+18482021430" className="text-gold underline-offset-4 hover:underline">
              (848) 202-1430
            </a>
            .
          </>
        ),
        action: browse,
      };

    case "too_small":
      return {
        title: "That's too small to charge",
        body: (
          <>
            A card payment has to be at least {formatCents(MIN_CHARGE_CENTS)}, and your order comes
            to {formatCents(block.totalCents)}. Add something else, or pick it up and pay at the
            counter.
          </>
        ),
        action: browse,
      };

    case "changed":
      return {
        title: "The menu changed while you were deciding",
        body: (
          <>
            <p className="mb-3">
              Nothing has been charged. Here is what moved — fix your cart and come back:
            </p>
            <ul className="list-disc pl-5">
              {block.changes.map((change, index) => (
                <li key={index} className="mb-1">
                  {change.itemName ? (
                    <strong className="text-cream">{change.itemName}</strong>
                  ) : null}
                  {change.itemName ? " — " : null}
                  {change.message}
                </li>
              ))}
            </ul>
          </>
        ),
        action: browse,
      };
  }
}
