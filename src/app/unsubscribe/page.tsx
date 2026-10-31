import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const metadata: Metadata = {
  title: "Unsubscribed · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Turning marketing email off.
 *
 * No sign-in, by design: somebody who wants out should not have to remember a
 * password to get out. The link's signature is the authority.
 *
 * Following the link does the work rather than showing a confirm button. Some
 * mail clients fetch a link before the human clicks it, which would normally
 * argue for a second step — but the worst case here is somebody stops getting
 * offers they can switch back on in one tap, and that is a far better failure
 * than a person who cannot unsubscribe. Receipts and security email are
 * untouched either way.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ bad?: string }>;
}) {
  // The work already happened in /api/unsubscribe, which sent them here. This
  // page only reports it, so a reload cannot repeat anything.
  const { bad } = await searchParams;
  const done = bad !== "1";

  return (
    <>
      <SiteHeader />
      <main className="wrap pt-14 pb-28">
        <span className="eyebrow">Email preferences</span>
        <h1 className="mt-3 mb-6 font-display text-[clamp(40px,7vw,76px)] leading-[0.9]">
          {done ? (
            <>
              You&rsquo;re{" "}
              <em className="font-serif text-[0.78em] font-bold tracking-[-0.03em] text-gold normal-case italic">
                off the list.
              </em>
            </>
          ) : (
            <>
              That link{" "}
              <em className="font-serif text-[0.78em] font-bold tracking-[-0.03em] text-gold normal-case italic">
                didn&rsquo;t work.
              </em>
            </>
          )}
        </h1>

        {done ? (
          <>
            <p className="max-w-[52ch] text-[18px] leading-relaxed text-muted">
              We won&rsquo;t email you offers again. This takes effect now, not in ten
              days.
            </p>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted">
              You will still get email about orders you place — the confirmation, the
              receipt, and anything about your account or password. Those are not
              marketing and you cannot be opted out of them while you have an account.
            </p>
          </>
        ) : (
          <p className="max-w-[52ch] text-[18px] leading-relaxed text-muted">
            The link may have been cut in half by your mail app, which happens with long
            links. Copy the whole thing from the email and paste it into the address bar,
            or turn offers off from your account page — it does exactly the same thing.
          </p>
        )}

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/account" className="btn btn-red">
            Email preferences
          </Link>
          <Link href="/menu" className="btn btn-ghost">
            Back to the menu
          </Link>
        </div>

        <p className="mt-14 text-[14px] leading-relaxed text-muted">
          Shahzad&rsquo;s Halal Food · 152 Easton Ave, New Brunswick, NJ 08901 ·{" "}
          <a href="tel:+18482021430" className="text-gold underline-offset-4 hover:underline">
            (848) 202-1430
          </a>
        </p>
      </main>
    </>
  );
}
