import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ViaConnect Practitioners Portal",
    template: "%s | ViaConnect",
  },
  description:
    "Precision health platform for healthcare professionals. Genomic-guided clinical decision support, drug-supplement interaction checking, and personalized protocol generation.",
  keywords: [
    "precision medicine",
    "pharmacogenomics",
    "nutrigenomics",
    "clinical decision support",
    "practitioner portal",
    "genomic health",
  ],
  authors: [{ name: "ViaConnect" }],
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#10B981",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
