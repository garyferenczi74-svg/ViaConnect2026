import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ViaConnect - Botanical Formulary",
  description: "Practitioner botanical formulary and protocol builder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white antialiased">{children}</body>
    </html>
  );
}
