import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ViaConnect GeneX360",
  description:
    "One Genome. One Formulation. One Life at a Time. Precision health by FarmCeutica Wellness.",
  keywords: ["precision health", "genomics", "supplements", "wellness"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
