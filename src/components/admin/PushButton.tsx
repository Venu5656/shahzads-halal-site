"use client";

import { useActionState } from "react";
import { pushOffer } from "@/lib/offers/actions";

/**
 * "Send the next batch now", for a send he would rather not wait on.
 *
 * It shows no message of its own, on purpose. The action revalidates this
 * page, which re-renders the three counts above — and those counts are read
 * from the send rows themselves, so they are the truth rather than a report
 * of it. A "42 sent" banner beside a "Still to go: 0" that disagreed with it
 * would be the worse of the two to believe.
 */
export function PushButton({ offerId }: { offerId: string }) {
  const [, action, pending] = useActionState(pushOffer, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="offerId" value={offerId} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full border px-6 py-3.5 text-[15px] font-semibold disabled:opacity-50"
        style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
      >
        {pending ? "Sending…" : "Send the next batch now"}
      </button>
    </form>
  );
}
