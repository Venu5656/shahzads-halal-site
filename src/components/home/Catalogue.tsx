import Link from "next/link";
import { Reveal } from "./Reveal";
import { formatCents } from "@/lib/money";

/**
 * The specimen catalogue.
 *
 * Every dish alone on a flat field, at one scale, named the way the board
 * names it. The single scale is the point and not a detail: the old cards
 * sized each photograph to its own bounding box, so a round platter filled
 * 86% of its frame and a flat tray of fries filled 54%, and the sides read as
 * stranded. Here every tile is square and every dish is given the same share
 * of it, so a portion of fries is compared with a platter rather than lost
 * beside it.
 *
 * The fields rotate in a fixed order and one tile in seven is double size, so
 * the grid has a rhythm without any tile being decorated.
 */

export type CatalogueItem = {
  slug: string;
  name: string;
  categoryName: string;
  imagePath: string;
  fromCents: number | null;
  ranged: boolean;
};

const FIELDS = ["bg-field-1", "bg-field-4", "bg-field-2", "bg-field-1", "bg-field-4", "bg-field-3"];

export function Catalogue({ items, total }: { items: CatalogueItem[]; total: number }) {
  return (
    <section id="catalogue" className="border-t border-line px-6 py-24 sm:px-10">
      <div className="mb-12 grid max-w-[1100px] gap-6 sm:grid-cols-[auto_minmax(0,34ch)] sm:items-end sm:gap-12">
        <h2 className="font-display text-head leading-[0.92] font-black uppercase">
          The board,
          <br />
          <em className="font-serif text-[0.76em] font-bold tracking-[-0.03em] text-gold normal-case italic">
            dish by dish.
          </em>
        </h2>
        <p className="max-w-[34ch] text-body leading-relaxed text-muted">
          {total} dishes, in the sections the printed menu uses and at the prices it prints.
          Nothing here is a serving suggestion.
        </p>
      </div>

      <ul className="grid grid-flow-dense grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => {
          // One in seven runs double width, which keeps the grid from reading
          // as a product listing without giving any dish special treatment.
          const wide = i % 7 === 3;
          return (
            <Reveal as="li" key={item.slug} delay={(i % 4) * 90} className={wide ? "col-span-2" : undefined}>
              <Link href={`/menu/${item.slug}`} className="group block">
                <div
                  className={[
                    "grid aspect-square place-items-center overflow-hidden",
                    wide ? "sm:aspect-[2/1]" : "",
                    FIELDS[i % FIELDS.length],
                  ].join(" ")}
                >
                  <img
                    src={item.imagePath}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-[78%] object-contain drop-shadow-[0_16px_20px_rgb(0_0_0/0.4)] transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <p className="mt-3 text-small font-bold tracking-[0.16em] text-gold uppercase">
                  {item.categoryName}
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lead leading-none font-extrabold uppercase">
                    {item.name}
                  </h3>
                  <span className="shrink-0 text-body font-bold">
                    {item.fromCents === null ? (
                      <span className="text-muted">Ask</span>
                    ) : (
                      <>
                        {item.ranged ? (
                          <span className="text-small font-medium text-muted">from </span>
                        ) : null}
                        {formatCents(item.fromCents)}
                      </>
                    )}
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>

      <div className="mt-14 text-center">
        <Link
          href="/menu"
          className="inline-block bg-brand-ink px-8 py-4 text-body font-bold text-white transition-transform duration-300 hover:scale-[1.02]"
        >
          See all {total} dishes
        </Link>
      </div>
    </section>
  );
}
