"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

/**
 * The dish flying into the cart.
 *
 * Measured, not guessed: the flight reads the source image's rectangle and
 * the cart button's rectangle at the moment of the click, so it lands on the
 * cart wherever the page has put it — header, drawer, phone or desktop. A
 * hard-coded destination is the usual way this effect breaks, and it breaks
 * silently when somebody later moves the button.
 *
 * It is purely decorative. The item is added to the cart by the caller before
 * this is asked to animate anything, so a visitor who prefers reduced motion,
 * or whose browser never runs this at all, still gets their food in the cart.
 * Nothing waits on the animation finishing.
 */

type Flight = {
  id: number;
  src: string;
  from: { x: number; y: number; size: number };
  to: { x: number; y: number };
};

type Launch = (image: HTMLElement | null) => void;

const FlyContext = createContext<Launch>(() => {});

/** Marks the cart button as the place things fly to. */
export const CART_TARGET_ATTR = "data-cart-target";

export function useFlyToCart() {
  return useContext(FlyContext);
}

export function FlyToCartProvider({ children }: { children: React.ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const nextId = useRef(0);
  const quiet = useReducedMotion();

  const launch = useCallback<Launch>(
    (image) => {
      if (quiet || !image) return;
      const target = document.querySelector(`[${CART_TARGET_ATTR}]`);
      if (!target) return;

      const a = image.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      if (!a.width || !b.width) return;

      const src = image instanceof HTMLImageElement ? image.currentSrc || image.src : "";
      if (!src) return;

      const id = nextId.current++;
      setFlights((f) => [
        ...f,
        {
          id,
          src,
          // Centres, so the clone starts exactly over the thing that was clicked.
          from: { x: a.left + a.width / 2, y: a.top + a.height / 2, size: Math.min(a.width, a.height) },
          to: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
        },
      ]);
      // Clean up on a timer rather than onAnimationComplete: a tab sent to the
      // background mid-flight never fires the callback, and the clone would
      // sit on the page forever.
      window.setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 1200);
    },
    [quiet],
  );

  return (
    <FlyContext.Provider value={launch}>
      {children}
      {/* Fixed and inert: it must never intercept a click or add a scrollbar. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
        <AnimatePresence>
          {flights.map((f) => (
            <motion.img
              key={f.id}
              src={f.src}
              alt=""
              initial={{
                left: f.from.x, top: f.from.y, width: f.from.size, height: f.from.size,
                x: "-50%", y: "-50%", opacity: 1, rotate: 0, scale: 1,
              }}
              animate={{
                left: f.to.x, top: f.to.y, width: 44, height: 44,
                x: "-50%", y: "-50%", opacity: 0.1, rotate: 320, scale: 1,
              }}
              transition={{
                duration: 0.78,
                ease: [0.3, 0, 0.2, 1],
                opacity: { duration: 0.78, times: [0, 1], ease: "easeIn" },
              }}
              className="absolute object-contain drop-shadow-[0_12px_18px_rgb(0_0_0/0.5)]"
            />
          ))}
        </AnimatePresence>
      </div>
    </FlyContext.Provider>
  );
}
