import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hounddog Content Intelligence | ViaConnect Admin',
}

export default function HounddogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
