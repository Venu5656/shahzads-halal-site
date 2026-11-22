import { NextResponse, type NextRequest } from "next/server";
import { verifyUnsubscribe } from "@/lib/email/unsubscribe";
import { stop } from "@/lib/subscribers/list";

/**
 * The endpoint the unsubscribe link actually points at.
 *
 * It exists separately from /unsubscribe because RFC 8058 one-click requires
 * the very same URL to accept POST, and a route cannot share a path with a
 * page. So this takes both:
 *
 *   POST — a mail client's own Unsubscribe button. Answer 200 and nothing
 *          else; Gmail shows its own confirmation and never renders a body.
 *   GET  — a human following the link. Do the work, then hand them the page
 *          that explains what just happened.
 *
 * Doing the work on GET as well matters: a mail client that only understands
 * the older List-Unsubscribe header will send the person here by GET, and an
 * opt-out that silently did nothing would be worse than having no link.
 */

export const dynamic = "force-dynamic";

async function turnOff(request: NextRequest): Promise<boolean> {
  const { searchParams } = request.nextUrl;
  const subscriberId = verifyUnsubscribe(searchParams.get("u"), searchParams.get("s"));
  if (!subscriberId) return false;

  // Email only. A link in an email is evidence about the email, and reading it
  // as "stop the texts too" would be guessing at what they meant — the texts
  // have their own STOP, which is the one a carrier looks for.
  return stop({ subscriberId, channel: "EMAIL", source: "unsubscribe-link" });
}

export async function POST(request: NextRequest) {
  await turnOff(request);
  // Always 200. Telling a one-click request that a signature failed only
  // teaches a guesser which ids are real, and the client shows no body anyway.
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  const ok = await turnOff(request);
  const url = request.nextUrl.clone();
  url.pathname = "/unsubscribe";
  if (!ok) url.searchParams.set("bad", "1");
  return NextResponse.redirect(url);
}
