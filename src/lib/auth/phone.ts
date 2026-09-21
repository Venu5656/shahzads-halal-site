import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/**
 * Accepts whatever a customer types — "(732) 555-0123", "732.555.0123",
 * "+1 732 555 0123" — and returns E.164 (+17325550123), or null.
 *
 * Only North American (+1) numbers are accepted: the store is in New
 * Brunswick, and SMS to international numbers is both expensive and the
 * classic route for SMS-pumping fraud.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 32) return null;

  const parsed = parsePhoneNumberFromString(trimmed, "US");
  if (!parsed || !parsed.isValid()) return null;
  if (parsed.countryCallingCode !== "1") return null;
  return parsed.number;
}

/** +17325550123 -> "(732) 555-0123" */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatNational() : e164;
}

/** +17325550123 -> "(•••) •••-0123", for showing where a code was sent. */
export function maskPhone(e164: string): string {
  return `(•••) •••-${e164.slice(-4)}`;
}
