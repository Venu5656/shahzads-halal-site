import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "../DraftNotice";

export const metadata: Metadata = { title: "Terms · Shahzad's Halal Food" };

/**
 * Rewritten for a site that takes no orders.
 *
 * The old version set out terms for ordering, paying, cancelling and
 * refunding — none of which happens here. Keeping them would have been worse
 * than having no terms at all: it would have offered promises about somebody
 * else's service, in our name, that we have no way to keep.
 *
 * What is left covers what this site actually does: show the menu, say what
 * the prices are, and send you somewhere else to order.
 */
export default function TermsPage() {
  return (
    <>
      <span className="eyebrow">Legal</span>
      <h1 className="mt-3 mb-8 font-display text-[clamp(44px,8vw,80px)] leading-[0.88] font-black uppercase">
        Terms
      </h1>
      <DraftNotice />

      <h2>What this site is</h2>
      <p>
        This site shows Shahzad&apos;s menu, prices, hours and address. It does not take
        orders and it does not take payment. When you tap &ldquo;Order now&rdquo; you are
        handed to our ordering page, which is run by our delivery partner — your order,
        your payment, the delivery and any problem with it are governed by that
        service&apos;s own terms, not these.
      </p>

      <h2>Prices here</h2>
      <p>
        The prices on this site are what we charge at the counter. The ordering page is
        maintained separately, and a delivery may cost more once its own fees are added. If
        the two ever disagree, the price you pay is the one shown where you place the order.
      </p>

      <h2>Availability</h2>
      <p>
        A dish marked sold out here is sold out. A dish not marked sold out may still have
        run out between the kitchen and this page — we mark them as fast as we can, but a
        late-night counter is not a stock system.
      </p>

      <h2>Offers by email and text</h2>
      <p>
        Joining the list is free and is not a condition of buying anything. Every email has
        a one-click unsubscribe; texts, when they start, stop on STOP. See the{" "}
        <Link href="/legal/privacy" className="text-gold underline-offset-4 hover:underline">
          privacy policy
        </Link>{" "}
        for what we keep and for how long.
      </p>

      <h2>Halal</h2>
      <p>
        Every protein we serve is halal. Certification details are available at the counter.
      </p>

      <h2>Allergies</h2>
      <p>
        Everything is cooked on one flat-top in a small kitchen, so we cannot promise any
        dish is free of any allergen. If an allergy matters to you, call{" "}
        <a href="tel:+18482021430" className="text-gold underline-offset-4 hover:underline">
          (848) 202-1430
        </a>{" "}
        and ask before you order.
      </p>
    </>
  );
}
