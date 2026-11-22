import Link from "next/link";
import "./kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { StoreHero } from "@/components/kuro/StoreHero";
import { PlateStage, type StagePlate } from "@/components/kuro/PlateStage";
import { Ticker } from "@/components/kuro/Ticker";
import { SauceStage } from "@/components/kuro/SauceStage";
import { HoursDial } from "@/components/kuro/HoursDial";
import { JoinSection } from "@/components/join/JoinSection";
import { getMenu } from "@/lib/menu/queries";
import { SAUCES } from "@/lib/menu-data";
import {
  DAY_NAMES,
  HOURS,
  fmtDuration,
  fmtHour,
  nyNow,
  orderingStatus,
  storeStatus,
} from "@/lib/hours";

/**
 * The homepage, in the dark-counter design.
 *
 * Two screens, in this order and for a reason. The first is the shop: what it
 * is, where it is, and whether the grill is on right now — the only question a
 * visitor at two in the morning actually has. The second is the food, one
 * platter at a time, turning.
 *
 * Only platters reach the stage. They are the dishes photographed top-down,
 * and the filter is on the image path rather than the category, so a platter
 * that has not been re-shot can never arrive here by accident.
 *
 * Nothing on this page uses the ported homepage's stylesheet or any of its
 * classes. It shares the cart, the menu queries and the hours with the rest
 * of the site, and shares none of its clothes.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const menu = await getMenu();

  const now = nyNow();
  const store = storeStatus(now);
  const ordering = orderingStatus(now);

  const statusLabel = ordering.canOrder
    ? ordering.minutesLeft <= 45
      ? `Kitchen is live · last orders in ${ordering.minutesLeft} min`
      : `Kitchen is live · last orders ${fmtHour(ordering.lastOrderAt)}`
    : ordering.reason === "cutoff"
      ? "Kitchen closing · ordering reopens in the morning"
      : `Closed · opens in ${fmtDuration(store.hoursUntilChange)}`;

  // Formatted exactly as HoursDial ticks it, or the first tick visibly
  // rewrites the clock a second after the page settles.
  const clockInitial = `${now.h % 12 || 12}:${String(now.m).padStart(2, "0")} ${
    now.h < 12 ? "AM" : "PM"
  }`;

  const today = HOURS[now.d]!;
  const closesLabel = store.open
    ? `Open until ${fmtHour(today[1])}`
    : `${DAY_NAMES[now.d]} ${fmtHour(today[0])} — ${fmtHour(today[1])}`;

  const plates: StagePlate[] = (menu.find((c) => c.slug === "platters")?.items ?? [])
    .filter((item) => item.imagePath.includes("/img/menu/plate/"))
    .map((item) => ({
      slug: item.slug,
      name: item.name,
      description: item.description,
      imagePath: item.imagePath,
      priceCents: item.basePriceCents,
      categoryLabel: "Platters over rice",
    }));

  return (
    <div className="kuro">
      <KuroHeader />

      <main>
        <StoreHero closesLabel={closesLabel} statusLabel={statusLabel} isOpen={ordering.canOrder} />

        {plates.length ? <PlateStage plates={plates} /> : null}


        <SauceStage
          sauces={SAUCES.map((s) => ({
            slug: s.slug,
            name: s.name,
            color: s.color,
            ink: s.ink,
            heat: s.heat,
            description: s.description,
          }))}
        />

        <HoursDial initialNow={now} initialClock={clockInitial} />

        <JoinSection />
      </main>

      <Ticker
        /* No "pickup in 20 minutes" and no "order ahead": neither is ours to
           promise any more. The kitchen line is still true and still useful —
           it is the one thing here that changes. */
        items={[
          "Halal off the flat-top",
          "152 Easton Ave",
          "Open till 3 am",
          "Six sauces",
          ordering.canOrder ? "Kitchen is live" : "Kitchen is closed",
          "Delivery and pickup",
        ]}
      />

      <footer className="px-6 py-12 sm:px-10">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-6">
          <p className="kuro-label">Shahzad&rsquo;s Halal Food · New Brunswick</p>
          <nav className="flex flex-wrap gap-7 text-[14px]" style={{ color: "var(--muted)" }}>
            <Link href="/menu" className="hover:underline">
              Full menu
            </Link>
            <Link href="/legal/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:underline">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
