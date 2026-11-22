import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "../DraftNotice";

export const metadata: Metadata = { title: "Privacy · Shahzad's Halal Food" };

/**
 * Rewritten for a site that takes no orders.
 *
 * Almost everything the old version described — orders, payments, card
 * processors, accounts, receipts — happens on the ordering page now, and
 * saying otherwise would be describing somebody else's data handling as our
 * own. What is left is short, which is the honest shape of it: an email
 * address, sometimes a phone number, and the record of having been asked.
 */
export default function PrivacyPage() {
  return (
    <>
      <span className="eyebrow">Legal</span>
      <h1 className="mt-3 mb-8 font-display text-[clamp(44px,8vw,80px)] leading-[0.88] font-black uppercase">
        Privacy
      </h1>
      <DraftNotice />

      <h2>The short version</h2>
      <p>
        This site shows you the food, the hours and the address, and sends you to our ordering
        page when you want to eat. It asks you for one thing: an email address, if you want to
        hear about offers. That is the whole of it.
      </p>

      <h2>What we keep, if you join the list</h2>
      <ul>
        <li>Your email address.</li>
        <li>Your mobile number, only if you typed one in — it is optional.</li>
        <li>
          A record of your asking: the date, the IP address you asked from, the browser you
          used, and the exact wording you were shown. This one is kept in the clear rather
          than hashed, because its whole purpose is to be readable later by a person checking
          that we had your permission.
        </li>
      </ul>
      <p>
        That record is added to and never edited. If you leave the list, a second entry says
        that you left; the first is not erased, so we can never claim you are on the list
        after you have asked not to be.
      </p>

      <h2>What we never see</h2>
      <ul>
        <li>
          Anything about an order. Ordering, payment and delivery happen on the ordering page,
          not here — what you ate and what you paid belongs to that service, under its own
          privacy policy, and never reaches this site.
        </li>
        <li>Card numbers. This site has no checkout and takes no payment at all.</li>
        <li>Who browsed the menu. No analytics, no advertising tags, no tracking cookies.</li>
      </ul>

      <h2>What we send you</h2>
      <p>
        One email to confirm the address is yours. Nothing else arrives until you open it. After
        that, Shahzad&apos;s offers and new menu items — a few times a month, never more than
        weekly.
      </p>
      <p>
        If you ticked the texts box, we will text you offers to that number: recurring automated
        marketing messages, up to four a month, message and data rates may apply, reply STOP to
        stop and HELP for help. Agreeing is not a condition of buying anything. Texts are not
        switched on yet — when they are, you will get one message asking you to confirm, and
        nothing further unless you reply to it.
      </p>

      <h2>Getting off the list</h2>
      <p>
        Every email has an unsubscribe link that works in one click, with no password and no
        account — because you have neither. It takes effect immediately. For texts, reply STOP.
        You can also call the store and we will take you off by hand.
      </p>

      <h2>Age</h2>
      <p>
        The list is for adults. Please do not sign up if you are under 16, and if you tell us a
        child&apos;s address has been added we will remove it and the record of it.
      </p>

      <h2>Who else sees it</h2>
      <p>
        The people who run the shop, and the services that run this site: our hosting provider,
        our database host and our email provider. Nobody else. We do not sell it, rent it, or
        hand it to anybody for advertising.
      </p>

      <h2>Asking us about it</h2>
      <p>
        Call{" "}
        <a href="tel:+18482021430" className="text-gold underline-offset-4 hover:underline">
          (848) 202-1430
        </a>{" "}
        or come to the counter at 152 Easton Ave and ask what we hold about you, or ask us to
        delete it. See also the{" "}
        <Link href="/legal/terms" className="text-gold underline-offset-4 hover:underline">
          terms
        </Link>
        .
      </p>
    </>
  );
}
