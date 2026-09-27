import type { Metadata } from "next";
import Link from "next/link";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { getMenu } from "@/lib/menu/queries";

export const metadata: Metadata = {
  title: "Menu · Shahzad's Halal Food",
  description:
    "Platters over rice, gyros, cheesesteaks, wings and sides — every protein halal. Order ahead for pickup on Easton Ave.",
};

export default async function MenuPage() {
  const categories = await getMenu();

  return (
    <>
      <SiteHeader />
      <main className="wrap pt-10 pb-28 sm:pt-14">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="eyebrow">Order ahead · pickup only</span>
          <h1 className="mt-3 font-display text-[clamp(48px,9vw,96px)] leading-[0.88] font-black uppercase">
            The{" "}
            <em className="font-serif text-[0.8em] font-bold tracking-[-0.03em] text-gold normal-case italic">
              menu
            </em>
          </h1>
        </div>
        <p className="max-w-[420px] text-[17px] leading-relaxed text-muted">
          Everything is made to order on the flat-top. Pick your sauces, tell us anything the
          kitchen should know, and collect it at 152 Easton Ave.
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
