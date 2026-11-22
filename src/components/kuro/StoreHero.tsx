import Link from "next/link";
import { HeroVideo } from "./HeroVideo";

/**
 * The first screen, which is about the shop and not about a dish.
 *
 * The flat-top runs behind it now, and that changes what the text has to do.
 * On a flat background a colour either clears its contrast ratio or it does
 * not, and the answer is the same every frame. Over moving pictures of food
 * the background under any given letter changes thirty times a second, so the
 * text has to survive the brightest frame rather than the average one.
 *
 * What that meant in practice:
 *
 * The lede was --muted (#8b8179), which clears 4.5:1 against the page colour
 * and nothing like it against a lit piece of onion. It is near-white at 88%
 * here instead. The phone number had the same problem and the same fix, plus
 * a permanent underline — a control somebody has to pick out of a busy
 * background should not be leaning on colour alone to look like one.
 *
 * The three facts along the bottom sit where the scrim has already resolved to
 * the page colour, so they are on flat ground and keep the quieter treatment.
 *
 * The content is z-10 over a background stack that takes no pointer events, so
 * both links stay clickable. A full-bleed absolutely-positioned layer over a
 * section with controls in it is the ordinary way a button silently stops
 * working, and nobody finds it until somebody says they could not ring the
 * shop.
 */
export function StoreHero({
  closesLabel,
  statusLabel,
  isOpen,
}: {
  closesLabel: string;
  statusLabel: string;
  isOpen: boolean;
}) {
  return (
    <section className="relative isolate px-6 pt-10 pb-20 sm:px-10 lg:pt-20 lg:pb-28">
      <div className="kuro-hero-bg">
        <HeroVideo />
        <div className="kuro-hero-scrim" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1320px]">
        {/* Everything that is read lives in a column down the left, and the
            headline now breaks across three lines to stay inside it.

            That is the whole trick, and it was the second attempt. The first
            kept the headline running the full width and pushed the scrim
            darker until the red cleared 3:1 — which it did, by burying the
            video under so much black that there was no reason to have shot
            any. Text over imagery is a question of where the text is, not how
            much black you are willing to pour over everything. Give the words
            a column and the pictures get the rest of the frame. */}
        <div className="lg:max-w-[720px] xl:max-w-[780px]">
          {/* --muted reached only 3.3:1 here against the brightest frame
              behind it. The same line on the flat pages keeps --muted; this
              one does not, because the background under it is not flat. */}
          <p
            className="kuro-label kuro-hero-text flex items-start gap-2.5"
            style={{ color: "rgb(242 236 228 / 0.82)" }}
          >
            {/* items-start, not items-center: this line wraps to two on a
                phone, and centring put the dot in the gap between them
                looking like a bullet that had come loose. */}
            <span
              aria-hidden="true"
              className="mt-[0.42em] inline-block size-1.5 shrink-0 rounded-full"
              style={{ background: isOpen ? "var(--accent)" : "var(--muted-dim)" }}
            />
            {statusLabel}
          </p>

          <h1 className="kuro-serif kuro-hero-text mt-7 text-[clamp(50px,8.2vw,96px)] leading-[0.98]">
            Halal off the
            <br />
            flat-top,
            <br />
            <span style={{ color: "var(--accent)" }}>till&nbsp;3&nbsp;am.</span>
          </h1>

          <p
            className="kuro-hero-text mt-10 max-w-[44ch] text-[17px] leading-[1.8]"
            style={{ color: "rgb(242 236 228 / 0.88)" }}
          >
            A counter on Easton Avenue in New Brunswick, cooking platters over rice,
            gyros and cheesesteaks to order. Seventeen hours a day, every protein halal.
            Come and get it, or have it brought to you.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link href="#platters" className="kuro-cta">
              See tonight&rsquo;s platters
              <span aria-hidden="true" className="text-[17px] leading-none">↓</span>
            </Link>
            <a
              href="tel:+18482021430"
              className="kuro-hero-text text-[15px] font-semibold underline decoration-[rgb(242_236_228_/_0.45)] underline-offset-[6px] transition-colors hover:decoration-[rgb(242_236_228_/_0.95)]"
              style={{ color: "rgb(242 236 228 / 0.92)" }}
            >
              (848) 202-1430
            </a>
          </div>
        </div>

        <dl
          className="mt-20 grid gap-px border-t sm:grid-cols-3"
          style={{ borderColor: "var(--line)" }}
        >
          {[
            ["Where", "152 Easton Ave, New Brunswick"],
            ["Tonight", closesLabel],
            ["How", "Delivery or pickup · ready in 20 minutes"],
          ].map(([term, value]) => (
            <div
              key={term}
              className="border-b py-6 sm:border-b-0"
              style={{ borderColor: "var(--line)" }}
            >
              <dt className="kuro-label">{term}</dt>
              <dd className="mt-2 text-[15.5px]" style={{ color: "var(--ink)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
