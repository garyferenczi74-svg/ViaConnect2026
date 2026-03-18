import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "EHR Integration | ViaConnect Practitioners Portal",
  description:
    "Connect and manage Electronic Health Record systems with FHIR R4 integration, data synchronization, and resource mapping.",
}

export default function EHRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
