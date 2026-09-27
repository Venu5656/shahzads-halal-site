/**
 * What a cart line is, on both sides of the wire.
 *
 * A line is identified by its *configuration*, not by a row id: the same item
 * with the same options and the same note is the same line, so adding it twice
 * bumps the quantity instead of stacking duplicate rows. That rule has to
 * agree between the browser and the server, so the signature lives here.
 */

import { z } from "zod";
import { MAX_NOTE_LENGTH, MAX_QUANTITY } from "@/lib/menu/pricing";

export type CartLine = {
  /** Stable key for React and for addressing a line. Derived from the signature. */
  id: string;
  itemSlug: string;
  optionIds: string[];
  quantity: number;
  note: string | null;
};

/** Same item, same options, same note → same line. */
export function lineSignature(input: {
  itemSlug: string;
  optionIds: string[];
  note: string | null;
}): string {
  const options = [...new Set(input.optionIds)].sort().join(",");
  const note = (input.note ?? "").trim().toLowerCase();
  return `${input.itemSlug}|${options}|${note}`;
}

export const cartLineSchema = z.object({
  itemSlug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "That isn't a menu item."),
  optionIds: z.array(z.string().min(1).max(40)).max(24).default([]),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
  note: z
    .string()
    .trim()
    .max(MAX_NOTE_LENGTH)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null),
});

/** A whole cart arriving from the browser — kept small enough to be sane. */
export const cartPayloadSchema = z.object({
  lines: z.array(cartLineSchema).max(50),
});

export type CartLineInput = z.infer<typeof cartLineSchema>;

/** Attaches the derived id, so the browser and the server agree on line keys. */
export function withId(line: CartLineInput): CartLine {
  return { ...line, id: lineSignature(line) };
}
