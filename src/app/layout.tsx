import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ViaConnect 2026 — Genomic Health Platform",
  description: "Personalized nutraceutical recommendations powered by your genetic profile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
