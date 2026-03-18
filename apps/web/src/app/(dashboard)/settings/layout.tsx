import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings | ViaConnect Practitioners Portal",
  description:
    "Manage your profile, practice information, notification preferences, security settings, and billing.",
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
