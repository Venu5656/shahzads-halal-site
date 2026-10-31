"use client";

import { useEffect, useState } from "react";

/**
 * The clock on the wall, set to New Brunswick.
 *
 * The time is the shop's, not the reader's. Someone ordering from a laptop
 * two time zones away still needs to know whether this kitchen is on, and
 * their own clock cannot tell them. `timeZone` does the work, so it stays
 * right through daylight saving without a line of arithmetic here.
 *
 * It renders the server's string first and only starts ticking after mount.
 * Rendering a live clock during SSR guarantees a hydration mismatch, because
 * the second always turns over between the two.
 */
export function StoreClock({
  initial,
  statusLabel,
  isOpen,
}: {
  /** Formatted on the server, so the first paint is never blank. */
  initial: string;
  statusLabel: string;
  isOpen: boolean;
}) {
  const [time, setTime] = useState(initial);

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());

    // No synchronous set here: the server's string is already correct, and
    // the first tick arrives a second later, which nobody can perceive.
    const timer = setInterval(() => setTime(format()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <p className="kuro-label flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full"
          style={{ background: isOpen ? "var(--accent)" : "var(--muted-dim)" }}
        />
        {statusLabel}
      </p>
      <p
        className="kuro-label tabular-nums"
        style={{ color: "var(--ink)", letterSpacing: "0.14em" }}
      >
        <span className="sr-only">Time in New Brunswick: </span>
        {/* aria-hidden on the ticking half: a screen reader announcing a new
            time every second would make the rest of the page unusable. */}
        <span aria-hidden="true">{time}</span>
        <span className="ml-2" style={{ color: "var(--muted-dim)" }}>
          New Brunswick
        </span>
      </p>
    </div>
  );
}
