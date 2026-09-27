"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as cart from "@/lib/cart/store";
import type { CartLine } from "@/lib/cart/types";
import { priceLine, sumLines, type PricedItem } from "@/lib/menu/pricing";

/**
 * Exposes the cart store to the tree, and turns raw lines into something
 * drawable: each line priced with the same function the server uses, and
 * flagged when it no longer prices at all.
 *
 * None of these numbers are trusted. They exist to draw the panel; checkout
 * re-prices everything from the database.
 */

export type CartItemView = PricedItem & { imagePath: string; description: string };

export type CartLineView = CartLine & {
  item: CartItemView;
  unitPriceCents: number;
  lineTotalCents: number;
  selected: { groupName: string; optionName: string; priceCents: number }[];
  /** Set when this line no longer prices — sold out, or an option withdrawn. */
  problem: string | null;
};

type CartContextValue = {
  lines: CartLineView[];
  itemCount: number;
  subtotalCents: number;
  isOpen: boolean;
  ready: boolean;
  open: () => void;
  close: () => void;
  add: (line: Omit<CartLine, "id">) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export type CartMenuIndex = Record<string, CartItemView>;

export function CartProvider({
  children,
  menu,
  initialLines,
  isSignedIn,
}: {
  children: ReactNode;
  /** Every live item, keyed by slug, so lines can be drawn and priced. */
  menu: CartMenuIndex;
  /** The stored cart for a signed-in customer. Empty for a guest. */
  initialLines: CartLine[];
  isSignedIn: boolean;
}) {
  const state = useSyncExternalStore(
    cart.subscribe,
    cart.getSnapshot,
    cart.getServerSnapshot,
  );
  const [isOpen, setIsOpen] = useState(false);

  // Reading localStorage and merging a guest cart are the store's job; this
  // only tells it to begin, once per page load.
  useEffect(() => {
    cart.start(initialLines, isSignedIn);
  }, [initialLines, isSignedIn]);

  const views = useMemo<CartLineView[]>(() => {
    return state.lines.flatMap((line): CartLineView[] => {
      const item = menu[line.itemSlug];
      // An item pulled from the menu while it sat in someone's cart.
      if (!item) return [];
      const priced = priceLine(item, line.optionIds, line.quantity, line.note);
      if (!priced.ok) {
        const unit = item.basePriceCents ?? 0;
        return [
          {
            ...line,
            item,
            unitPriceCents: unit,
            lineTotalCents: unit * line.quantity,
            selected: [],
            problem: priced.problems[0]!.message,
          },
        ];
      }
      return [
        {
          ...line,
          item,
          unitPriceCents: priced.line.unitPriceCents,
          lineTotalCents: priced.line.lineTotalCents,
          selected: priced.line.selected,
          problem: null,
        },
      ];
    });
  }, [state.lines, menu]);

  const totals = useMemo(() => sumLines(views.filter((view) => !view.problem)), [views]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: views,
      itemCount: totals.itemCount,
      subtotalCents: totals.subtotalCents,
      isOpen,
      ready: state.ready,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: cart.addLine,
      setQuantity: cart.setLineQuantity,
      remove: cart.removeLine,
      clear: cart.clearLines,
    }),
    [views, totals, isOpen, state.ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
