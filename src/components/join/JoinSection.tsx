import { JoinForm } from "./JoinForm";

/**
 * The homepage's one ask.
 *
 * The site's job is to show the shop and hand the customer to the ordering
 * page. This is the only thing it keeps for itself: a way for Shahzad to tell
 * the people who already like his food that the lamb is on offer tonight —
 * the one piece of the relationship a delivery platform does not hold.
 */
export function JoinSection() {
  return (
    <section id="deals" aria-label="Offers by email" className="px-6 py-24 sm:px-10">
      <div className="mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="kuro-label kuro-label-accent">Deals and drops</p>
          <h2 className="kuro-serif mt-5 text-[clamp(38px,5vw,64px)]">
            Know before
            <br />
            <span style={{ color: "var(--accent)" }}>everybody else.</span>
          </h2>
          <p
            className="mt-7 max-w-[46ch] text-[16.5px] leading-[1.8]"
            style={{ color: "var(--muted)" }}
          >
            Shahzad sends the offers himself — a free drink with a platter, the lamb on special,
            the night the new thing goes on the board. No app, no points, no nonsense.
          </p>
        </div>
        <JoinForm />
      </div>
    </section>
  );
}
