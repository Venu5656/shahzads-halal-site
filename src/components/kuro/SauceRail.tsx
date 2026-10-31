"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * The sauces.
 *
 * Every platter and gyro comes with a choice of these, so they are a real
 * decision a customer makes and not decoration. Each is a swatch in its own
 * colour; choosing one swaps the description beside it.
 *
 * The heat dots are the one piece of information the printed board does not
 * carry and the counter staff always get asked for, which is why they earn
 * their place here.
 */

export type RailSauce = {
  slug: string;
  name: string;
  color: string;
  heat: number;
  description: string;
};

export function SauceRail({ sauces }: { sauces: RailSauce[] }) {
  const [active, setActive] = useState(0);
  const quiet = useReducedMotion();
  const sauce = sauces[active];
  if (!sauce) return null;

  return (
    <section id="sauces" aria-label="Sauces" className="px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-[1320px]">
        <p className="kuro-label kuro-label-accent">Sauces</p>
        <h2 className="kuro-serif mt-5 max-w-[16ch] text-[clamp(38px,5vw,64px)]">
          Pick up to three. They&rsquo;re free.
        </h2>

        <div className="mt-14 grid gap-12 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-20">
          {/* ------------------------------------------------- the swatches */}
          <ul className="flex flex-wrap gap-4">
            {sauces.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={on ? "true" : undefined}
                    className="group flex w-[86px] flex-col items-center gap-3"
                  >
                    <span
                      className="grid size-[70px] place-items-center rounded-full transition-transform duration-500"
                      style={{
                        background: s.color,
                        transform: on ? "scale(1.06)" : "scale(1)",
                        boxShadow: on
                          ? "0 0 0 2px var(--bg), 0 0 0 3px var(--accent), 0 14px 30px -12px rgb(0 0 0 / 0.9)"
                          : "0 10px 24px -14px rgb(0 0 0 / 0.9)",
                      }}
                    >
                      {/* Heat, as dots. Nothing on the printed board says this. */}
                      <span aria-hidden="true" className="flex gap-1">
                        {[0, 1, 2].map((d) => (
                          <span
                            key={d}
                            className="size-1.5 rounded-full"
                            style={{
                              background: d < s.heat ? "rgb(0 0 0 / 0.55)" : "rgb(0 0 0 / 0.14)",
                            }}
                          />
                        ))}
                      </span>
                    </span>
                    <span
                      className="text-center text-[14px] transition-colors"
                      style={{ color: on ? "var(--ink)" : "var(--muted)" }}
                    >
                      {s.name}
                    </span>
                    <span className="sr-only">
                      {s.heat === 0
                        ? "no heat"
                        : `heat ${s.heat} out of 3`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ----------------------------------------------- the description */}
          <div className="lg:pt-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={sauce.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: quiet ? 0 : 0.26, ease: [0.22, 0.8, 0.24, 1] }}
              >
                <p className="kuro-serif text-[clamp(28px,3.4vw,44px)]">{sauce.name}</p>
                <p
                  className="mt-5 max-w-[46ch] text-[16px] leading-[1.8]"
                  style={{ color: "var(--muted)" }}
                >
                  {sauce.description}
                </p>
              </motion.div>
            </AnimatePresence>

            <p className="kuro-label mt-10" style={{ color: "var(--muted-dim)" }}>
              Up to three on any platter or gyro · extra on the side 75&cent;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
