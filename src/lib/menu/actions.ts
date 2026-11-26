"use server";

import { field, type FormState } from "@/lib/auth/schemas";
import { setDescription, setPhoto, setPrice, setStock } from "./manage";
import { STOCK_MODES, type StockMode } from "./stock";

/**
 * The manager's server actions.
 *
 * Both re-check the role inside setPrice/setStock rather than trusting that the
 * page they were rendered on was behind a gate. A server action is a public
 * POST endpoint; the gate is wherever the work happens.
 */

const MODES = new Set<string>(STOCK_MODES.map((m) => m.mode));

export async function savePrice(_prev: FormState, form: FormData): Promise<FormState> {
  const itemId = field(form, "itemId") ?? "";
  const price = field(form, "price") ?? "";
  if (!itemId) return { error: "Nothing to save." };

  const result = await setPrice(itemId, price);
  return result.ok ? { notice: result.message } : { error: result.error, values: { price } };
}

export async function saveStock(_prev: FormState, form: FormData): Promise<FormState> {
  const itemId = field(form, "itemId") ?? "";
  const mode = field(form, "mode") ?? "";
  if (!itemId) return { error: "Nothing to save." };
  // An unrecognised mode is a crafted POST, not a misclick.
  if (!MODES.has(mode)) return { error: "That isn't one of the options." };

  const result = await setStock(itemId, mode as StockMode);
  return result.ok ? { notice: result.message } : { error: result.error };
}

export async function saveDescription(_prev: FormState, form: FormData): Promise<FormState> {
  const itemId = field(form, "itemId") ?? "";
  const description = field(form, "description") ?? "";
  if (!itemId) return { error: "Nothing to save." };

  const result = await setDescription(itemId, description);
  return result.ok
    ? { notice: result.message }
    : { error: result.error, values: { description } };
}

export async function savePhoto(_prev: FormState, form: FormData): Promise<FormState> {
  const itemId = field(form, "itemId") ?? "";
  const photo = form.get("photo");
  if (!itemId) return { error: "Nothing to save." };
  // Not a File at all means the form was not a multipart submission, which is
  // a crafted POST rather than somebody forgetting to pick a file.
  if (!(photo instanceof File)) return { error: "Choose a photo first." };
  if (photo.size === 0) return { error: "Choose a photo first." };

  const result = await setPhoto(itemId, photo);
  return result.ok ? { notice: result.message } : { error: result.error };
}
