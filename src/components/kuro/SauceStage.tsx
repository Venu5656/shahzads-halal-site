"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * The sauces, presented the way the ported homepage presents them.
 *
 * A drip-shaped swatch for each one, and a morphing blob that takes the
 * chosen sauce's colour with its name, description and heat sitting on top
 * of it. The blob is the idea: a sauce is a colour and a consistency before
 * it is a word, and a round chip says neither.
 *
 * The text on the blob flips to the sauce's own ink colour rather than a
 * fixed one, because white on the white sauce would be unreadable and the
 * data already carries the right value for each.
 *
 * It cycles on its own until somebody chooses, then stops and stays on their
 * choice — a carousel that keeps moving after a deliberate click is a
 * carousel arguing with its reader. It never starts for anyone who has asked
 * for less motion.
 */

export type StageSauce = {
  slug: string;
  name: string;
  color: string;
  ink: string;
  heat: number;
  description: string;
};

const DWELL_MS = 3800;

export function SauceStage({ sauces }: { sauces: StageSauce[] }) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(false);
  const quiet = useReducedMotion();

  useEffect(() => {
    if (chosen || quiet || sauces.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % sauces.length),
      DWELL_MS,
    );
    return () => clearInterval(timer);
  }, [chosen, quiet, sauces.length]);

  const sauce = sauces[index];
  if (!sauce) return null;

  return (
    <section id="sauces" aria-label="Sauces" className="px-6 py-24 sm:px-10">
      <div className="mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* ------------------------------------------------- the choosing */}
        <div>
          <p className="kuro-label kuro-label-accent">Choose your drip</p>
          <h2 className="kuro-serif mt-5 text-[clamp(38px,5vw,64px)]">
            Six sauces.
            <br />
            <span style={{ color: "var(--accent)" }}>Zero rules.</span>
          </h2>
          <p
            className="mt-7 max-w-[44ch] text-[16.5px] leading-[1.8]"
            style={{ color: "var(--muted)" }}
          >
            Every platter and gyro comes with your pick of Shahzad&rsquo;s sauces. Go
            classic, go fire, or do the half-and-half — tap one to taste-test.
          </p>

          <ul className="mt-9 grid gap-3 sm:grid-cols-2">
            {sauces.map((s, i) => {
              const on = i === index;
              return (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      setIndex(i);
                      setChosen(true);
                    }}
                    aria-current={on ? "true" : undefined}
                    className="flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left text-[15px] transition-all duration-300"
                    style={{
                      borderColor: on ? s.color : "var(--line)",
                      background: on ? "rgb(242 236 228 / 0.05)" : "transparent",
                      color: on ? "var(--ink)" : "var(--muted)",
                    }}
                  >
                    {/* A drip, not a dot: the corner is square so it reads as
                        a falling drop rather than a colour chip. */}
                    <span
                      aria-hidden="true"
                      className="size-[26px] shrink-0 transition-transform duration-400"
                      style={{
                        background: s.color,
                        borderRadius: "50% 50% 50% 8px",
                        transform: `rotate(-45deg) scale(${on ? 1.18 : 1})`,
                        boxShadow: "inset -3px -3px 0 rgb(0 0 0 / 0.16)",
                      }}
                    />
                    {s.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ---------------------------------------------------- the blob */}
        <div className="relative mx-auto grid aspect-square w-full max-w-[520px] place-items-center">
          <div
            aria-hidden="true"
            className={`absolute inset-[8%] ${quiet ? "" : "kuro-morph"}`}
            style={{
              background: sauce.color,
              borderRadius: "42% 58% 62% 38% / 45% 42% 58% 55%",
              opacity: 0.92,
              transition: "background .7s var(--ease)",
              boxShadow: `inset -30px -40px 80px rgb(0 0 0 / 0.25), 0 0 120px -20px ${sauce.color}`,
            }}
          />

          <div
            className="relative z-10 max-w-[340px] px-8 text-center"
            style={{ color: sauce.ink, transition: "color .5s" }}
          >
            <p className="kuro-serif text-[clamp(40px,5.6vw,66px)]">{sauce.name}</p>
            <p className="mt-4 text-[15.5px] leading-[1.7]" style={{ opacity: 0.85 }}>
              {sauce.description}
            </p>
            <p className="mt-6 flex items-center justify-center gap-2">
              <span className="kuro-label" style={{ color: "currentColor", opacity: 0.7 }}>
                Heat
              </span>
              <span aria-hidden="true" className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((k) => (
                  <span
                    key={k}
                    className="h-2 w-[22px] rounded-full transition-opacity duration-500"
                    style={{ background: "currentColor", opacity: k < sauce.heat ? 1 : 0.22 }}
                  />
                ))}
              </span>
              <span className="sr-only">
                {sauce.heat === 0 ? "no heat" : `${sauce.heat} out of 5`}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
