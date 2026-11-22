"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { field, fieldErrorsFrom, type FormState } from "@/lib/auth/schemas";
import { offerSchema } from "./compose";
import { deliverBatch, sendTest, startSend } from "./send";

/**
 * Writing and sending an offer.
 *
 * Both actions re-check the role inside the functions they call rather than
 * trusting the page they were rendered on — a server action is a public POST
 * endpoint, and the gate belongs where the work is.
 */

function read(form: FormData) {
  return {
    subject: field(form, "subject") ?? "",
    heading: field(form, "heading") ?? "",
    body: field(form, "body") ?? "",
    buttonLabel: field(form, "buttonLabel") ?? "",
    url: field(form, "url") ?? "",
  };
}

/** Sends one copy to whoever is signed in, so he can see it before anybody else. */
export async function testOffer(_prev: FormState, form: FormData): Promise<FormState> {
  const values = read(form);
  const parsed = offerSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  // To himself, always. Not to an address typed into a box: a "send a test to"
  // field on a page that can mail the whole list is a way to mail anybody.
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in again.", values };

  const ok = await sendTest(parsed.data, user.email);
  return ok
    ? { notice: `Sent to ${user.email}. Check it before you send it to everyone.`, values }
    : { error: "That didn't send. Try again in a moment.", values };
}

/**
 * Sends it to the list.
 *
 * Freezes the audience, then pushes the first batch out inside this request so
 * he sees it start. The rest is picked up by the cron route — the send is a
 * queue in the database, so nothing is lost if this request ends first.
 */
export async function sendOffer(_prev: FormState, form: FormData): Promise<FormState> {
  const values = read(form);
  const parsed = offerSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  // Typed confirmation rather than a dialog: this is the one button on the
  // site that cannot be taken back, and a misplaced tap should not fire it.
  if ((field(form, "confirm") ?? "").trim().toUpperCase() !== "SEND") {
    return { error: 'Type SEND in the box to confirm.', values };
  }

  const started = await startSend(parsed.data);
  if (!started.ok) return { error: started.error, values };

  await deliverBatch(started.offerId);
  revalidatePath("/admin/offers");
  redirect(`/admin/offers/${started.offerId}`);
}

/**
 * "Keep going" — the button on an offer he would rather not wait on.
 *
 * Returns nothing to say. Revalidating the page re-renders the counts, which
 * are read from the send rows themselves; a banner reporting what just
 * happened could only ever disagree with them.
 */
export async function pushOffer(_prev: FormState, form: FormData): Promise<FormState> {
  const offerId = field(form, "offerId") ?? "";
  if (!offerId) return { error: "Nothing to send." };
  await deliverBatch(offerId);
  revalidatePath(`/admin/offers/${offerId}`);
  return undefined;
}
