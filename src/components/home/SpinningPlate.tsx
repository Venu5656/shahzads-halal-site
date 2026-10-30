"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/money";

/**
 * The spinning plate.
 *
 * One platter at a time, large and dead centre, turning slowly. The turn
 * itself is a CSS keyframe on an inner element and not a motion animation:
 * it runs for the whole visit, so handing it to the compositor and never
 * waking JavaScript for it is both cheaper and smoother. Motion is used for
 * the things it is actually good at — the roll between dishes, and the flight
 * into the cart.
 *
 * The rotation lives on its own element, inside the one motion animates.
 * Sharing a node would mean two writers for `transform`, and the last one to
 * run wins; nested, they compose.
 *
 * Only platters appear here. They are the only dishes photographed top-down,
 * and a three-quarter photograph set spinning reads as a sticker turning
 * rather than a plate.
 */

export type Plate = {
  slug: string;
  name: string;
  description: string;
  imagePath: string;
  priceCents: number | null;
};

/** How far a dish rolls out, and the next one rolls in from. */
const ROLL = 420;

export function SpinningPlate({ plates }: { plates: Plate[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const quiet = useReducedMotion();
  const wheelLock = useRef(0);

  const go = useCallback(
    (step: number) => {
      setDirection(step);
      setIndex((i) => (i + step + plates.length) % plates.length);
    },
    [plates.length],
  );

  // Arrow keys, as the guide asks. Ignored while a field has focus, so the
  // keyboard still belongs to whatever the visitor is typing in.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // A deliberate horizontal gesture changes dish; vertical scrolling is left
  // alone, because stealing the page's own scroll is the fastest way to make
  // a visitor feel trapped.
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5) return;
    const now = Date.now();
    if (now - wheelLock.current < 420) return;
    wheelLock.current = now;
    go(e.deltaX > 0 ? 1 : -1);
  };

  const plate = plates[index];
  if (!plate) return null;

  return (
    <section
      aria-label="Tonight's platters"
      onWheel={onWheel}
      className="relative overflow-hidden border-b border-line"
    >
      <div className="wrap grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:py-20">
        {/* ------------------------------------------------------- the words */}
        <div className="order-2 lg:order-1">
          <p className="mb-4 text-[13px] font-bold tracking-[0.2em] text-gold uppercase">
            Platters · over rice
          </p>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={plate.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: quiet ? 0 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {/* h2, not h1: the page's heading is the one below that states
                  what this place is, and a heading that changes when you press
                  an arrow is content rather than the title of the page. */}
              <h2 className="font-display text-[clamp(40px,6vw,74px)] leading-[0.92] font-black uppercase">
                {plate.name}
              </h2>
              <p className="mt-4 max-w-[42ch] text-[17px] leading-relaxed text-muted">
                {plate.description}
              </p>
              <p className="mt-5 text-[26px] font-bold">
                {plate.priceCents === null ? "Ask in store" : formatCents(plate.priceCents)}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/menu/${plate.slug}`}
              className="bg-brand-ink px-8 py-4 text-[16px] font-bold text-white transition-transform duration-300 hover:scale-[1.02]"
            >
              Add to order
            </Link>
            <div className="flex gap-2">
              <Arrow label="Previous platter" onClick={() => go(-1)} d="M15 18l-6-6 6-6" />
              <Arrow label="Next platter" onClick={() => go(1)} d="M9 6l6 6-6 6" />
            </div>
          </div>

          {/* The side list the guide asks for: every platter, always reachable. */}
          <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2">
            {plates.map((p, i) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                  aria-current={i === index ? "true" : undefined}
                  className={[
                    "text-[15px] transition-colors",
                    i === index
                      ? "font-bold text-cream underline underline-offset-4"
                      : "text-muted hover:text-cream",
                  ].join(" ")}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ------------------------------------------------------- the plate */}
        <div
          className="order-1 flex justify-center lg:order-2"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative aspect-square w-[min(86vw,520px)]">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={plate.slug}
                custom={direction}
                initial={quiet ? { opacity: 0 } : { x: direction * ROLL, rotate: direction * 110, opacity: 0 }}
                animate={quiet ? { opacity: 1 } : { x: 0, rotate: 0, opacity: 1 }}
                exit={quiet ? { opacity: 0 } : { x: -direction * ROLL, rotate: -direction * 110, opacity: 0 }}
                transition={
                  quiet
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 190, damping: 26, mass: 0.9 }
                }
                className="absolute inset-0"
              >
                {/* The slow turn, separate from the roll so the two transforms
                    compose instead of overwriting each other. */}
                <div
                  className="plate-turn size-full"
                  style={{ animationPlayState: paused || quiet ? "paused" : "running" }}
                >
                  <img
                    src={plate.imagePath}
                    alt={plate.name}
                    width={1100}
                    height={1100}
                    className="size-full object-contain drop-shadow-[0_34px_46px_rgb(0_0_0/0.6)]"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Arrow({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-12 place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-cream"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
        <path d={d} />
      </svg>
    </button>
  );
}
