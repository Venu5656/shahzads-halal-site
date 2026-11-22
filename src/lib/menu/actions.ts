"use server";

import { field, type FormState } from "@/lib/auth/schemas";
import { setPrice, setStock } from "./manage";
import { STOCK_MODES, type StockMode } from "./stock";

/**
 * The manager's two server actions.
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
