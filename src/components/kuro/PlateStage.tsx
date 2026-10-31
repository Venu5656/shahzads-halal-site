"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";

/**
 * One platter at a time, turning.
 *
 * The turn is a CSS keyframe on an inner element; motion handles the roll
 * between dishes. Nesting them keeps two writers off the same `transform`.
 *
 * Only platters reach this component. They are the dishes photographed
 * top-down, and a three-quarter photograph set spinning reads as a sticker
 * turning rather than a plate.
 */

export type StagePlate = {
  slug: string;
  name: string;
  description: string;
  imagePath: string;
  priceCents: number | null;
  categoryLabel: string;
};

const ROLL = 460;

export function PlateStage({ plates }: { plates: StagePlate[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [hovering, setHovering] = useState(false);
  const quiet = useReducedMotion();
  const router = useRouter();
  const wheelAt = useRef(0);

  const go = useCallback(
    (step: number) => {
      setDirection(step);
      setIndex((i) => (i + step + plates.length) % plates.length);
    },
    [plates.length],
  );

  const jump = (to: number) => {
    setDirection(to > index ? 1 : -1);
    setIndex(to);
  };

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

  // A sideways gesture changes dish. Vertical scrolling is left alone: taking
  // the page's own scroll away is the fastest way to make someone feel stuck.
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5) return;
    const now = Date.now();
    if (now - wheelAt.current < 450) return;
    wheelAt.current = now;
    go(e.deltaX > 0 ? 1 : -1);
  };

  const plate = plates[index];
  if (!plate) return null;

  return (
    <section
      id="platters"
      aria-label="Tonight's platters"
      onWheel={onWheel}
      className="relative px-6 pt-4 pb-16 sm:px-10"
    >
      <div className="mx-auto grid max-w-[1320px] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)_minmax(0,0.62fr)] lg:gap-6">
        {/* ------------------------------------------------------ the words */}
        <div className="order-2 lg:order-1">
          <p className="kuro-label mb-5 flex items-center gap-3">
            <span style={{ color: "var(--ink)" }}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span aria-hidden="true" className="h-px w-10" style={{ background: "var(--accent)" }} />
            <span>{String(plates.length).padStart(2, "0")}</span>
          </p>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={plate.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: quiet ? 0 : 0.3, ease: [0.22, 0.8, 0.24, 1] }}
            >
              <p className="kuro-label kuro-label-accent mb-4">{plate.categoryLabel}</p>
              {/* h2: the page's heading names the restaurant. A heading that
                  changes when you press an arrow is content, not a title. */}
              <h2 className="kuro-serif text-[clamp(44px,5.4vw,72px)]">{plate.name}</h2>
              <p
                className="mt-6 max-w-[38ch] text-[15.5px] leading-[1.75]"
                style={{ color: "var(--muted)" }}
              >
                {plate.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            <span className="kuro-serif text-[30px]">
              {plate.priceCents === null ? "—" : formatCents(plate.priceCents)}
            </span>
            <button
              type="button"
              onClick={() => router.push(`/menu/${plate.slug}`)}
              className="kuro-cta"
            >
              Add to order
              <span aria-hidden="true" className="text-[17px] leading-none">+</span>
            </button>
          </div>

          <p className="kuro-label mt-8 max-w-[34ch] leading-[1.9]" style={{ color: "var(--muted-dim)" }}>
            Hover to hold it still · ← → for the next dish
          </p>
        </div>

        {/* ------------------------------------------------------ the plate */}
        <div
          className="order-1 flex justify-center lg:order-2"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <div className="relative aspect-square w-[min(88vw,560px)]">
            {/* The light behind the plate. Keyed on the dish so the flare
                keyframe restarts with every change — React replaces the node,
                which is what re-triggers a CSS animation. */}
            <div key={`glow-${plate.slug}`} className={`kuro-glow ${quiet ? "" : "kuro-flare"}`} />

            {/* The ring that appears when the plate is held. */}
            <motion.div
              aria-hidden="true"
              animate={{ opacity: hovering && !quiet ? 1 : 0, scale: hovering && !quiet ? 1 : 0.94 }}
              transition={{ duration: 0.45, ease: [0.22, 0.8, 0.24, 1] }}
              className="pointer-events-none absolute inset-[3%] rounded-full border"
              style={{ borderColor: "var(--line-strong)" }}
            />
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={plate.slug}
                custom={direction}
                initial={quiet ? { opacity: 0 } : { x: direction * ROLL, rotate: direction * 120, opacity: 0 }}
                animate={quiet ? { opacity: 1 } : { x: 0, rotate: 0, opacity: 1 }}
                exit={quiet ? { opacity: 0 } : { x: -direction * ROLL, rotate: -direction * 120, opacity: 0 }}
                transition={quiet ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 26, mass: 0.95 }}
                className="absolute inset-0"
              >
                <div
                  className="kuro-turn size-full"
                  style={{ animationPlayState: hovering || quiet ? "paused" : "running" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={plate.imagePath}
                    alt={plate.name}
                    width={1100}
                    height={1100}
                    data-dish-image=""
                    className="size-full object-contain"
                    style={{ filter: "drop-shadow(0 40px 60px rgb(0 0 0 / 0.75))" }}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ---------------------------------------------------- the sidebar */}
        <ul className="order-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {plates.map((p, i) => {
            const active = i === index;
            return (
              <li key={p.slug} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={active ? "true" : undefined}
                  className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors"
                  style={{
                    borderColor: active ? "var(--line-strong)" : "transparent",
                    background: active ? "var(--bg-panel)" : "transparent",
                  }}
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border"
                    style={{
                      borderColor: active ? "var(--accent)" : "var(--line)",
                      background: "var(--bg-raised)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imagePath}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-[86%] object-contain"
                    />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block truncate text-[14.5px] whitespace-nowrap lg:whitespace-normal"
                      style={{ color: active ? "var(--ink)" : "var(--muted)" }}
                    >
                      {p.name}
                    </span>
                    <span className="kuro-label block" style={{ letterSpacing: "0.1em" }}>
                      {p.priceCents === null ? "—" : formatCents(p.priceCents)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* --------------------------------------------------------- arrows */}
      <div className="mt-10 flex justify-center gap-3">
        <Arrow label="Previous platter" onClick={() => go(-1)} d="M15 18l-6-6 6-6" />
        <Arrow label="Next platter" onClick={() => go(1)} d="M9 6l6 6-6 6" />
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
      className="grid size-11 place-items-center rounded-full border transition-colors"
      style={{ borderColor: "var(--line-strong)", color: "var(--muted)" }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4">
        <path d={d} />
      </svg>
    </button>
  );
}
