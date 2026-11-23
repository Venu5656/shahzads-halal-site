/*
 * No schedule is registered for this route in vercel.json, and that is
 * deliberate rather than an oversight.
 *
 * It used to ask for "* * * * *". Vercel's Hobby plan rejects any cron that
 * would fire more than once a day — the deployment fails outright with
 * "Hobby accounts are limited to daily Cron Jobs" — and the once-a-day run it
 * does allow is only accurate to the hour, which is no use to an offer that
 * says "tonight only".
 *
 * Nothing is lost at this size. Pressing "Send it" delivers the first batch
 * (BATCH_SIZE, currently 40) in the request itself, and "Send the next batch
 * now" on the offer's page delivers each one after that, so a list under 40
 * never needs a scheduler at all.
 *
 * To make it automatic again, any of these work, and the route needs no
 * change for any of them:
 *   - upgrade to Pro and put the crons block back in vercel.json;
 *   - point an external scheduler at this path, sending the CRON_SECRET as a
 *     bearer token;
 *   - keep clicking the button.
 */

import { NextResponse, type NextRequest } from "next/server";
import { deliverBatch, unfinishedOffers } from "@/lib/offers/send";

/**
 * Keeps a send moving.
 *
 * A send is a queue of rows, and something has to work through it. This is
 * that something: called on a schedule, it takes the next batch of whatever is
 * still in flight and sends it. If it is called once a minute, a list of four
 * hundred finishes in about ten.
 *
 * It exists rather than a loop inside the request for a dull reason that
 * decides the design: a serverless function is killed after a fixed time, so a
 * request that tried to send everything would be stopped partway through on
 * any list worth having, and whoever wrote it would only find out from the
 * people who did not get the email.
 *
 * Protected by a shared secret rather than a session, because the caller is a
 * scheduler and has none. No secret set means the route refuses everybody,
 * which is the right way round: an open endpoint that sends email is worse
 * than a send that has to be nudged by hand.
 */

export const dynamic = "force-dynamic";

/** At most this many offers are advanced per call, so one stuck send cannot
 *  starve the others — or run the call past its own time limit. */
const MAX_OFFERS_PER_CALL = 3;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    // 404, not 401: an endpoint that says "wrong password" is an endpoint
    // somebody now knows exists.
    return new NextResponse(null, { status: 404 });
  }

  const offers = (await unfinishedOffers()).slice(0, MAX_OFFERS_PER_CALL);
  const results = [];
  for (const offerId of offers) {
    results.push({ offerId, ...(await deliverBatch(offerId)) });
  }

  return NextResponse.json({ offers: results.length, results });
}
