import type { Metadata } from "next";
import { DraftNotice } from "../DraftNotice";

export const metadata: Metadata = { title: "Privacy · Shahzad's Halal Food" };

export default function PrivacyPage() {
  return (
    <>
      <span className="eyebrow">Legal</span>
      <h1 className="mt-3 mb-8 font-display text-[clamp(44px,8vw,80px)] leading-[0.88] font-black uppercase">
        Privacy
      </h1>
      <DraftNotice />

      <h2>What we keep</h2>
      <ul>
        <li>Your name, email address and mobile number.</li>
        <li>Your orders: what you ordered, when, and what you paid.</li>
        <li>
          When you signed in, and from roughly where — the IP address is stored only as a
          one-way hash, never in the clear.
        </li>
      </ul>

      <h2>What we don&apos;t keep</h2>
      <ul>
        <li>
          Card numbers. Payment details go straight to our payment processor and never touch
          this site&apos;s servers, logs or database.
        </li>
        <li>Your password. Only a scrypt hash of it, which cannot be reversed.</li>
      </ul>

      <h2>What we send you</h2>
      <p>
        Emails you need — confirming your address, resetting your password, and receipts for
        orders. Marketing email only if you tick the box, and you can untick it at any time
        from your account page.
      </p>

      <h2>Deleting your account</h2>
      <p>
        Call the store and we&apos;ll remove your account. Past orders are kept as long as tax
        law requires, with your name and contact details detached from them.
      </p>

      <h2>Who else sees it</h2>
      <p>
        The restaurant&apos;s staff, so they can prepare and hand over your order, and the
        services that run the site: our hosting provider, our database host, our payment
        processor and our email provider. Nobody else, and we never sell it.
      </p>
    </>
  );
}
