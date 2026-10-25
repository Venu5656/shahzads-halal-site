"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * The hero, as a pinned story.
 *
 * The right half holds its place for the length of the left column while the
 * specimen inside it swaps to match the step the reader has reached. Nothing
 * is hijacked: the page scrolls at its own speed and an IntersectionObserver
 * only decides which dish is showing. With scripting off, every step is still
 * readable and the first specimen stays on screen.
 *
 * Three steps, not eight. The direction allows about one screen each and three
 * at most, and a pinned stage that outstays that reads as a page that will not
 * let you leave.
 */

export type Specimen = {
  slug: string;
  name: string;
  /** One fact, in the board's own words. */
  fact: string;
  imagePath: string;
  priceLabel: string;
};

const FIELDS = ["bg-field-2", "bg-field-3", "bg-field-1"] as const;

export function Stage({ specimens, openNow }: { specimens: Specimen[]; openNow: string }) {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const nodes = steps.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The step nearest the middle of the screen wins, so a tall step and a
        // short one are treated the same.
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best) return;
        const index = nodes.indexOf(best.target as HTMLDivElement);
        if (index >= 0) setActive(index);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [specimens.length]);

  return (
    <section className="relative" aria-label="Tonight at Shahzad's">
      <div className="grid lg:grid-cols-2">
        {/* ---------------------------------------------------------- left */}
        <div className="order-2 lg:order-1">
          <div className="flex flex-col justify-end px-6 pt-6 pb-6 sm:px-10 sm:pb-10 lg:min-h-[calc(100svh-78px)] lg:pt-12 lg:pb-12">
            <p className="mb-4 text-small font-bold tracking-[0.2em] text-gold uppercase">
              {openNow}
            </p>
            <h1 className="font-display text-display leading-[0.9] font-black uppercase">
              The grill stays lit
              <br />
              <em className="font-serif text-[0.74em] font-bold tracking-[-0.03em] text-gold normal-case italic">
                until 3 am.
              </em>
            </h1>
            <p className="mt-5 max-w-[38ch] lg:mt-7 text-lead leading-relaxed text-muted">
              Halal platters, gyros and cheesesteaks off the flat-top at 152 Easton Ave. Order
              ahead and it is bagged when you get there.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 lg:mt-9">
              <Link
                href="/menu"
                className="bg-brand-ink px-8 py-4 text-body font-bold text-white transition-transform duration-300 hover:scale-[1.02]"
              >
                Order for pickup
              </Link>
              <a
                href="tel:+18482021430"
                className="text-body font-medium text-cream underline-offset-4 hover:underline"
              >
                (848) 202-1430
              </a>
            </div>
          </div>

          {/* The steps. Each one holds the stage for about a screen. */}
          {specimens.map((item, i) => (
            <div
              key={item.slug}
              ref={(node) => {
                steps.current[i] = node;
              }}
              className="flex min-h-[78svh] flex-col justify-center px-6 py-16 sm:px-10"
            >
              <p className="mb-3 text-small font-bold tracking-[0.2em] text-muted uppercase">
                {String(i + 1).padStart(2, "0")} / {String(specimens.length).padStart(2, "0")}
              </p>
              <h2 className="font-display text-head leading-[0.95] font-black uppercase">
                {item.name}
              </h2>
              <p className="mt-4 max-w-[36ch] text-body leading-relaxed text-muted">
                {item.fact}
              </p>
              <p className="mt-6 text-lead font-bold text-cream">{item.priceLabel}</p>
            </div>
          ))}
        </div>

        {/* --------------------------------------------------------- right */}
        <div className="order-1 lg:order-2">
          <div
            className={[
              "sticky top-0 flex h-[27svh] items-center justify-center overflow-hidden transition-colors duration-500 lg:h-svh",
              FIELDS[active % FIELDS.length],
            ].join(" ")}
          >
            {specimens.map((item, i) => (
              <img
                key={item.slug}
                src={item.imagePath}
                alt={i === active ? item.name : ""}
                aria-hidden={i === active ? undefined : true}
                className={[
                  "absolute max-h-[80%] w-auto max-w-[70vw] drop-shadow-[0_28px_34px_rgb(0_0_0/0.45)] transition-opacity duration-500 lg:max-h-[72%] lg:w-[31vw] lg:max-w-[460px]",
                  i === active ? "opacity-100" : "opacity-0",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
