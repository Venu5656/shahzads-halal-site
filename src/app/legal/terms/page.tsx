import type { Metadata } from "next";
import { DraftNotice } from "../DraftNotice";

export const metadata: Metadata = { title: "Terms · Shahzad's Halal Food" };

export default function TermsPage() {
  return (
    <>
      <span className="eyebrow">Legal</span>
      <h1 className="mt-3 mb-8 font-display text-[clamp(44px,8vw,80px)] leading-[0.88] font-black uppercase">
        Terms
      </h1>
      <DraftNotice />

      <h2>Ordering</h2>
      <p>
        Orders placed here are for pickup from 152 Easton Ave, New Brunswick, NJ. Payment is
        taken online when you order; there is no pay-at-pickup.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your password to yourself. Tell us if you think someone else has it, and change
        it from your account page — doing so signs out every other device.
      </p>

      <h2>Prices and availability</h2>
      <p>
        Prices are confirmed when your order is placed. If something sells out before we
        confirm your order, we&apos;ll call you and refund that item.
      </p>

      <h2>Cancellations and refunds</h2>
      <p>
        Call the store as soon as you can. If the kitchen hasn&apos;t started your order we can
        cancel and refund it in full.
      </p>

      <h2>Halal</h2>
      <p>
        Every protein we serve is halal. Certification details are available at the counter.
      </p>
    </>
  );
}
