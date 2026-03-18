"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  Menu,
  Search,
  Bell,
  ChevronRight,
  User,
  Settings,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/interactions": "Interactions",
  "/protocols": "Protocols",
  "/genex360": "GeneX360 Results",
  "/analytics": "Analytics",
  "/cme": "CME Credits",
  "/ehr": "EHR Integration",
  "/settings": "Settings",
  "/help": "Help",
}

interface HeaderProps {
  onMobileMenuToggle: () => void
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const pathname = usePathname()

  const currentPage = React.useMemo(() => {
    const match = Object.entries(pageTitles).find(
      ([path]) => pathname === path || pathname.startsWith(path + "/")
    )
    return match ? match[1] : "Dashboard"
  }, [pathname])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMobileMenuToggle}
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumb */}
      <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
        <span className="font-medium text-gray-400">Portal</span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        <span className="font-medium text-gray-900">{currentPage}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search bar */}
      <div className="hidden md:flex items-center">
        <button
          className="flex h-9 w-64 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 hover:bg-gray-100 hover:border-gray-300 transition-colors"
          onClick={() => {
            // Command palette would open here
          }}
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 font-mono text-[10px] font-medium text-gray-400 sm:flex">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </button>
      </div>

      {/* Notification bell */}
      <div className="relative">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5 text-gray-500" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </Button>
      </div>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-gray-50 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">SM</AvatarFallback>
            </Avatar>
            <div className="hidden lg:flex flex-col items-start leading-none">
              <span className="text-sm font-medium text-gray-900">Dr. Sarah Mitchell</span>
              <span className="text-xs text-gray-500">Integrative Medicine</span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>Dr. Sarah Mitchell</span>
              <span className="text-xs font-normal text-gray-500">
                sarah.mitchell@viaconnect.health
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4 text-gray-400" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4 text-gray-400" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
