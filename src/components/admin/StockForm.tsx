"use client";

import { useActionState } from "react";
import { saveStock } from "@/lib/menu/actions";
import { STOCK_MODES, type StockMode } from "@/lib/menu/stock";

/**
 * On, or off — and if off, for how long.
 *
 * The presets are the point. The useful answer at one in the morning is "off
 * tonight", which clears itself at close, so nothing has to be remembered the
 * next day. "Off until I say" is there because some things are off for a week,
 * and that is a different decision made by somebody who means it.
 *
 * Each option is its own submit button rather than a select plus a save: one
 * tap instead of three, and nothing to leave half-chosen.
 */
export function StockForm({ itemId, mode }: { itemId: string; mode: StockMode }) {
  const [state, action, pending] = useActionState(saveStock, undefined);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="flex flex-wrap gap-1.5">
        {STOCK_MODES.map((option) => {
          const on = option.mode === mode;
          return (
            <button
              key={option.mode}
              type="submit"
              name="mode"
              value={option.mode}
              disabled={pending}
              aria-pressed={on}
              title={option.detail}
              className="rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
              style={
                on
                  ? {
                      borderColor:
                        option.mode === "in-stock" ? "var(--line-strong)" : "var(--accent)",
                      background:
                        option.mode === "in-stock"
                          ? "rgb(242 236 228 / 0.1)"
                          : "rgb(226 58 47 / 0.16)",
                      color: "var(--ink)",
                    }
                  : { borderColor: "var(--line)", color: "var(--muted)" }
              }
            >
              {option.label}
            </button>
          );
        })}
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
