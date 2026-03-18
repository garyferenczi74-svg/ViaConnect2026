import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Continuing Medical Education | ViaConnect Practitioners Portal",
  description:
    "Track CME credits, complete accredited courses in pharmacogenomics and nutrigenomics, and manage professional certificates.",
}

export default function CMELayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
