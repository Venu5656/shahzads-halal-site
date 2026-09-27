import { randomInt } from "node:crypto";

/**
 * Human order numbers: SH-4821.
 *
 * Short enough to read out across a counter at 2 AM, and deliberately not
 * sequential — a guessable number would let anyone walk the order history by
 * incrementing it, and would also tell competitors how many orders a night the
 * place does.
 *
 * Four digits gives 9,000 codes. Collisions are handled by retrying against
 * the unique index rather than by pretending they cannot happen.
 */

const PREFIX = "SH";
const MIN = 1000;
const MAX = 9999;

export function generateOrderNumber(): string {
  return `${PREFIX}-${randomInt(MIN, MAX + 1)}`;
}

const PATTERN = new RegExp(`^${PREFIX}-\\d{4}$`);

export function isOrderNumber(value: string): boolean {
  return PATTERN.test(value.trim().toUpperCase());
}

/**
 * Canonicalises whatever someone typed or read out: "sh-4821", "SH4821",
 * "sh 4821", " 4821 " all become "SH-4821". Staff will be typing these off a
 * printed ticket while holding a phone, so being fussy about the hyphen would
 * only generate support calls.
 */
export function normalizeOrderNumber(value: string): string | null {
  const squashed = value.trim().toUpperCase().replace(/[\s-]+/g, "");
  const digits = squashed.startsWith(PREFIX) ? squashed.slice(PREFIX.length) : squashed;
  return /^\d{4}$/.test(digits) ? `${PREFIX}-${digits}` : null;
}

/**
 * Asks for a free order number, retrying on collision.
 *
 * `exists` is injected so this is testable without a database, and so the
 * caller decides what "taken" means.
 */
export async function reserveOrderNumber(
  exists: (candidate: string) => Promise<boolean>,
  attempts = 8,
): Promise<string> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const candidate = generateOrderNumber();
    if (!(await exists(candidate))) return candidate;
  }
  // 8 collisions in a 9,000-wide space means the space is nearly full, which
  // for a single restaurant means something else has gone wrong.
  throw new Error("Could not find a free order number after several attempts.");
}
