"use client";

import { useEffect, useState } from "react";
import {
  type WallClock,
  DAY_NAMES,
  HOURS,
  WEEK_ORDER,
  fmtDuration,
  fmtHour,
  nyNow,
  storeStatus,
} from "@/lib/hours";

/**
 * The hours, as a twenty-four hour dial.
 *
 * The presentation is the one the ported homepage uses, rebuilt here in the
 * dark-counter palette: the service hours drawn as an arc around a full day,
 * a tick for every hour, and a pulsing marker at the minute it is now. A
 * seventeen-hour day is hard to picture from "10 AM — 3 AM" and obvious as
 * an arc that runs most of the way round.
 *
 * Drawn as JSX rather than innerHTML, so React owns the DOM and there is
 * nothing to clean up. The clock starts from a string the server rendered,
 * and only begins ticking after mount: a live clock rendered during SSR
 * guarantees a hydration mismatch, since the second turns over between the
 * two renders.
 *
 * The time shown is the shop's, not the reader's — someone ordering from two
 * zones away needs to know whether this kitchen is on, and their own clock
 * cannot tell them.
 */

const R = 170;
const C = 200;

/**
 * A point on the dial for a decimal hour; midnight at the top.
 *
 * Rounded, and that is not cosmetic. Math.sin and Math.cos are only required
 * to be within one unit in the last place, and Node and Chromium disagree
 * there — the server rendered y1="33.723122473387804" where the browser
 * computed 33.72312247338783. React compares those as strings, calls it a
 * hydration mismatch, and throws the whole tree away to re-render it.
 * Two decimals is far below a pixel at this size and both engines agree on it.
 */
function pt(hour: number, r = R): [number, number] {
  const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(C + r * Math.cos(a)), round(C + r * Math.sin(a))];
}

function arc(from: number, to: number, r = R): string {
  const [x1, y1] = pt(from, r);
  const [x2, y2] = pt(to, r);
  return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 12 ? 1 : 0} 1 ${x2} ${y2}`;
}

export function HoursDial({
  initialNow,
  initialClock,
}: {
  /**
   * The shop's wall clock as the server saw it. Passed in rather than read
   * here, because `nyNow()` inside useState runs on the server AND again on
   * the client during hydration — and the minute turns over between the two,
   * which React reports as a mismatch and then re-renders the whole tree.
   */
  initialNow: WallClock;
  initialClock: string;
}) {
  const [now, setNow] = useState<WallClock>(initialNow);
  const [clock, setClock] = useState(initialClock);

  useEffect(() => {
    const tick = () => {
      const n = nyNow();
      setNow(n);
      const hh = n.h % 12 || 12;
      setClock(`${hh}:${String(n.m).padStart(2, "0")} ${n.h < 12 ? "AM" : "PM"}`);
    };
    const timer = setInterval(tick, 15_000);
    return () => clearInterval(timer);
  }, []);

  const status = storeStatus(now);
  const service = HOURS[status.serviceDay]!;
  const t = now.h + now.m / 60;
  const [nx, ny] = pt(t);

  return (
    <section id="hours" className="px-6 py-24 sm:px-10">
      <div className="mx-auto grid max-w-[1320px] items-center gap-16 lg:grid-cols-2">
        {/* ----------------------------------------------------- the dial */}
        <div className="relative mx-auto grid aspect-square w-[min(84vw,440px)] place-items-center">
          <svg viewBox="0 0 400 400" aria-hidden="true" className="absolute inset-0 size-full">
            <defs>
              <linearGradient id="dial-arc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ff6a52" />
                <stop offset="1" stopColor="#e23a2f" />
              </linearGradient>
            </defs>

            <circle cx={C} cy={C} r={R} fill="none" stroke="rgb(242 236 228 / 0.07)" strokeWidth={18} />
            <path
              d={arc(service[0], service[1])}
              fill="none"
              stroke="url(#dial-arc)"
              strokeWidth={18}
              strokeLinecap="round"
            />

            {Array.from({ length: 24 }, (_, i) => {
              const [x1, y1] = pt(i, R + 22);
              const [x2, y2] = pt(i, R + (i % 6 ? 28 : 34));
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={`rgb(242 236 228 / ${i % 6 ? 0.18 : 0.42})`}
                  strokeWidth={2}
                />
              );
            })}

            {[0, 6, 12, 18].map((i) => {
              const [x, y] = pt(i, R - 28);
              return (
                <text
                  key={i}
                  x={x} y={y + 4}
                  textAnchor="middle"
                  fill="rgb(242 236 228 / 0.4)"
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                  letterSpacing="0.1em"
                >
                  {["12a", "6a", "12p", "6p"][i / 6]}
                </text>
              );
            })}

            {/* Where we are in the day. */}
            <circle
              className="kuro-pulse"
              cx={nx} cy={ny} r={15}
              fill={status.open ? "#e23a2f" : "#5d564f"}
              opacity={0.25}
              style={{ transformOrigin: `${nx}px ${ny}px` }}
            />
            <circle cx={nx} cy={ny} r={9} fill="#f2ece4" stroke="#0a0908" strokeWidth={3} />
          </svg>

          <div className="relative z-10 text-center">
            <p className="kuro-serif text-[clamp(34px,5vw,52px)] tabular-nums">
              <span className="sr-only">Time in New Brunswick: </span>
              <span aria-hidden="true">{clock}</span>
            </p>
            <p className="kuro-label mt-2">Now in New Brunswick</p>
            <p className="kuro-label mt-4 flex items-center justify-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-1.5 rounded-full"
                style={{ background: status.open ? "var(--accent)" : "var(--muted-dim)" }}
              />
              <span style={{ color: status.open ? "var(--ink)" : "var(--muted)" }}>
                {status.open ? "Open now" : "Closed now"}
              </span>
            </p>
          </div>
        </div>

        {/* ----------------------------------------------------- the week */}
        <div>
          <p className="kuro-label kuro-label-accent">Late-night kitchen</p>
          <h2 className="kuro-serif mt-5 text-[clamp(38px,5vw,64px)]">
            Open when
            <br />
            <span style={{ color: "var(--accent)" }}>you&rsquo;re hungry.</span>
          </h2>

          <p className="mt-7 max-w-[42ch] text-[16.5px] leading-[1.8]" style={{ color: "var(--muted)" }}>
            {status.open ? (
              <>
                The grill is on — open until{" "}
                <b style={{ color: "var(--ink)", fontWeight: 500 }}>{fmtHour(service[1])}</b>,{" "}
                {fmtDuration(status.hoursUntilChange)} left.
              </>
            ) : (
              <>
                Back at{" "}
                <b style={{ color: "var(--ink)", fontWeight: 500 }}>
                  {fmtHour(status.openAt ?? 0)}
                </b>{" "}
                — opening in {fmtDuration(status.hoursUntilChange)}.
              </>
            )}
          </p>

          <table className="mt-10 w-full">
            <caption className="sr-only">Opening hours</caption>
            <tbody>
              {WEEK_ORDER.map((day) => {
                const [from, to] = HOURS[day]!;
                const isToday = day === status.serviceDay;
                return (
                  <tr key={day} className="border-b" style={{ borderColor: "var(--line)" }}>
                    <th
                      scope="row"
                      className="py-3.5 text-left text-[15.5px] font-normal"
                      style={{ color: isToday ? "var(--accent)" : "var(--ink)" }}
                    >
                      {DAY_NAMES[day]}
                    </th>
                    <td
                      className="py-3.5 text-right text-[15.5px] tabular-nums"
                      style={{ color: isToday ? "var(--ink)" : "var(--muted)" }}
                    >
                      {fmtHour(from)} — {fmtHour(to)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
