import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shahzad's Halal Food · New Brunswick, NJ",
  description:
    "Halal platters, gyros and cheesesteaks on Easton Ave, New Brunswick. Open daily until 3 AM.",
  icons: { icon: "/img/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0908",
};

/**
 * The root layout, now that ordering belongs to DoorDash.
 *
 * It used to carry the cart — a provider, a panel and the whole menu index —
 * because a cart has to survive navigation between the homepage, the menu and
 * an item page. None of that exists any more: the site shows the food and
 * hands the customer to DoorDash to order, so there is nothing to hold.
 *
 * It also no longer loads the signed-in user on every single request. Only the
 * manager area needs to know who is looking, and it asks for itself.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
