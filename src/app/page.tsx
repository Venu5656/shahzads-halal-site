import Link from "next/link";
import "./kuro.css";
import { KuroHeader } from "@/components/kuro/KuroHeader";
import { StoreHero } from "@/components/kuro/StoreHero";
import { PlateStage, type StagePlate } from "@/components/kuro/PlateStage";
import { Ticker } from "@/components/kuro/Ticker";
import { SauceRail } from "@/components/kuro/SauceRail";
import { StoreClock } from "@/components/kuro/StoreClock";
import { getCurrentUser } from "@/lib/auth/dal";
import { getMenu } from "@/lib/menu/queries";
import { SAUCES } from "@/lib/menu-data";
import {
  DAY_NAMES,
  HOURS,
  WEEK_ORDER,
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
  const [user, menu] = await Promise.all([getCurrentUser(), getMenu()]);

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

  const clockInitial = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

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
      <KuroHeader signedIn={Boolean(user)} />

      <main>
        <StoreHero
          closesLabel={closesLabel}
          clock={
            <StoreClock
              initial={clockInitial}
              statusLabel={statusLabel}
              isOpen={ordering.canOrder}
            />
          }
        />

        {plates.length ? <PlateStage plates={plates} /> : null}

        <SauceRail
          sauces={SAUCES.map((s) => ({
            slug: s.slug,
            name: s.name,
            color: s.color,
            heat: s.heat,
            description: s.description,
          }))}
        />

        {/* ------------------------------------------------------- the week */}
        <section id="visit" className="px-6 py-24 sm:px-10">
          <div className="mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-2">
            <div>
              <p className="kuro-label kuro-label-accent">Visit</p>
              <h2 className="kuro-serif mt-5 text-[clamp(38px,5vw,64px)]">
                Seventeen hours
                <br />a day.
              </h2>
              <address
                className="mt-8 text-[16px] leading-[1.9] not-italic"
                style={{ color: "var(--muted)" }}
              >
                152 Easton Ave
                <br />
                New Brunswick, NJ 08901
                <br />
                <a
                  href="tel:+18482021430"
                  className="underline-offset-4 hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  (848) 202-1430
                </a>
              </address>
              <p
                className="mt-6 max-w-[38ch] text-[15px] leading-[1.8]"
                style={{ color: "var(--muted-dim)" }}
              >
                Pickup only. Last orders are twenty minutes before close, because a ticket
                at 2:58 cannot be cooked and collected by three.
              </p>
            </div>

            <table className="w-full self-start">
              <caption className="sr-only">Opening hours</caption>
              <tbody>
                {WEEK_ORDER.map((day) => {
                  const [from, to] = HOURS[day]!;
                  const isToday = now.d === day;
                  return (
                    <tr key={day} className="border-b" style={{ borderColor: "var(--line)" }}>
                      <th
                        scope="row"
                        className="py-4 text-left text-[15.5px] font-normal"
                        style={{ color: isToday ? "var(--accent)" : "var(--ink)" }}
                      >
                        {DAY_NAMES[day]}
                      </th>
                      <td
                        className="py-4 text-right text-[15.5px] tabular-nums"
                        style={{ color: "var(--muted)" }}
                      >
                        {fmtHour(from)} — {fmtHour(to)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Ticker
        items={[
          "Halal off the flat-top",
          "152 Easton Ave",
          "Open till 3 am",
          "Pickup in 20 minutes",
          ordering.canOrder ? "Kitchen is live" : "Kitchen is closed",
          "Order ahead",
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
