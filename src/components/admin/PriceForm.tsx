"use client";

import { useActionState } from "react";
import { savePrice } from "@/lib/menu/actions";

/**
 * One item's price, on its own form.
 *
 * Deliberately not one big form with one Save at the bottom. Shahzad changes
 * one price, behind the counter, on a phone, usually with one hand — and a
 * single form means every half-typed box on the page is submitted along with
 * the one he meant. A form per row also means the row that failed is the row
 * that says so.
 */
export function PriceForm({
  itemId,
  priceCents,
}: {
  itemId: string;
  priceCents: number | null;
}) {
  const [state, action, pending] = useActionState(savePrice, undefined);
  const current = priceCents === null ? "" : (priceCents / 100).toFixed(2);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="flex items-center gap-2">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px]"
            style={{ color: "var(--muted)" }}
          >
            $
          </span>
          <input
            name="price"
            type="text"
            inputMode="decimal"
            // A numeric keypad, not a spinner: nobody taps a price up by steps
            // of one cent, and the arrows steal the tap target on a phone.
            aria-label="Price in dollars"
            defaultValue={state?.values?.price ?? current}
            placeholder="—"
            maxLength={7}
            className="h-11 w-[104px] rounded-xl border pr-3 pl-7 text-[15.5px] outline-none"
            style={{
              borderColor: state?.error ? "var(--accent)" : "var(--line)",
              background: "rgb(242 236 228 / 0.04)",
              color: "var(--ink)",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl border px-4 text-[14px] font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--line)", color: "var(--ink)" }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error ? (
        <p role="alert" className="text-[13px]" style={{ color: "var(--accent)" }}>
          {state.error}
        </p>
      ) : null}
      {state?.notice ? (
        <p role="status" className="text-[13px]" style={{ color: "var(--muted)" }}>
          {state.notice}
        </p>
      ) : null}
    </form>
  );
}
