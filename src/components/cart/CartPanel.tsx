"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatCents } from "@/lib/money";
import { MAX_QUANTITY } from "@/lib/menu/pricing";
import { useCart, type CartLineView } from "./CartProvider";

/**
 * The slide-over cart.
 *
 * A real <dialog> so the browser handles the focus trap, Escape and inertness
 * of the page behind it, rather than us reimplementing all three badly.
 */
export function CartPanel() {
  const { lines, itemCount, subtotalCents, isOpen, close } = useCart();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (isOpen && !el.open) el.showModal();
    if (!isOpen && el.open) el.close();
  }, [isOpen]);

  const hasProblems = lines.some((line) => line.problem);

  return (
    <dialog
      ref={dialog}
      onClose={close}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog itself.
        if (event.target === dialog.current) close();
      }}
      aria-label="Your cart"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-[460px] bg-transparent p-0 text-cream backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-dvh flex-col border-l border-line bg-ink">
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <h2 className="font-display text-[34px] leading-none font-black uppercase">
            Your cart
            {itemCount > 0 ? (
              <span className="ml-3 align-middle text-[18px] font-bold text-muted">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="grid size-11 place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-cream"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <p className="text-[17px] text-muted">
              Nothing in here yet. The combo over rice is a good place to start.
            </p>
            <Link href="/menu" onClick={close} className="btn btn-red !rounded-2xl !py-3.5">
              Browse the menu
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {lines.map((line) => (
                <CartRow key={line.id} line={line} />
              ))}
            </ul>

            <footer className="border-t border-line px-6 py-5">
              {hasProblems ? (
                <p role="alert" className="mb-4 rounded-2xl border border-brand-2/40 bg-brand/10 p-4 text-[14px] leading-relaxed text-cream">
                  Something in your cart changed on the menu. Fix or remove it to carry on.
                </p>
              ) : null}
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[15px] font-bold tracking-[0.14em] uppercase text-muted">
                  Subtotal
                </span>
                <span className="font-display text-[34px] leading-none font-black">
                  {formatCents(subtotalCents)}
                </span>
              </div>
              <p className="mb-5 text-[13px] text-muted">
                Tax is added at checkout. Pickup only — 152 Easton Ave.
              </p>
              <Link
                href="/checkout"
                onClick={close}
                className="btn btn-red w-full justify-center !rounded-2xl !py-4 text-[17px]"
              >
                Checkout
              </Link>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}

function CartRow({ line }: { line: CartLineView }) {
  const { setQuantity, remove } = useCart();

  return (
    <li className="flex gap-4 py-5">
      <div className="size-[86px] shrink-0 overflow-hidden rounded-2xl bg-cream/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={line.item.imagePath} alt="" className="size-full object-contain p-1" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[22px] leading-tight font-extrabold uppercase">
            {line.item.name}
          </h3>
          <span className="shrink-0 text-[16px] font-bold">
            {formatCents(line.lineTotalCents)}
          </span>
        </div>

        {line.selected.length ? (
          <p className="mt-1 text-[14px] leading-snug text-muted">
            {line.selected.map((s) => s.optionName).join(" · ")}
          </p>
        ) : null}
        {line.note ? (
          <p className="mt-1 text-[14px] leading-snug text-gold">“{line.note}”</p>
        ) : null}
        {line.problem ? (
          <p role="alert" className="mt-1 text-[14px] font-medium text-brand-2">
            {line.problem}
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-line">
            <Stepper
              label={`Remove one ${line.item.name}`}
              onClick={() => setQuantity(line.id, line.quantity - 1)}
            >
              −
            </Stepper>
            <span aria-live="polite" className="min-w-6 text-center text-[15px] font-bold">
              {line.quantity}
            </span>
            <Stepper
              label={`Add one ${line.item.name}`}
              disabled={line.quantity >= MAX_QUANTITY}
              onClick={() => setQuantity(line.id, line.quantity + 1)}
            >
              +
            </Stepper>
          </div>
          <button
            type="button"
            onClick={() => remove(line.id)}
            className="text-[14px] font-medium text-muted underline-offset-4 transition-colors hover:text-brand-2 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function Stepper({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full text-[19px] leading-none text-cream transition-colors hover:bg-cream/10 disabled:opacity-35"
    >
      {children}
    </button>
  );
}
