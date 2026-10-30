"use client";

import { useMemo, useState } from "react";
import { formatCents } from "@/lib/money";
import {
  MAX_NOTE_LENGTH,
  MAX_QUANTITY,
  isSoldOut,
  priceLine,
  type PricedItem,
} from "@/lib/menu/pricing";
import { useCart } from "@/components/cart/CartProvider";
import { useFlyToCart } from "@/components/cart/FlyToCart";

export type ItemFormItem = PricedItem & {
  description: string;
  imagePath: string;
  badge?: string | null;
};

/**
 * Choosing options for one item.
 *
 * The running total is computed by the same `priceLine` the server uses at
 * checkout, so what the customer watches tick up here is arithmetic they will
 * see again — not a second, subtly different implementation.
 *
 * Groups that take one choice render as radios, groups that take several as
 * checkboxes, and the maximum is enforced as you click rather than complained
 * about after: at the limit, the boxes you have not ticked go disabled.
 */
export function ItemForm({
  item,
  onAdded,
  autoFocus,
}: {
  item: ItemFormItem;
  onAdded?: () => void;
  autoFocus?: boolean;
}) {
  const { add, open } = useCart();
  const flyToCart = useFlyToCart();

  // Required single-choice groups start on their first option, so the cheapest
  // configuration is always valid and the total is never blank.
  const [selected, setSelected] = useState<string[]>(() =>
    item.optionGroups
      .filter((group) => group.minSelect >= 1 && group.maxSelect === 1)
      .flatMap((group) => (group.options[0] ? [group.options[0].id] : [])),
  );
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const soldOut = isSoldOut(item);
  const priced = useMemo(
    () => priceLine(item, selected, quantity, note || null),
    [item, selected, quantity, note],
  );

  const problemFor = (groupSlug: string) =>
    !priced.ok
      ? priced.problems.find((p) => "groupSlug" in p && p.groupSlug === groupSlug)?.message
      : undefined;

  const toggle = (groupId: string, optionId: string) => {
    setSelected((current) => {
      const group = item.optionGroups.find((g) => g.id === groupId)!;
      const ids = group.options.map((o) => o.id);
      const exclusive = group.maxSelect === 1;
      const checked = current.includes(optionId);

      if (exclusive) {
        // Choosing replaces whatever else was chosen in this group. Choosing
        // the same one again clears it, but only where the group is optional —
        // a required choice cannot be left blank.
        if (checked) return group.minSelect >= 1 ? current : current.filter((id) => id !== optionId);
        return [...current.filter((id) => !ids.includes(id)), optionId];
      }

      return checked ? current.filter((id) => id !== optionId) : [...current, optionId];
    });
  };

  const submit = () => {
    if (!priced.ok) {
      setShowErrors(true);
      return;
    }
    add({ itemSlug: item.slug, optionIds: selected, quantity, note: note.trim() || null });
    // The dish flies only once it is genuinely in the cart, and the picture it
    // flies is whichever one this screen is showing — the dialog's or the item
    // page's. Decoration: nothing below waits on it.
    flyToCart(document.querySelector<HTMLElement>("[data-dish-image]"));
    open();
    onAdded?.();
  };

  return (
    <div className="flex flex-col gap-7">
      {item.optionGroups.map((group) => {
        // A required one-of-many is a radio. An optional one is a checkbox: a
        // radio can never be un-ticked, and "Add fries and a soda" has to be
        // something you can change your mind about.
        const single = group.maxSelect === 1 && group.minSelect >= 1;
        const exclusive = group.maxSelect === 1;
        const chosenInGroup = group.options.filter((o) => selected.includes(o.id)).length;
        const atLimit = !exclusive && chosenInGroup >= group.maxSelect;
        const error = showErrors ? problemFor(group.slug) : undefined;

        return (
          <fieldset key={group.id} className="border-0 p-0">
            <legend className="mb-1 font-display text-[26px] leading-none font-extrabold uppercase">
              {group.name}
            </legend>
            <p className="mb-4 text-[14px] text-muted">
              {group.minSelect >= 1 ? "Required. " : ""}
              {exclusive
                ? "Pick one."
                : `Pick up to ${group.maxSelect}.${atLimit ? " That's the limit." : ""}`}
            </p>

            <div className="flex flex-col gap-2">
              {group.options.map((option) => {
                const checked = selected.includes(option.id);
                const disabled = !exclusive && atLimit && !checked;
                return (
                  <label
                    key={option.id}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-[16px] transition-colors duration-200",
                      checked
                        ? "border-gold bg-gold/10 text-cream"
                        : "border-line bg-cream/[0.03] text-cream hover:border-line-strong",
                      disabled ? "cursor-not-allowed opacity-40" : "",
                    ].join(" ")}
                  >
                    <input
                      type={single ? "radio" : "checkbox"}
                      name={single ? group.id : `${group.id}-${option.id}`}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(group.id, option.id)}
                      className="size-5 shrink-0 accent-[#e23a2f]"
                    />
                    <span className="flex-1">{option.name}</span>
                    {option.priceCents > 0 ? (
                      <span className="text-[15px] font-bold text-gold">
                        +{formatCents(option.priceCents)}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>

            {error ? (
              <p role="alert" className="mt-2 text-[14px] font-medium text-brand-2">
                {error}
              </p>
            ) : null}
          </fieldset>
        );
      })}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="item-note"
          className="font-display text-[26px] leading-none font-extrabold uppercase"
        >
          Anything else?
        </label>
        <p className="text-[14px] text-muted">
          Allergies, no onions, extra crispy — the kitchen reads this.
        </p>
        <textarea
          id="item-note"
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE_LENGTH))}
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          placeholder="No onions, please"
          className="w-full resize-none rounded-2xl border border-line bg-ink px-4 py-3 text-[16px] text-cream outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-muted/60 focus:border-gold focus:shadow-[0_0_0_4px_rgb(245_181_61/0.15)]"
        />
        <p className="text-right text-[13px] text-muted">
          {note.length}/{MAX_NOTE_LENGTH}
        </p>
      </div>

      <div className="sticky bottom-0 -mx-6 mt-1 border-t border-line bg-ink/95 px-6 py-4 backdrop-blur-sm sm:-mx-8 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-line">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="One fewer"
              className="grid size-11 place-items-center rounded-full text-[21px] leading-none transition-colors hover:bg-cream/10 disabled:opacity-35"
            >
              −
            </button>
            <span aria-live="polite" className="min-w-7 text-center text-[17px] font-bold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              disabled={quantity >= MAX_QUANTITY}
              aria-label="One more"
              className="grid size-11 place-items-center rounded-full text-[21px] leading-none transition-colors hover:bg-cream/10 disabled:opacity-35"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={soldOut}
            autoFocus={autoFocus}
            className="btn btn-red flex-1 justify-center !rounded-2xl !py-4 text-[17px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {soldOut ? (
              "Sold out"
            ) : (
              <>
                Add to cart
                <span className="ml-auto pl-3 font-bold">
                  {priced.ok ? formatCents(priced.line.lineTotalCents) : "—"}
                </span>
              </>
            )}
          </button>
        </div>

        {showErrors && !priced.ok ? (
          <p role="alert" className="mt-3 text-[14px] font-medium text-brand-2">
            {priced.problems[0]!.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
