import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { Stage, type Specimen } from "@/components/home/Stage";
import { Catalogue, type CatalogueItem } from "@/components/home/Catalogue";
import { PhotoSlot } from "@/components/home/PhotoSlot";
import { Reveal } from "@/components/home/Reveal";
import { getMenu } from "@/lib/menu/queries";
import { hasPriceRange, startingPriceCents } from "@/lib/menu/pricing";
import { formatCents } from "@/lib/money";
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
 * The homepage, rebuilt as a specimen catalogue.
 *
 * The idea: the board over the counter becomes a field guide. Fifty-three
 * dishes, each alone on a flat field at one scale, named as bluntly as the
 * kitchen names them — a chicken gyro is called "Chicken" on the printed menu
 * and it is called "Chicken" here.
 *
 * The one live thing is the clock. The kitchen runs seventeen hours, 10am to
 * 3am, and the only question a visitor at 2am actually has is whether there is
 * still time. It is answered in the first line, from the real hours and the
 * real 2:40am cutoff, rendered on the server so it is right with scripting off.
 */

export const dynamic = "force-dynamic";

/** The board's own words, for the three dishes the stage holds on. */
const STAGE_FACTS: Record<string, string> = {
  "mix-platter": "Lamb and chicken both, over rice, with salad and white sauce.",
  "chicken-gyro": "On pita, off the flat-top. The board just calls it Chicken.",
  "philly-cheesesteak": "Chopped steak, onions and cheese on a long roll.",
};

const STAGE_SLUGS = ["mix-platter", "chicken-gyro", "philly-cheesesteak"];

/** One line for the top of the page: can they order, and how long have they got? */
function openLine(): string {
  const now = nyNow();
  const store = storeStatus(now);
  const ordering = orderingStatus(now);

  if (ordering.canOrder) {
    const left = ordering.minutesLeft;
    if (left <= 45) return `Open now · last orders in ${left} min`;
    return `Open now · last orders ${fmtHour(ordering.lastOrderAt)}`;
  }
  if (ordering.reason === "cutoff") {
    return "Kitchen closing · ordering reopens in the morning";
  }
  return `Closed · opens in ${fmtDuration(store.hoursUntilChange)}`;
}

export default async function HomePage() {
  const categories = await getMenu();
  const all = categories.flatMap((c) => c.items.map((item) => ({ item, category: c })));
  const bySlug = new Map(all.map((row) => [row.item.slug, row]));

  const specimens: Specimen[] = STAGE_SLUGS.flatMap((slug) => {
    const row = bySlug.get(slug);
    if (!row) return [];
    const from = startingPriceCents(row.item);
    return [
      {
        slug,
        name: row.item.name,
        fact: STAGE_FACTS[slug] ?? row.item.description,
        imagePath: row.item.imagePath,
        priceLabel: from === null ? "Ask in store" : formatCents(from),
      },
    ];
  });

  // The catalogue shows a working spread across the board's sections rather
  // than one section's worth, so the page reads as the whole menu.
  const shown: CatalogueItem[] = categories
    .flatMap((category) => category.items.slice(0, 2).map((item) => ({ item, category })))
    .slice(0, 14)
    .map(({ item, category }) => ({
      slug: item.slug,
      name: item.name,
      categoryName: category.name,
      imagePath: item.imagePath,
      fromCents: startingPriceCents(item),
      ranged: hasPriceRange(item),
    }));

  return (
    <>
      <SiteHeader />
      <main>
        <Stage specimens={specimens} openNow={openLine()} />

        <Catalogue items={shown} total={all.length} />

        {/* ------------------------------------------------- how it works */}
        <section className="border-t border-line px-6 py-24 sm:px-10">
          <h2 className="mb-12 font-display text-head leading-[0.92] font-black uppercase">
            Three steps,
            <br />
            <em className="font-serif text-[0.76em] font-bold tracking-[-0.03em] text-gold normal-case italic">
              no queue.
            </em>
          </h2>
          <ol className="grid gap-10 sm:grid-cols-3">
            {[
              ["01", "Order and pay online", "Pick your sauces and tell the kitchen anything it needs to know."],
              ["02", "We start when it is confirmed", "Twenty minutes from the confirmation, not from the payment."],
              ["03", "Collect at 152 Easton", "Give your name at the counter. Pickup only — we do not deliver."],
            ].map(([n, title, body], i) => (
              <Reveal as="li" key={n} delay={i * 110}>
                <p className="mb-4 font-display text-head leading-none font-black text-brand">
                  {n}
                </p>
                <h3 className="font-display text-lead leading-tight font-extrabold uppercase">
                  {title}
                </h3>
                <p className="mt-2 max-w-[34ch] text-body leading-relaxed text-muted">{body}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------------ the place */}
        <section className="border-t border-line px-6 py-24 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <Reveal>
              <h2 className="font-display text-head leading-[0.92] font-black uppercase">
                On Easton,
                <br />
                <em className="font-serif text-[0.76em] font-bold tracking-[-0.03em] text-gold normal-case italic">
                  since the corner was quiet.
                </em>
              </h2>
              <p className="mt-7 max-w-[42ch] text-body leading-relaxed text-muted">
                New Brunswick keeps student hours, and so do we. Every protein is halal, every
                order is cooked when you place it, and the counter is still serving long after
                the rest of the street has shut.
              </p>
            </Reveal>
            <div className="grid grid-cols-2 gap-4">
              <PhotoSlot
                ratio="4/5"
                brief="The lit window on Easton Ave, about 1 am, from across the street."
              />
              <PhotoSlot ratio="4/5" brief="The flat-top working — chicken and lamb, mid-service." />
              <div className="col-span-2">
                <img
                  src="/img/found/rutgers-university-new-brunswick-downtown-george-street.jpg"
                  alt="Downtown New Brunswick: traffic on George Street, a city bus bound for New Brunswick, and the green-domed tower behind."
                  width={1920}
                  height={1440}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- visit */}
        <section id="visit" className="border-t border-line px-6 py-24 sm:px-10">
          <div className="grid gap-14 lg:grid-cols-2">
            <Reveal>
              <h2 className="font-display text-head leading-[0.92] font-black uppercase">
                Seventeen hours
                <br />
                <em className="font-serif text-[0.76em] font-bold tracking-[-0.03em] text-gold normal-case italic">
                  a day.
                </em>
              </h2>
              <address className="mt-8 text-lead leading-relaxed text-cream not-italic">
                152 Easton Ave
                <br />
                New Brunswick, NJ 08901
                <br />
                <a href="tel:+18482021430" className="text-gold underline-offset-4 hover:underline">
                  (848) 202-1430
                </a>
              </address>
              <p className="mt-6 max-w-[36ch] text-body leading-relaxed text-muted">
                Pickup only. Last orders are twenty minutes before close, because a ticket at 2:58
                cannot be cooked and collected by three.
              </p>
            </Reveal>

            <table className="w-full self-start">
              <caption className="sr-only">Opening hours</caption>
              <tbody>
                {WEEK_ORDER.map((day) => {
                  const [from, to] = HOURS[day]!;
                  const today = nyNow().d === day;
                  return (
                    <tr key={day} className="border-b border-line">
                      <th
                        scope="row"
                        className={[
                          "py-4 text-left text-body font-bold",
                          today ? "text-gold" : "text-cream",
                        ].join(" ")}
                      >
                        {DAY_NAMES[day]}
                      </th>
                      <td className="py-4 text-right text-body text-muted tabular-nums">
                        {fmtHour(from)} — {fmtHour(to)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------------------------------------------------- footer */}
        <footer className="border-t border-line px-6 py-14 sm:px-10">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <p className="font-display text-head leading-none font-black uppercase">
              Shahzad&rsquo;s Halal Food
            </p>
            <nav className="flex flex-wrap gap-6 text-body text-muted">
              <Link href="/menu" className="hover:text-cream">
                Menu
              </Link>
              <Link href="/legal/terms" className="hover:text-cream">
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-cream">
                Privacy
              </Link>
            </nav>
          </div>
          <p className="mt-8 max-w-[70ch] text-small leading-relaxed text-muted">
            Pictures:{" "}
            <a
              className="underline underline-offset-2 hover:text-cream"
              href="https://commons.wikimedia.org/wiki/File:Rutgers_University_New_Brunswick_downtown_George_Street_view_street_scene.jpg"
            >
              &ldquo;Rutgers University New Brunswick downtown George Street view street scene&rdquo;
            </a>{" "}
            by Tomwsulcer,{" "}
            <a
              className="underline underline-offset-2 hover:text-cream"
              href="https://creativecommons.org/publicdomain/zero/1.0/deed.en"
            >
              CC0
            </a>
            , via Wikimedia Commons.
          </p>
        </footer>
      </main>
    </>
  );
}
