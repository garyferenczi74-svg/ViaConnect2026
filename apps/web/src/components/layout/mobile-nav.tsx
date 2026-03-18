"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { mainNavItems, bottomNavItems } from "@/components/layout/sidebar"
import { Separator } from "@/components/ui/separator"

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()

  // Close on route change
  React.useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">
              V
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-gray-900">ViaConnect</span>
              <span className="text-[10px] font-semibold text-emerald-600 tracking-wide">
                GeneX360
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <Separator />

        <div className="px-3 py-4 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
