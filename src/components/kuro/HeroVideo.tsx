"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * The flat-top, running behind the hero.
 *
 * A background video is easy to do badly, so the decisions are all here.
 *
 * The poster is an ordinary <img> underneath rather than the video's own
 * `poster` attribute. It paints with the rest of the page, before any script
 * has run and whether or not the video ever loads, so the hero is never a
 * black rectangle — and when the video is deliberately not played, the poster
 * is simply what stays.
 *
 * The <video> is only put on the page at all when it should be, because two
 * groups of people should not be sent a megabyte of cooking. Somebody who has
 * asked their system for less motion has asked for precisely this, and a
 * looping video is the clearest possible case of it. Somebody on Save Data has
 * told their browser to stop doing this sort of thing, and a restaurant hero
 * is not the exception they had in mind.
 *
 * That preference is read through useSyncExternalStore rather than an effect
 * that sets state. A media query is an external store: it can change while the
 * page is open, and this way the video stops the moment somebody turns reduced
 * motion on, rather than at the next navigation. The server snapshot is false,
 * so the markup React sends and the markup it first renders in the browser
 * agree, and nothing is torn down on hydration.
 *
 * It is muted, inline and loops. Muted is not a style choice: a browser will
 * refuse to autoplay anything else, and a site that starts making noise at
 * somebody reading in bed at two in the morning deserves the tab closing.
 *
 * The video is 7 seconds that end where they begin — the last second
 * crossfades back into the first — so the loop has no visible jump. A hard cut
 * every few seconds in the corner of somebody's eye is what makes this kind of
 * background look cheap.
 */

function subscribe(onChange: () => void): () => void {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", onChange);
  return () => motion.removeEventListener("change", onChange);
}

function shouldPlay(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  // Not in the DOM types, and not in every browser. Absent means "no
  // preference expressed", which is the only safe reading of a missing opt-out.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  if (connection?.saveData) return false;

  return true;
}

/** Nothing autoplays in the markup the server sends. */
const neverOnTheServer = () => false;

export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const play = useSyncExternalStore(subscribe, shouldPlay, neverOnTheServer);

  useEffect(() => {
    if (!play) return;
    // Autoplay can still be refused — a battery-saving mode, a browser policy,
    // a per-site setting. There is nothing to do about it and nothing to
    // report: the poster is already on screen, and that is a fine hero.
    ref.current?.play().catch(() => {});
  }, [play]);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/video/flat-top-poster.webp"
        alt=""
        className="absolute inset-0 size-full object-cover"
        fetchPriority="high"
      />
      {play ? (
        <video
          ref={ref}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 size-full object-cover"
        >
          <source src="/video/flat-top.mp4" type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}
