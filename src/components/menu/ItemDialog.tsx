"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { formatCents } from "@/lib/money";
import { startingPriceCents, type PricedItem } from "@/lib/menu/pricing";

/**
 * The desktop item modal. A real <dialog>, so focus, Escape and the inertness
 * of the page behind it are the browser's job rather than ours.
 */
export function ItemDialog({
  item,
  onClose,
  children,
}: {
  item: (PricedItem & { description: string; imagePath: string }) | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (item && !el.open) el.showModal();
    if (!item && el.open) el.close();
  }, [item]);

  const from = item ? startingPriceCents(item) : null;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      aria-label={item ? item.name : "Item"}
      className="m-auto w-[min(640px,calc(100vw-40px))] rounded-[28px] border border-line bg-ink p-0 text-cream backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      {item ? (
        <div className="max-h-[min(88dvh,900px)] overflow-y-auto">
          <div className="relative aspect-[16/9] overflow-hidden bg-[#f4f1ea]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imagePath} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-ink/80 text-cream backdrop-blur-sm transition-colors hover:bg-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <header className="mb-7">
              <h2 className="font-display text-[clamp(34px,5vw,46px)] leading-[0.95] font-black uppercase">
                {item.name}
              </h2>
              <p className="mt-2 text-[16px] leading-relaxed text-muted">{item.description}</p>
              {from !== null ? (
                <p className="mt-3 text-[20px] font-bold text-gold">{formatCents(from)}</p>
              ) : null}
            </header>
            {children}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
