"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { CART_TARGET_ATTR } from "@/components/cart/FlyToCart";
import { formatCents } from "@/lib/money";

/**
 * The counter's header.
 *
 * The order control carries the running total rather than only a count,
 * because on a page where one dish fills the screen the total is the thing a
 * visitor loses track of. It is also where a dish flies to, so it is marked
 * as the flight's target.
 *
 * It reuses the cart that the rest of the site uses — the same store, the
 * same server actions, the same persistence. Only the clothes are different.
 */
export function KuroHeader({ signedIn }: { signedIn: boolean }) {
  const { itemCount, subtotalCents, open, ready } = useCart();

  return (
    <header className="relative z-40 flex items-center justify-between gap-6 px-6 py-6 sm:px-10">
      <Link href="/" className="flex items-center gap-3" aria-label="Shahzad's Halal Food, home">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full border"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          <span className="kuro-serif text-[17px] leading-none">S</span>
        </span>
        <span
          className="kuro-serif hidden text-[21px] whitespace-nowrap min-[480px]:inline sm:text-[24px]"
          style={{ letterSpacing: "0.26em" }}
        >
          SHAHZAD&rsquo;S
        </span>
      </Link>

      <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
        {[
          { href: "#platters", label: "Menu", active: true },
          { href: "/menu", label: "Full menu", active: false },
          { href: "#visit", label: "Visit", active: false },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="relative text-[15px] transition-colors"
            style={{ color: item.active ? "var(--ink)" : "var(--muted)" }}
          >
            {item.label}
            {item.active ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-2 left-1/2 size-1 -translate-x-1/2 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        {signedIn ? (
          <Link
            href="/account"
            className="text-[15px] whitespace-nowrap transition-colors"
            style={{ color: "var(--muted)" }}
          >
            Account
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="text-[15px] whitespace-nowrap transition-colors"
              style={{ color: "var(--muted)" }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full border px-3.5 py-2.5 text-[14px] whitespace-nowrap transition-colors sm:px-4"
              style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
            >
              Sign up
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={open}
          {...{ [CART_TARGET_ATTR]: "" }}
          aria-label={itemCount ? `Order, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Order"}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-2.5 text-[14px] transition-colors sm:gap-3 sm:px-4"
          style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[17px]">
            <path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
            <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
          </svg>
          <span className="hidden sm:inline">Order</span>
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-full text-[11px] leading-none font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            {ready ? itemCount : 0}
          </span>
          <span className="kuro-label" style={{ letterSpacing: "0.08em", color: "var(--ink)" }}>
            {formatCents(ready ? subtotalCents : 0)}
          </span>
        </button>
      </div>
    </header>
  );
}
