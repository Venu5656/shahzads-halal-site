import Link from "next/link";
import { orderUrl, ORDER_FALLBACK_TEL } from "@/lib/ordering";
import { LogoMenu } from "./LogoMenu";

/**
 * The counter's header.
 *
 * No cart and no account link. Ordering is DoorDash's, and nobody but the
 * owner has a reason to sign in — so the login lives at /admin and is not
 * advertised here. A customer should never learn this site has a login.
 *
 * A server component now, because without the cart there is nothing on this
 * header that changes after the page is sent.
 */
export function KuroHeader() {
  const href = orderUrl("header");

  return (
    <header className="relative z-40 flex items-center justify-between gap-6 px-6 py-6 sm:px-10">
      {/* Below md the links do not fit, so the logo carries them. At md and
          up the nav is on the header already and the logo goes home, which is
          what a logo should do when there is room for both. */}
      <div className="md:hidden">
        <LogoMenu />
      </div>

      <Link
        href="/"
        className="hidden items-center gap-3 md:flex"
        aria-label="Shahzad's Halal Food, home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/logo.png"
          alt=""
          width={38}
          height={38}
          className="size-9 shrink-0 object-contain"
          style={{ filter: "drop-shadow(0 0 12px rgb(226 58 47 / 0.5))" }}
        />
        <span
          className="kuro-serif text-[21px] whitespace-nowrap sm:text-[24px]"
          style={{ letterSpacing: "0.26em" }}
        >
          SHAHZAD&rsquo;S
        </span>
      </Link>

      <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
        {[
          { href: "/menu", label: "Menu" },
          { href: "/#sauces", label: "Sauces" },
          { href: "/#hours", label: "Hours" },
          { href: "/#deals", label: "Deals" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-[15px] transition-colors"
            style={{ color: "var(--muted)" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {href ? (
        <a href={href} target="_blank" rel="noopener" className="kuro-cta !px-4 !py-2.5 !text-[13px] whitespace-nowrap sm:!px-6 sm:!py-3 sm:!text-[14px]">
          Order now
        </a>
      ) : (
        /* No link configured yet. A button that goes nowhere is worse than a
           phone number that works, so this falls back rather than pretending. */
        <a href={`tel:${ORDER_FALLBACK_TEL}`} className="kuro-cta !px-4 !py-2.5 !text-[13px] whitespace-nowrap sm:!px-6 sm:!py-3 sm:!text-[14px]">
          Call to order
        </a>
      )}
    </header>
  );
}
