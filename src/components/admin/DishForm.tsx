"use client";

import { useActionState, useRef, useState } from "react";
import { saveDescription, savePhoto } from "@/lib/menu/actions";

/**
 * The two slower edits: what a dish says, and what it looks like.
 *
 * Folded behind one disclosure per row rather than sitting open. Price and
 * sold-out are the things Shahzad touches mid-service, one-handed, and they
 * stay where they were; a description is a sit-down job and a photograph needs
 * the camera. Putting all four on screen at once would bury the two that
 * matter at one in the morning under the two that do not.
 *
 * Still a form each, for the same reason the price is: one dish, one Save, and
 * the row that failed is the row that says so.
 */

const MAX = 300;

function Message({ state }: { state: { error?: string; notice?: string } | undefined }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-[13.5px]" style={{ color: "var(--accent)" }}>
        {state.error}
      </p>
    );
  }
  if (state?.notice) {
    return (
      <p role="status" className="text-[13.5px]" style={{ color: "var(--muted)" }}>
        {state.notice}
      </p>
    );
  }
  return null;
}

export function DishForm({
  itemId,
  itemName,
  description,
  imagePath,
}: {
  itemId: string;
  itemName: string;
  description: string;
  imagePath: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(description);
  const [descState, descAction, descPending] = useActionState(saveDescription, undefined);
  const [photoState, photoAction, photoPending] = useActionState(savePhoto, undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const left = MAX - text.length;

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[13px] underline underline-offset-4"
        style={{ color: "var(--muted)" }}
      >
        {open ? "Done" : "Words and photo"}
      </button>

      {open ? (
        <div
          className="flex w-full flex-col gap-5 rounded-2xl border p-4 sm:w-[420px]"
          style={{ borderColor: "var(--line)", background: "rgb(242 236 228 / 0.03)" }}
        >
          {/* ---------------------------------------------------- words */}
          <form action={descAction} className="flex flex-col gap-2">
            <input type="hidden" name="itemId" value={itemId} />
            <label
              htmlFor={`desc-${itemId}`}
              className="kuro-label"
              style={{ color: "var(--muted)" }}
            >
              What it says on the menu
            </label>
            <textarea
              id={`desc-${itemId}`}
              name="description"
              rows={3}
              maxLength={MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-[15px] outline-none"
              style={{
                borderColor: descState?.error ? "var(--accent)" : "var(--line)",
                background: "rgb(242 236 228 / 0.04)",
                color: "var(--ink)",
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-[12px]"
                style={{ color: left < 40 ? "var(--accent)" : "var(--muted-dim)" }}
              >
                {left} left
              </span>
              <button
                type="submit"
                disabled={descPending || text.trim() === description}
                className="rounded-full border px-4 py-2 text-[13.5px] font-semibold disabled:opacity-40"
                style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
              >
                {descPending ? "Saving…" : "Save words"}
              </button>
            </div>
            <Message state={descState} />
          </form>

          {/* ---------------------------------------------------- photo */}
          <form
            action={photoAction}
            className="flex flex-col gap-2 border-t pt-4"
            style={{ borderColor: "var(--line)" }}
          >
            <input type="hidden" name="itemId" value={itemId} />
            <span className="kuro-label" style={{ color: "var(--muted)" }}>
              Photo
            </span>

            <div className="flex items-center gap-3">
              <span
                className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border"
                style={{ borderColor: "var(--line)", background: "var(--bg-raised)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePath} alt="" className="size-[86%] object-contain" />
              </span>
              <div className="min-w-0 flex-1">
                <input
                  ref={fileInput}
                  id={`photo-${itemId}`}
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setChosen(e.target.files?.[0]?.name ?? null)}
                  className="block w-full text-[13px] file:mr-3 file:rounded-full file:border file:px-3 file:py-1.5 file:text-[13px]"
                  style={{ color: "var(--muted)" }}
                />
                <p className="mt-1.5 text-[12px]" style={{ color: "var(--muted-dim)" }}>
                  Shoot it on the black tray if you can — the background comes out
                  automatically when it is dark enough.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={photoPending || !chosen}
              className="self-end rounded-full border px-4 py-2 text-[13.5px] font-semibold disabled:opacity-40"
              style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
            >
              {photoPending ? `Uploading ${itemName}…` : "Upload photo"}
            </button>
            <Message state={photoState} />
          </form>
        </div>
      ) : null}
    </div>
  );
}
