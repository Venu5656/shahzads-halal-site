/**
 * Where "Order now" goes.
 *
 * Ordering, payment, tracking and support all belong to DoorDash. This site's
 * job ends at the moment someone decides what they want: it shows the food and
 * hands them over.
 *
 * The link is DoorDash's direct-delivery programme — Dashers do the delivery,
 * but the ordering page is Shahzad's and carries no DoorDash branding. The
 * customer should not be able to tell they have left. So nothing on this site
 * says "order on DoorDash", shows their logo, or otherwise breaks the illusion
 * that it is all one shop. Just "Order now".
 *
 * It lives here, alone, because DoorDash reissues these and the executive
 * sends a new one: that should be a single line to change, never a search for
 * every button that pasted it.
 *
 * The `source` parameter is how Shahzad can tell, in DoorDash's own reporting,
 * which orders this site sent him. Without it there is no way to show the site
 * is worth having.
 */

const BASE = process.env.NEXT_PUBLIC_ORDER_URL ?? "";

/** True once DoorDash has supplied the link and it is configured. */
export function orderingReady(): boolean {
  return BASE.startsWith("https://");
}

/**
 * The ordering link, tagged with where the customer came from.
 *
 * Returns null when no link is configured, so a caller must decide what to
 * show instead — never a dead button that looks live.
 */
export function orderUrl(source: string): string | null {
  if (!orderingReady()) return null;
  try {
    const url = new URL(BASE);
    url.searchParams.set("utm_source", "website");
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", source);
    return url.toString();
  } catch {
    return null;
  }
}

/** Where to send someone when the link is not set up yet. */
export const ORDER_FALLBACK_TEL = "+18482021430";
