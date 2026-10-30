"use client";

import { useCart } from "./CartProvider";
import { CART_TARGET_ATTR } from "./FlyToCart";

/**
 * The header's cart control. Renders in both headers — the homepage's legacy
 * nav and SiteHeader — so `className` carries whatever each one needs.
 */
export function CartButton({ className = "" }: { className?: string }) {
  const { itemCount, open, ready } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      {...{ [CART_TARGET_ATTR]: "" }}
      aria-label={itemCount ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart"}
      className={`relative inline-flex items-center gap-2 rounded-full border border-line bg-cream/5 px-4 py-2.5 text-[15px] font-bold text-cream transition-colors duration-300 hover:border-line-strong ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[18px]">
        <path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
        <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {ready && itemCount > 0 ? (
        <span
          aria-hidden="true"
          className="grid min-w-6 place-items-center rounded-full bg-brand px-1.5 py-0.5 text-[12px] leading-none font-black text-white"
        >
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}
