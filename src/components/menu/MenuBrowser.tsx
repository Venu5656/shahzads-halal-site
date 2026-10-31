"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import { hasPriceRange, isSoldOut, startingPriceCents } from "@/lib/menu/pricing";
import { cutoutShadow } from "@/lib/menu/images";
import { ItemForm, type ItemFormItem } from "./ItemForm";
import { ItemDialog } from "./ItemDialog";

export type BrowserCategory = { id: string; name: string; slug: string; items: ItemFormItem[] };

/**
 * Sides, sweets, drinks and sauces are things you add to an order, not things
 * you come in for. They get a compact row instead of a full card: a $1.99 pita
 * has no business taking the same space as a $13.99 platter, and the flat, wide
 * cutouts these items use only fill about half of a tall photo box — so in a
 * full card they read as stranded rather than appetising.
 */
const ADD_ON_CATEGORIES = new Set(["sides", "desserts-and-sweets", "beverages", "extra-sauces"]);

/**
 * The menu: filter by category, search, and open an item to configure it.
 *
 * On a wide screen an item opens in a dialog so the menu stays behind it; on a
 * phone the card is a plain link to the item's own page, which is easier to
 * scroll and gives the back button something to do. The dialog and the page
 * render the same <ItemForm>, so there is one implementation of the rules.
 */
export function MenuBrowser({ categories }: { categories: BrowserCategory[] }) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState<ItemFormItem | null>(null);

  const allItems = useMemo(
    () => categories.flatMap((category) => category.items.map((item) => ({ item, category }))),
    [categories],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allItems.filter(({ item, category }) => {
      if (activeCategory !== "all" && category.slug !== activeCategory) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle) ||
        category.name.toLowerCase().includes(needle)
      );
    });
  }, [allItems, activeCategory, query]);

  // Mains keep their place in menu order; the add-ons fall to the bottom of
  // whatever is on screen, which is where you decide on them anyway.
  const [mains, addOns] = useMemo(() => {
    const mains: typeof results = [];
    const addOns: typeof results = [];
    for (const row of results) {
      (ADD_ON_CATEGORIES.has(row.category.slug) ? addOns : mains).push(row);
    }
    return [mains, addOns];
  }, [results]);

  const openOnDesktop = (item: ItemFormItem) => {
    // Coarse pointers get the full page; fine pointers get the dialog.
    if (window.matchMedia("(min-width: 900px)").matches) {
      setOpenItem(item);
    } else {
      router.push(`/menu/${item.slug}`);
    }
  };

  return (
    <>
      <div className="mb-8 flex flex-col gap-5">
        <label className="relative block">
          <span className="sr-only">Search the menu</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search — gyro, wings, falafel…"
            className="h-14 w-full rounded-full border border-line bg-card pl-13 pr-5 text-[17px] text-cream outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-muted/60 focus:border-gold focus:shadow-[0_0_0_4px_rgb(245_181_61/0.15)]"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Menu categories">
          <Tab
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            label="All"
            count={allItems.length}
          />
          {categories.map((category) => (
            <Tab
              key={category.id}
              active={activeCategory === category.slug}
              onClick={() => setActiveCategory(category.slug)}
              label={category.name}
              count={category.items.length}
            />
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="py-16 text-center text-[17px] text-muted">
          Nothing matches “{query}”. Try “gyro”, “rice” or “fries”.
        </p>
      ) : (
        <div className="flex flex-col gap-14">
          {mains.length ? (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mains.map(({ item, category }) => (
                <li key={item.id}>
                  <ItemCard
                    item={item}
                    categoryName={category.name}
                    onOpen={() => openOnDesktop(item)}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {addOns.length ? (
            <section>
              {/* Only worth a heading when there is something above it. */}
              {mains.length ? (
                <h2 className="mb-5 font-display text-[26px] leading-none">
                  Add to your order
                </h2>
              ) : null}
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {addOns.map(({ item, category }) => (
                  <li key={item.id}>
                    <AddOnRow
                      item={item}
                      categoryName={category.name}
                      onOpen={() => openOnDesktop(item)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <ItemDialog item={openItem} onClose={() => setOpenItem(null)}>
        {openItem ? (
          <ItemForm item={openItem} onAdded={() => setOpenItem(null)} autoFocus />
        ) : null}
      </ItemDialog>
    </>
  );
}

function Tab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "rounded-full border px-5 py-3 text-[15px] font-bold transition-all duration-300",
        active
          ? "border-cream bg-cream text-ink"
          : "border-line text-muted hover:border-line-strong hover:text-cream",
      ].join(" ")}
    >
      {label}
      <sup className="ml-1.5 text-[11px] opacity-60">{count}</sup>
    </button>
  );
}

/** What the price reads as before any options are picked. */
function Price({ item }: { item: ItemFormItem }) {
  const from = startingPriceCents(item);
  if (from === null) return <span className="text-muted">Ask in store</span>;
  return (
    <>
      {hasPriceRange(item) ? (
        <span className="text-[13px] font-medium text-muted">from </span>
      ) : null}
      {formatCents(from)}
    </>
  );
}

function ItemCard({
  item,
  categoryName,
  onOpen,
}: {
  item: ItemFormItem;
  categoryName: string;
  onOpen: () => void;
}) {
  const soldOut = isSoldOut(item);
  const from = startingPriceCents(item);

  return (
    <article
      className={[
        "group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-card transition-[border-color,box-shadow,transform] duration-500",
        soldOut ? "opacity-60" : "hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_30px_60px_-30px_#000]",
      ].join(" ")}
    >
      {/* No clipping here — the article already rounds and clips, and the food's
          shadow needs room to fall on the card. */}
      <div className="relative aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imagePath}
          alt=""
          loading="lazy"
          className={[
            "size-full object-contain p-4 transition-transform duration-700",
            cutoutShadow(item.imagePath, "md"),
            soldOut ? "grayscale" : "group-hover:scale-105",
          ].join(" ")}
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {soldOut ? (
            <span className="rounded-full bg-ink/85 px-3 py-1.5 text-[11px] font-black tracking-[0.08em] uppercase text-brand-2 backdrop-blur-sm">
              Sold out
            </span>
          ) : null}
          {!soldOut && item.badge ? (
            <span className="rounded-full bg-gold px-3 py-1.5 text-[11px] font-black tracking-[0.08em] uppercase text-ink">
              {item.badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* The printed menu names a gyro just "Chicken", so the section it
            came from has to travel with the name. */}
        <p className="mb-1 text-[12px] font-bold tracking-[0.16em] uppercase text-gold">
          {categoryName}
        </p>
        <h3 className="font-display text-[27px] leading-none">
          {item.name}
        </h3>
        <p className="mt-2 mb-4 line-clamp-2 flex-1 text-[15px] leading-snug text-muted">
          {item.description}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[18px] font-bold">
            <Price item={item} />
          </span>

          <button
            type="button"
            onClick={onOpen}
            disabled={soldOut || from === null}
            className="rounded-full bg-brand px-5 py-2.5 text-[15px] font-bold text-white transition-[transform,background-color] duration-300 hover:scale-[1.03] disabled:cursor-not-allowed disabled:bg-cream/10 disabled:text-muted"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {soldOut ? "Sold out" : from === null ? "Ask in store" : "Add"}
            <span className="sr-only"> {item.name} from {categoryName}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * A side, a sweet, a drink or a sauce: thumbnail, name, price, add. Same click
 * target and same dialog as a full card — only the footprint is smaller.
 */
function AddOnRow({
  item,
  categoryName,
  onOpen,
}: {
  item: ItemFormItem;
  categoryName: string;
  onOpen: () => void;
}) {
  const soldOut = isSoldOut(item);
  const from = startingPriceCents(item);

  return (
    <article
      className={[
        "group relative flex h-full items-center gap-4 rounded-2xl border border-line bg-card p-3 transition-[border-color,background-color] duration-300",
        soldOut ? "opacity-60" : "hover:border-gold/35 hover:bg-cream/[0.03]",
      ].join(" ")}
    >
      <div className="grid size-[76px] shrink-0 place-items-center rounded-xl bg-cream/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imagePath}
          alt=""
          loading="lazy"
          className={[
            "size-full object-contain p-1.5 transition-transform duration-500",
            cutoutShadow(item.imagePath, "sm"),
            soldOut ? "grayscale" : "group-hover:scale-[1.07]",
          ].join(" ")}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[21px] leading-none">
          {item.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-snug text-muted">
          {item.description}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pl-1">
        <span className="text-[16px] font-bold whitespace-nowrap">
          <Price item={item} />
        </span>
        <button
          type="button"
          onClick={onOpen}
          disabled={soldOut || from === null}
          className="rounded-full border border-line-strong px-4 py-1.5 text-[14px] font-bold text-cream transition-colors duration-300 hover:border-brand hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
        >
          <span className="absolute inset-0" aria-hidden="true" />
          {soldOut ? "Sold out" : from === null ? "Ask" : "Add"}
          <span className="sr-only"> {item.name} from {categoryName}</span>
        </button>
      </div>
    </article>
  );
}
