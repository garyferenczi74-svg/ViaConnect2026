import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Population Health Analytics | ViaConnect Practitioners Portal",
  description:
    "Aggregate population health insights, demographic breakdowns, genetic variant prevalence, and protocol outcomes across your patient population.",
}

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
