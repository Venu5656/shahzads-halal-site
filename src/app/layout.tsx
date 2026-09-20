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
  themeColor: "#0d0907",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
