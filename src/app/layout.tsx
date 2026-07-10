import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Store Management",
  description: "Internal stock, trip, invoice, and payment management"
};

export const preferredRegion = "sin1";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
