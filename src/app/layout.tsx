import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ViaConnect2026",
  description: "ViaConnect2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
