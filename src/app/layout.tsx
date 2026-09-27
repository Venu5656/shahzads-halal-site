import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartPanel } from "@/components/cart/CartPanel";
import { CartProvider, type CartMenuIndex } from "@/components/cart/CartProvider";
import { getCurrentUser } from "@/lib/auth/dal";
import { loadCart } from "@/lib/cart/actions";
import { getMenuItems } from "@/lib/menu/queries";

export const metadata: Metadata = {
  title: "Shahzad's Halal Food · New Brunswick, NJ",
  description:
    "Halal platters, gyros and cheesesteaks on Easton Ave, New Brunswick. Open daily until 3 AM.",
  icons: { icon: "/img/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0907",
};

/**
 * The cart lives at the root so it survives navigation between the homepage,
 * the menu and an item page. The menu index travels with it: the panel has to
 * draw and price lines on a page that never queried the menu itself.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, items] = await Promise.all([getCurrentUser(), getMenuItems()]);
  const lines = user ? await loadCart() : [];

  const menuIndex: CartMenuIndex = Object.fromEntries(
    items.map((item) => [
      item.slug,
      {
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        imagePath: item.imagePath,
        basePriceCents: item.basePriceCents,
        isAvailable: item.isAvailable,
        outOfStockUntil: item.outOfStockUntil,
        optionGroups: item.optionGroups,
      },
    ]),
  );

  return (
    <html lang="en">
      <body>
        <CartProvider menu={menuIndex} initialLines={lines} isSignedIn={Boolean(user)}>
          {children}
          <CartPanel />
        </CartProvider>
      </body>
    </html>
  );
}
