"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  ClipboardList,
  Dna,
  BarChart3,
  GraduationCap,
  Link as LinkIcon,
  Settings,
  HelpCircle,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const mainNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Interactions", href: "/interactions", icon: AlertTriangle },
  { label: "Protocols", href: "/protocols", icon: ClipboardList },
  { label: "GeneX360 Results", href: "/genex360", icon: Dna },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "CME Credits", href: "/cme", icon: GraduationCap },
  { label: "EHR Integration", href: "/ehr", icon: LinkIcon },
]

const bottomNavItems = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">
            V
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-gray-900">ViaConnect</span>
              <span className="text-[10px] font-semibold text-emerald-600 tracking-wide">
                GeneX360
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom navigation */}
      <div className="px-3 py-4 space-y-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

export { mainNavItems, bottomNavItems }
