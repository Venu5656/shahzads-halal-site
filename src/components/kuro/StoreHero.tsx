import Link from "next/link";

/**
 * The first screen, which is about the shop and not about a dish.
 *
 * The plates get the screen below this one; here the only job is to say what
 * this place is, where it is and whether it is on right now. The live line is
 * rendered on the server from the real hours, so it is right before any
 * script runs and right for someone reading at two in the morning.
 */
export function StoreHero({
  closesLabel,
  clock,
}: {
  closesLabel: string;
  /** The live clock, passed in so this stays a server component. */
  clock: React.ReactNode;
}) {
  return (
    <section className="relative px-6 pt-10 pb-20 sm:px-10 lg:pt-16 lg:pb-28">
      <div className="mx-auto max-w-[1320px]">
        {clock}

        <h1 className="kuro-serif mt-7 text-[clamp(52px,10vw,124px)]">
          Halal off the
          <br />
          flat-top,{" "}
          <span style={{ color: "var(--accent)" }}>till&nbsp;3&nbsp;am.</span>
        </h1>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <p
            className="max-w-[48ch] text-[17px] leading-[1.8]"
            style={{ color: "var(--muted)" }}
          >
            A counter on Easton Avenue in New Brunswick, cooking platters over rice,
            gyros and cheesesteaks to order. Seventeen hours a day, every protein halal,
            pickup only. Order ahead and it is bagged when you arrive.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="#platters" className="kuro-cta">
              See tonight&rsquo;s platters
              <span aria-hidden="true" className="text-[17px] leading-none">↓</span>
            </Link>
            <a
              href="tel:+18482021430"
              className="text-[15px] underline-offset-4 transition-colors hover:underline"
              style={{ color: "var(--muted)" }}
            >
              (848) 202-1430
            </a>
          </div>
        </div>

        <dl className="mt-16 grid gap-px border-t sm:grid-cols-3" style={{ borderColor: "var(--line)" }}>
          {[
            ["Where", "152 Easton Ave, New Brunswick"],
            ["Tonight", closesLabel],
            ["How", "Pickup only · ready in 20 minutes"],
          ].map(([term, value]) => (
            <div key={term} className="border-b py-6 sm:border-b-0" style={{ borderColor: "var(--line)" }}>
              <dt className="kuro-label">{term}</dt>
              <dd className="mt-2 text-[15.5px]" style={{ color: "var(--ink)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
