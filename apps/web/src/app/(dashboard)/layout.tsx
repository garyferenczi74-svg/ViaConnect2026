"use client"

import * as React from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Mobile Navigation */}
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileNavOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
