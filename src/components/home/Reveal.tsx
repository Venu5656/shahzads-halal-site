"use client";

import { useEffect, useRef } from "react";

/**
 * An entrance for the parts of a section.
 *
 * The pinned hero is the page's one loud moment; everything below it needs a
 * quieter motion layer or the page reads as a still. Each part lifts a little
 * and fades in once, the first time it comes near, and then stays put —
 * nothing re-animates on the way back up, which is what makes a scrolling
 * page feel seasick.
 *
 * It can never hide anything from a reader. The server renders the content
 * visible and the hidden state is added from the client, so no-script, no
 * IntersectionObserver and `prefers-reduced-motion` all leave it on screen.
 * The class is toggled on the node rather than held in React state: this is
 * synchronising with the DOM, not rendering from it.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Milliseconds, for staggering parts within one section. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    node.classList.add("reveal-armed");
    node.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          node.classList.remove("reveal-armed");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref as never} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
