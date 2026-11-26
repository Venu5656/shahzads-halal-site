import type { Metadata } from "next";
import Link from "next/link";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import "../kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { getMenu } from "@/lib/menu/queries";

/**
 * Never cached.
 *
 * The owner changes prices and marks dishes sold out from the manager, and a
 * menu that was rendered at build time would go on advertising last week's
 * prices and selling food the kitchen ran out of at one in the morning.
 *
 * This used to happen by accident: the root layout read cookies on every
 * request, which forced every page to render dynamically. Removing the cart
 * removed that, and these two pages quietly became static. They are the two
 * pages on the site whose content actually changes, so they say so themselves
 * rather than depending on something else's side effect.
 */
export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Menu · Shahzad's Halal Food",
  description:
    "Platters over rice, gyros, cheesesteaks, wings and sides — every protein halal, on Easton Ave in New Brunswick. Delivery and pickup.",
};

export default async function MenuPage() {
  const categories = await getMenu();

  return (
    <>
      <KuroHeader />
      <main className="wrap pt-10 pb-28 sm:pt-14">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="eyebrow">Delivery &amp; pickup · 152 Easton Ave</span>
          <h1 className="mt-3 font-display text-[clamp(48px,9vw,96px)] leading-[0.88]">
            The{" "}
            <em className="font-serif text-[0.8em] font-bold tracking-[-0.03em] text-gold normal-case italic">
              menu
            </em>
          </h1>
        </div>
        <p className="max-w-[420px] text-[17px] leading-relaxed text-muted">
          Everything is made to order on the flat-top, with your pick of the sauces. Prices
          are what you pay at the counter; what a delivery costs is set on the ordering page.
        </p>
      </div>

      <MenuBrowser categories={categories} />

      <p className="mt-14 text-center text-[15px] text-muted">
        Something missing?{" "}
        <Link href="/#visit" className="text-gold underline-offset-4 hover:underline">
          Call the store
        </Link>{" "}
        — we&apos;ll sort it out.
      </p>
      </main>
    </>
  );
}
