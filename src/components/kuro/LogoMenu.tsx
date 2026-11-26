"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The logo, which on a phone is also the way around the site.
 *
 * The header's nav is hidden below md — there is no room for four links beside
 * a wordmark and an order button — so on a phone there was no navigation at
 * all. The only thing that looked tappable was the logo, and it went home.
 *
 * So it opens a menu instead, and "Home" is the first thing in it. Taking away
 * the one affordance somebody already understands and replacing it with
 * nothing would be a worse trade than the one it fixes.
 *
 * This is the only client component in the header. The header itself stays a
 * server component: nothing else on it changes after the page is sent, and
 * that is worth keeping for the sake of one dropdown.
 */

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/#platters", label: "Platters" },
  { href: "/#sauces", label: "Sauces" },
  { href: "/#hours", label: "Hours" },
  { href: "/#deals", label: "Deals" },
];

export function LogoMenu() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    // Escape closes and puts focus back, which is where somebody who pressed
    // it expects to be.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    // A tap anywhere else closes it. pointerdown rather than click, so the
    // menu is gone before the thing underneath reacts.
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close the menu" : "Open the menu"}
        className="flex items-center gap-2.5 rounded-2xl py-1 pr-2"
      >
        {/* Three lines, first thing in the bar. The shape is what everybody
            already reads as "there is a menu behind this" — but only where
            they expect to find it, which on a phone is the far left. Sitting
            between the name and the order button it read as punctuation.

            The middle line retracts when the panel is open, which says the
            same thing as spinning it into an X and is quieter about it. */}
        <span
          aria-hidden="true"
          className="mr-0.5 flex h-[18px] w-[22px] shrink-0 flex-col justify-center gap-[4px]"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[2px] rounded-full transition-all duration-200"
              style={{
                background: open ? "var(--ink)" : "var(--muted)",
                width: open && i === 1 ? "60%" : "100%",
              }}
            />
          ))}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/logo.png"
          alt=""
          width={38}
          height={38}
          className="size-9 shrink-0 object-contain"
          style={{ filter: "drop-shadow(0 0 12px rgb(226 58 47 / 0.5))" }}
        />
        {/* The name, with what the shop sells under it. It used to be hidden
            below 480px, which left a phone with a logo and nothing else — so
            it is smaller and tighter here than the desktop wordmark rather
            than absent. */}
        <span className="flex min-w-0 flex-col items-start leading-none">
          <span
            className="kuro-serif text-[17px] whitespace-nowrap sm:text-[19px]"
            style={{ letterSpacing: "0.2em" }}
          >
            SHAHZAD&rsquo;S
          </span>
          <span
            className="kuro-label mt-[3px] whitespace-nowrap"
            style={{ fontSize: "9.5px", letterSpacing: "0.22em", color: "var(--muted)" }}
          >
            HALAL FOOD
          </span>
        </span>

      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute top-[calc(100%+10px)] left-0 z-50 w-[220px] overflow-hidden rounded-2xl border shadow-[0_30px_60px_-20px_#000]"
        style={{ borderColor: "var(--line-strong)", background: "var(--bg-panel)" }}
      >
        <nav aria-label="Site">
          <ul className="flex flex-col py-2">
            {LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-3 text-[16px] transition-colors"
                  style={{ color: "var(--ink)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t px-5 py-3" style={{ borderColor: "var(--line)" }}>
            <a
              href="tel:+18482021430"
              onClick={() => setOpen(false)}
              className="block text-[14.5px]"
              style={{ color: "var(--muted)" }}
            >
              (848) 202-1430
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
