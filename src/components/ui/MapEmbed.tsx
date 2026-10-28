"use client";

import { useState } from "react";

/**
 * The map, loaded only when someone asks for it.
 *
 * An embedded Google map opens a connection to Google from the visitor's
 * browser the moment the page renders, which hands over their IP address and
 * sets cookies before they have done anything or agreed to anything. For a
 * map nobody scrolled to, that is a poor trade.
 *
 * So the frame starts as a still placeholder with the address on it, and the
 * iframe is created on the first click. Nothing is requested from Google
 * before then. The address and the directions link sit outside this component
 * and work whether or not the map is ever loaded, so no information is behind
 * the click — only the convenience of a draggable map.
 */
export function MapEmbed({
  query = "152 Easton Ave, New Brunswick, NJ 08901",
  label = "Map to Shahzad's Halal Food",
}: {
  query?: string;
  label?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        title={label}
        referrerPolicy="no-referrer"
        loading="lazy"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="group grid size-full min-h-[260px] place-items-center border-0 bg-card p-6 text-center"
      style={{ cursor: "pointer" }}
    >
      <span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          className="mx-auto mb-3 size-8 text-gold transition-transform duration-300 group-hover:scale-110"
        >
          <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        <span className="block font-display text-[22px] leading-none font-extrabold text-cream uppercase">
          Show the map
        </span>
        <span className="mx-auto mt-2 block max-w-[30ch] text-[14px] leading-snug text-muted">
          Loads from Google, which will see your IP address. The address and directions
          below work without it.
        </span>
      </span>
    </button>
  );
}
