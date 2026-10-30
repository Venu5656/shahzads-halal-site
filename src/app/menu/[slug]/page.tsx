import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/menu/ItemForm";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { formatCents } from "@/lib/money";
import { isSoldOut, startingPriceCents } from "@/lib/menu/pricing";
import { cutoutShadow } from "@/lib/menu/images";
import { getMenuItem, getMenuItems } from "@/lib/menu/queries";

/** Pre-render every item; the menu is small and changes rarely. */
export async function generateStaticParams() {
  const items = await getMenuItems();
  return items.map((item) => ({ slug: item.slug }));
}

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
 * any shared link opens. The desktop dialog renders the same <ItemForm>.
 */
export default async function MenuItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = await getMenuItem((await params).slug);
  if (!item) notFound();

  const soldOut = isSoldOut(item);
  const from = startingPriceCents(item);

  return (
    <>
      <SiteHeader />
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
          <h1 className="mt-3 font-display text-[clamp(38px,8vw,60px)] leading-[0.92] font-black uppercase">
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

        <ItemForm item={item} />
      </div>
      </main>
    </>
  );
}
