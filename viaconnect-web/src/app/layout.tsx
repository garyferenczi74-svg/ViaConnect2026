import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // viewportFit: "cover" lets content sit under the iOS status bar /
  // home indicator. Pair with env(safe-area-inset-*) padding in CSS
  // so interactive elements stay clear of the notch + gesture area.
  viewportFit: "cover",
  themeColor: "#0B1120",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: "ViaConnect GeneX360: Precision Health",
    template: "%s | ViaConnect GeneX360",
  },
  description:
    "One Genome. One Formulation. One Life at a Time. Precision health platform by ViaConnect. Gene-guided supplements, AI clinical reasoning, and real-time wellness tracking.",
  keywords: [
    "precision health",
    "genomics",
    "supplements",
    "wellness",
    "MTHFR",
    "COMT",
    "pharmacogenomics",
    "gene-guided",
    "ViaConnect",
    "ViaConnect",
    "GeneX360",
  ],
  authors: [{ name: "ViaConnect" }],
  creator: "ViaConnect",
  publisher: "ViaConnect",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://viaconnect.health"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "ViaConnect GeneX360: Precision Health",
    description:
      "One Genome. One Formulation. One Life at a Time. Gene-guided supplements and AI-powered clinical reasoning.",
    siteName: "ViaConnect GeneX360",
    // Sweep 2026-06-12: og-image.png never existed in public/, so the
    // images entries here and on twitter 404ed on every share embed.
    // Restore both once a real 1200x630 asset is designed.
  },
  twitter: {
    card: "summary_large_image",
    title: "ViaConnect GeneX360: Precision Health",
    description:
      "Gene-guided supplements and AI-powered clinical reasoning by ViaConnect.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ViaConnect",
    statusBarStyle: "black-translucent",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="font-sans antialiased bg-dark-bg text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
