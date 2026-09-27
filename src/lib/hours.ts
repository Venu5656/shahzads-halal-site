/**
 * Opening hours for the store, in America/New_York.
 *
 * Hours are expressed as decimal hours past midnight of the *service day*, so
 * a close time of 27 means 3 AM the following calendar day. This is the same
 * representation the original static homepage used.
 */
export const HOURS: Readonly<Record<number, readonly [number, number]>> = {
  0: [12, 27], // Sunday
  1: [10, 27],
  2: [10, 27],
  3: [10, 27],
  4: [10, 27],
  5: [10, 27],
  6: [10, 27], // Saturday
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Display order used by the hours list: Monday first, Sunday last. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const STORE_TIME_ZONE = "America/New_York";

/**
 * How long the kitchen needs before an order can be collected.
 *
 * It counts from the moment a manager **confirms** the order, not from when
 * the payment clears: the card can settle while the ticket is still sitting
 * unacknowledged, and promising a pickup time from that instant would have
 * people arriving before anyone has started cooking. Checkout quotes "about 20
 * minutes from confirmation" and the real clock starts on the confirm button.
 */
export const PICKUP_LEAD_MINUTES = 20;

export type WallClock = { d: number; h: number; m: number; s: number };

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The current wall-clock time in New Brunswick, regardless of server locale. */
export function nyNow(date: Date = new Date()): WallClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: STORE_TIME_ZONE,
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  return {
    d: SHORT_DAYS.indexOf(parts.weekday ?? ""),
    // Intl renders midnight as "24" in some engines with hour12:false.
    h: Number(parts.hour) % 24,
    m: Number(parts.minute),
    s: Number(parts.second),
  };
}

function hoursFor(day: number): readonly [number, number] {
  const h = HOURS[((day % 7) + 7) % 7];
  if (!h) throw new Error(`No hours configured for day ${day}`);
  return h;
}

export type StoreStatus = {
  open: boolean;
  /** Decimal hour the store closes, when open (may exceed 24). */
  closeAt: number | null;
  /** Decimal hour the store opens today, when closed. */
  openAt: number | null;
  /** The day whose hours are currently in force (yesterday during the 12–3 AM tail). */
  serviceDay: number;
  /** Hours left until close (open) or until open (closed), in decimal hours. */
  hoursUntilChange: number;
};

/** Is the store open at this wall-clock moment, and until/from when? */
export function storeStatus(now: WallClock): StoreStatus {
  const t = now.h + now.m / 60;
  const today = hoursFor(now.d);
  const yesterday = hoursFor(now.d + 6);
  const yesterdayTail = yesterday[1] - 24;

  if (t < yesterdayTail) {
    return {
      open: true,
      closeAt: yesterdayTail,
      openAt: null,
      serviceDay: (now.d + 6) % 7,
      hoursUntilChange: yesterdayTail - t,
    };
  }

  if (t >= today[0]) {
    return {
      open: true,
      closeAt: today[1],
      openAt: null,
      serviceDay: now.d,
      hoursUntilChange: today[1] - t,
    };
  }

  return {
    open: false,
    closeAt: null,
    openAt: today[0],
    serviceDay: now.d,
    hoursUntilChange: today[0] - t,
  };
}

/** 10 -> "10 AM", 27 -> "3 AM", 12.5 -> "12:30 PM". */
export function fmtHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${hh < 12 ? "AM" : "PM"}`;
}

/** 2.5 -> "2h 30m", 0.5 -> "30 min". */
export function fmtDuration(decimalHours: number): string {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return h ? `${h}h ${m}m` : `${m} min`;
}
