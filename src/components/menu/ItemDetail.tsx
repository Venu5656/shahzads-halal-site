import { formatCents } from "@/lib/money";
import { isSoldOut, startingPriceCents, type PricedItem } from "@/lib/menu/pricing";
import { orderUrl, ORDER_FALLBACK_TEL } from "@/lib/ordering";

export type DetailItem = PricedItem & {
  description: string;
  imagePath: string;
  badge?: string | null;
};

/**
 * One dish, described.
 *
 * This used to be a configurator: pick a rice, tick some sauces, watch a total
 * add up, add to a cart. Ordering is DoorDash's now, so none of that belongs
 * here — the choosing happens on their page.
 *
 * What stays is the information, because it is the reason somebody reads a
 * menu at all: that a platter comes with a choice of rice, that three sauces
 * are free, that fries and a soda can be added for five dollars. Dropping the
 * options to "see DoorDash for details" would make this a worse menu than the
 * printed one on the wall.
 *
 * So the groups are rendered as a description rather than a form: no inputs,
 * no state, no total. A server component with nothing to hydrate.
 */
export function ItemDetail({ item }: { item: DetailItem }) {
  const soldOut = isSoldOut(item);
  const from = startingPriceCents(item);
  const href = orderUrl(`item-${item.slug}`);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="kuro-serif text-[30px]">
          {from === null ? (
            <span style={{ color: "var(--muted)" }}>Ask in store</span>
          ) : (
            <>
              {item.optionGroups.some((g) => g.options.some((o) => o.priceCents > 0)) ? (
                <span className="kuro-label mr-2" style={{ letterSpacing: "0.12em" }}>
                  from
                </span>
              ) : null}
              {formatCents(from)}
            </>
          )}
        </p>
        {soldOut ? (
          <p className="kuro-label kuro-label-accent mt-3">Sold out right now</p>
        ) : null}
      </div>

      {item.optionGroups.length ? (
        <dl className="flex flex-col gap-6">
          {item.optionGroups.map((group) => (
            <div key={group.id}>
              <dt className="kuro-label kuro-label-accent">
                {group.name}
                {group.minSelect >= 1 ? " · choose one" : null}
                {group.maxSelect > 1 ? ` · up to ${group.maxSelect}` : null}
              </dt>
              <dd className="mt-2 text-[15.5px] leading-[1.8]" style={{ color: "var(--muted)" }}>
                {group.options
                  .map((o) => (o.priceCents > 0 ? `${o.name} +${formatCents(o.priceCents)}` : o.name))
                  .join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div>
        {soldOut ? (
          <p className="text-[15px]" style={{ color: "var(--muted)" }}>
            This one is off tonight. Everything else is on.
          </p>
        ) : href ? (
          <a href={href} target="_blank" rel="noopener" className="kuro-cta">
            Order now
            <span aria-hidden="true" className="text-[17px] leading-none">→</span>
          </a>
        ) : (
          <a href={`tel:${ORDER_FALLBACK_TEL}`} className="kuro-cta">
            Call to order
          </a>
        )}
        <p className="kuro-label mt-4" style={{ color: "var(--muted-dim)" }}>
          Choices are made when you order · prices confirmed at checkout
        </p>
      </div>
    </div>
  );
}
