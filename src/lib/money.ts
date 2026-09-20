/**
 * Money is ALWAYS integer cents in this codebase — never a float, never a
 * string of dollars. Conversion to a human string happens at the very edge.
 */

export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`formatCents expects integer cents, got ${cents}`);
  }
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Parses "12.50" / "$12.50" / "12" into cents. Throws on anything else. */
export function parseDollarsToCents(input: string): number {
  const cleaned = input.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Not a valid dollar amount: ${input}`);
  }
  const [dollars = "0", decimals = ""] = cleaned.split(".");
  return Number(dollars) * 100 + Number(decimals.padEnd(2, "0"));
}

/**
 * Applies a tax (or any) rate to a cent amount, rounding half up — the
 * convention US sales tax uses.
 *
 * Rates are parts per million, not basis points: New Jersey's 6.625% is 662.5
 * basis points, which is not an integer, so basis points cannot represent it
 * exactly. 6.625% = 66_250 ppm.
 */
export function applyRatePpm(cents: number, ratePpm: number): number {
  return Math.round((cents * ratePpm) / 1_000_000);
}

/** New Jersey sales tax on prepared food, as of this writing. PLACEHOLDER —
 * the owner must confirm the rate and whether menu prices include it. */
export const NJ_SALES_TAX_PPM = 66_250;
