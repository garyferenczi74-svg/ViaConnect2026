import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0B1120",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: "ViaConnect GeneX360 — Precision Health",
    template: "%s | ViaConnect GeneX360",
  },
  description:
    "One Genome. One Formulation. One Life at a Time. Precision health platform by FarmCeutica Wellness LLC. Gene-guided supplements, AI clinical reasoning, and real-time wellness tracking.",
  keywords: [
    "precision health",
    "genomics",
    "supplements",
    "wellness",
    "MTHFR",
    "COMT",
    "pharmacogenomics",
    "gene-guided",
    "FarmCeutica",
    "ViaConnect",
    "GeneX360",
  ],
  authors: [{ name: "FarmCeutica Wellness LLC" }],
  creator: "FarmCeutica Wellness LLC",
  publisher: "FarmCeutica Wellness LLC",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://viaconnect.health"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "ViaConnect GeneX360 — Precision Health",
    description:
      "One Genome. One Formulation. One Life at a Time. Gene-guided supplements and AI-powered clinical reasoning.",
    siteName: "ViaConnect GeneX360",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ViaConnect GeneX360",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ViaConnect GeneX360 — Precision Health",
    description:
      "Gene-guided supplements and AI-powered clinical reasoning by FarmCeutica Wellness.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
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
