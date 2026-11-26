import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemDetail } from "@/components/menu/ItemDetail";
import "../../kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { formatCents } from "@/lib/money";
import { isSoldOut, startingPriceCents } from "@/lib/menu/pricing";
import { cutoutShadow } from "@/lib/menu/images";
import { getMenuItem } from "@/lib/menu/queries";

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

/*
 * There is deliberately no generateStaticParams here.
 *
 * There used to be, left over from when these pages were pre-rendered. With
 * force-dynamic above it pre-rendered nothing — but Next still ran it while
 * collecting page data, so every build opened a connection and listed the
 * menu. That made a reachable, already-migrated database a precondition of
 * compiling the site, which is the wrong way round: the first deploy of a new
 * environment then fails, because the database it is being pointed at has no
 * tables in it yet.
 *
 * Nothing is lost by its absence. The pages are rendered on demand either way.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const item = await getMenuItem((await params).slug);
  if (!item) return { title: "Not on the menu · Shahzad's Halal Food" };
  return {
    title: `${item.name} · Shahzad's Halal Food`,
    description: item.description,
  };
}

/**
 * One item, full page. This is what a phone gets when it taps a card, and what
 * any shared link opens. The desktop dialog renders the same <ItemDetail>.
 */
export default async function MenuItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = await getMenuItem((await params).slug);
  if (!item) notFound();

  const soldOut = isSoldOut(item);
  const from = startingPriceCents(item);

  return (
    <>
      <KuroHeader />
      <main className="pb-24">
      <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imagePath}
              data-dish-image=""
          alt=""
          className={`size-full object-contain p-6 ${cutoutShadow(item.imagePath, "lg")}`}
        />
        <Link
          href="/menu"
          aria-label="Back to the menu"
          className="absolute top-4 left-4 grid size-11 place-items-center rounded-full bg-ink/80 text-cream backdrop-blur-sm transition-colors hover:bg-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
      </div>

      <div className="wrap max-w-[640px] pt-8">
        <header className="mb-8">
          <span className="eyebrow">{item.categoryName}</span>
          <h1 className="mt-3 font-display text-[clamp(38px,8vw,60px)] leading-[0.92]">
            {item.name}
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">{item.description}</p>
          <div className="mt-4 flex items-center gap-3">
            {from !== null ? (
              <span className="text-[22px] font-bold text-gold">{formatCents(from)}</span>
            ) : null}
            {soldOut ? (
              <span className="rounded-full bg-brand/15 px-3 py-1.5 text-[12px] font-black tracking-[0.08em] uppercase text-brand-2">
                Sold out
              </span>
            ) : null}
          </div>
        </header>

        <ItemDetail item={item} />
      </div>
      </main>
    </>
  );
}
