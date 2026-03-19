"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Leaf,
  TrendingUp,
  Brain,
  TestTube,
  Shield,
  Calendar,
  Settings,
  Search,
  Bell,
  ChevronRight,
  Plus,
  UserPlus,
  ClipboardPlus,
  Zap,
  X,
  LogOut,
  User,
} from "lucide-react"

// ─── Sidebar Context ────────────────────────────────────────────────────────

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
})

function useSidebar() {
  return React.useContext(SidebarContext)
}

// ─── Nav Items ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Protocols", href: "/protocols", icon: ClipboardList },
  { label: "Formulary", href: "/interactions", icon: Leaf },
  { label: "Outcomes", href: "/analytics", icon: TrendingUp },
  { label: "AI Engine", href: "/genex360", icon: Brain },
  { label: "Labs/EHR", href: "/ehr", icon: TestTube },
  { label: "Compliance", href: "/cme", icon: Shield },
  { label: "Schedule", href: "/protocols/builder", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings },
] as const

const MOBILE_TABS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Protocols", href: "/protocols", icon: ClipboardList },
  { label: "AI", href: "/genex360", icon: Brain },
  { label: "More", href: "/settings", icon: Settings },
] as const

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/protocols": "Protocols",
  "/interactions": "Formulary",
  "/analytics": "Outcomes",
  "/genex360": "AI Engine",
  "/ehr": "Labs/EHR",
  "/cme": "Compliance",
  "/settings": "Settings",
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar() {
  const pathname = usePathname()
  const { collapsed } = useSidebar()

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gray-900 border-r border-green-400/10 z-40 hidden md:flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 ${collapsed ? "justify-center px-2" : "px-5"} shrink-0`}>
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="shrink-0 flex items-center justify-center">
            <Leaf className="h-6 w-6 text-green-400" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold text-green-400 tracking-tight">ViaConnect</span>
              <span className="text-xs text-white/40 mt-0.5">Practitioner Portal</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 text-sm font-medium transition-colors ${
                collapsed ? "justify-center mx-2 py-2.5 rounded-lg" : "pl-4 pr-3 py-2.5"
              } ${
                isActive
                  ? `bg-green-400/10 text-green-400 ${!collapsed ? "border-l-2 border-green-400" : ""}`
                  : "text-white/60 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-green-400" : ""}`} />
              {!collapsed && <span>{item.label}</span>}
              {/* Tooltip for collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg border border-green-400/10">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Practitioner Info */}
      <div className={`shrink-0 border-t border-green-400/10 ${collapsed ? "p-2" : "p-4"}`}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center text-xs font-bold text-green-400">
              SM
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center text-xs font-bold text-green-400 shrink-0">
              SM
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">Dr. Sarah Mitchell</p>
              <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 bg-green-400/20 text-green-400 rounded mt-0.5">
                MD/ND
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Top Bar ────────────────────────────────────────────────────────────────

function TopBar() {
  const pathname = usePathname()
  const { collapsed } = useSidebar()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const currentPage = React.useMemo(() => {
    const match = Object.entries(pageTitles).find(
      ([path]) => pathname === path || pathname.startsWith(path + "/")
    )
    return match ? match[1] : "Dashboard"
  }, [pathname])

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-30 bg-gray-900/80 backdrop-blur-md border-b border-green-400/10 flex items-center gap-4 px-6 transition-all duration-300 ${
        collapsed ? "left-16" : "left-64"
      } hidden md:flex`}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-white/40">Portal</span>
        <ChevronRight className="h-3.5 w-3.5 text-white/20" />
        <span className="text-white font-medium">{currentPage}</span>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <button className="flex items-center gap-2 bg-gray-800/50 border border-gray-600/50 rounded-lg w-96 px-4 py-2 text-sm text-white/40 hover:border-green-400/30 transition-colors">
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search patients, protocols, supplements...</span>
        <kbd className="hidden sm:flex items-center gap-0.5 border border-gray-600/50 bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/30">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Notification Bell */}
      <button className="relative p-2 text-white/60 hover:text-white transition-colors" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
          3
        </span>
      </button>

      {/* Avatar Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-9 h-9 rounded-full bg-green-400/20 border border-green-400/30 flex items-center justify-center text-xs font-bold text-green-400 hover:border-green-400/50 transition-colors"
        >
          SM
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-green-400/15 rounded-xl shadow-xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-gray-700/50">
              <p className="text-sm font-medium text-white">Dr. Sarah Mitchell</p>
              <p className="text-xs text-white/40">sarah.mitchell@viaconnect.health</p>
            </div>
            <div className="py-1">
              <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-gray-700/50 hover:text-white transition-colors">
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-gray-700/50 hover:text-white transition-colors">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </div>
            <div className="border-t border-gray-700/50 py-1">
              <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50 transition-colors">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

// ─── Mobile Top Bar ─────────────────────────────────────────────────────────

function MobileTopBar() {
  const pathname = usePathname()
  const currentPage = React.useMemo(() => {
    const match = Object.entries(pageTitles).find(
      ([path]) => pathname === path || pathname.startsWith(path + "/")
    )
    return match ? match[1] : "Dashboard"
  }, [pathname])

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-30 bg-gray-900/95 backdrop-blur-md border-b border-green-400/10 flex items-center justify-between px-4 md:hidden">
      <div className="flex items-center gap-2">
        <Leaf className="h-5 w-5 text-green-400" />
        <span className="text-sm font-bold text-green-400">ViaConnect</span>
      </div>
      <span className="text-sm font-medium text-white">{currentPage}</span>
      <div className="flex items-center gap-2">
        <button className="relative p-1.5 text-white/60" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-400 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
            3
          </span>
        </button>
        <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center text-[10px] font-bold text-green-400">
          SM
        </div>
      </div>
    </header>
  )
}

// ─── Floating Action Button ─────────────────────────────────────────────────

function FAB() {
  const [open, setOpen] = React.useState(false)
  const fabRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const items = [
    { label: "New Patient", icon: UserPlus, href: "/patients/new" },
    { label: "New Protocol", icon: ClipboardPlus, href: "/protocols/builder" },
    { label: "Quick Check", icon: Zap, href: "/interactions" },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden md:block" ref={fabRef}>
      {/* Expanded Menu */}
      {open && (
        <div className="absolute bottom-16 right-0 bg-gray-800 border border-green-400/15 rounded-xl shadow-xl overflow-hidden w-48 mb-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-gray-700/50 hover:text-green-400 transition-colors"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
          open
            ? "bg-gray-800 border border-green-400/15 text-green-400 rotate-45"
            : "bg-green-400 text-gray-900 shadow-green-400/20 hover:bg-green-300 hover:shadow-green-400/30"
        }`}
        aria-label={open ? "Close menu" : "Quick actions"}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  )
}

// ─── Mobile Bottom Tab Nav ──────────────────────────────────────────────────

function MobileTabNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-t border-green-400/10 flex justify-around items-center px-2 pb-4 pt-2 md:hidden">
      {MOBILE_TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
              isActive ? "text-green-400" : "text-white/40"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// ─── Dashboard Layout ───────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(false)

  // Auto-collapse on medium screens
  React.useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setCollapsed(true)
      } else if (window.innerWidth >= 1024) {
        setCollapsed(false)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-[#111827] text-white">
        {/* Desktop */}
        <Sidebar />
        <TopBar />

        {/* Mobile */}
        <MobileTopBar />

        {/* Main Content */}
        <main
          className={`transition-all duration-300 ${
            collapsed ? "md:ml-16" : "md:ml-64"
          } mt-14 md:mt-16 overflow-y-auto h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8">
            {children}
          </div>
        </main>

        {/* FAB */}
        <FAB />

        {/* Mobile Bottom Nav */}
        <MobileTabNav />
      </div>
    </SidebarContext.Provider>
  )
}
