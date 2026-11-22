import type { Metadata } from "next";
import Link from "next/link";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { confirm } from "@/lib/subscribers/list";

export const metadata: Metadata = {
  title: "You're on the list · Shahzad's Halal Food",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The second half of the double opt-in.
 *
 * Nothing is sent to an address until this page has been reached from a link
 * in that address's inbox. It is the only thing standing between the list and
 * every typo and malicious signup anybody cares to type, and it is the reason
 * a complaint can be answered with a date, an IP and a wording version rather
 * than a shrug.
 *
 * Expired, already spent and never existed all land on the same screen: the
 * person holding a dead link needs the same next step in every case, and
 * telling them which it was would make this a way to test whether a token
 * was ever real.
 */
export default async function ConfirmJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await confirm(token);

  return (
    <>
      <KuroHeader />
      <main className="wrap pt-14 pb-28">
        <span className="eyebrow">Deals and drops</span>
        {result.state === "confirmed" ? (
          <>
            <h1 className="mt-3 mb-6 font-display text-[clamp(40px,7vw,76px)] leading-[0.9]">
              You&rsquo;re{" "}
              <em className="font-serif text-[0.78em] font-bold tracking-[-0.03em] text-gold normal-case italic">
                on the list.
              </em>
            </h1>
            <p className="max-w-[52ch] text-[18px] leading-relaxed text-muted">
              That&rsquo;s it — no account, no password, nothing to remember. The next time
              Shahzad puts the lamb on special, you&rsquo;ll know.
            </p>
            {result.textsPending ? (
              <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted">
                You also asked for texts. Those aren&rsquo;t switched on yet — we have to
                register the number with the carriers first, and until that is done we
                won&rsquo;t text you at all. When it is, you&rsquo;ll get one message asking
                you to confirm, and nothing else unless you reply to it.
              </p>
            ) : null}
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted">
              Every email has an unsubscribe link that works in one click. Use it whenever
              you like; it takes effect immediately, not in ten days.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 mb-6 font-display text-[clamp(40px,7vw,76px)] leading-[0.9]">
              That link{" "}
              <em className="font-serif text-[0.78em] font-bold tracking-[-0.03em] text-gold normal-case italic">
                has expired.
              </em>
            </h1>
            <p className="max-w-[52ch] text-[18px] leading-relaxed text-muted">
              A confirmation link is good for a week and can only be used once. Ask for a
              new one and it will be in your inbox in a moment.
            </p>
          </>
        )}

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/menu" className="btn btn-red">
            See the menu
          </Link>
          <Link href="/#deals" className="btn btn-ghost">
            {result.state === "confirmed" ? "Back to the shop" : "Ask for a new link"}
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
