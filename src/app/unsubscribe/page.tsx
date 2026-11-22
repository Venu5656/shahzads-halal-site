import type { Metadata } from "next";
import Link from "next/link";
import { KuroHeader } from "@/components/kuro/KuroHeader";

export const metadata: Metadata = {
  title: "Unsubscribed · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Turning the offers off.
 *
 * No sign-in, by design — and now there is nothing to sign in to. Somebody on
 * the list has no account and no password; the link's signature is the whole
 * authority, which is what makes it work for a person who cannot remember
 * ever giving us the address.
 *
 * Following the link does the work rather than showing a confirm button. Some
 * mail clients fetch a link before the human clicks it, which would normally
 * argue for a second step — but the worst case here is somebody stops getting
 * offers they can switch back on in one tap, and that is a far better failure
 * than a person who cannot unsubscribe.
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
      <KuroHeader />
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
              Offers are the only thing we ever sent you, so that is all of it. Anything
              about an order you place belongs to whoever took the order, not to us, and
              this link cannot turn that off — nor should it, since it is how you find out
              where your food is.
            </p>
          </>
        ) : (
          <p className="max-w-[52ch] text-[18px] leading-relaxed text-muted">
            The link may have been cut in half by your mail app, which happens with long
            links. Copy the whole thing from the email and paste it into the address bar,
            or write to us and we will take you off by hand.
          </p>
        )}

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/menu" className="btn btn-red">
            See the menu
          </Link>
          <Link href="/" className="btn btn-ghost">
            Back to the shop
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
