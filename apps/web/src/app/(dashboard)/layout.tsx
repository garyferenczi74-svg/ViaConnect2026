"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  Database,
  Pill,
  Brain,
  Settings,
  Search,
  Bell,
  ChevronRight,
  Plus,
  UserPlus,
  FlaskConical,
  Zap,
  X,
  MoreHorizontal,
  ClipboardList,
  Home,
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

// ─── Nav Config ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Schedules", href: "/protocols/builder", icon: Calendar },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Records", href: "/ehr", icon: Database },
  { label: "Pharmacy", href: "/interactions", icon: Pill },
  { label: "AI Analysis", href: "/genex360", icon: Brain },
  { label: "Settings", href: "/settings", icon: Settings },
] as const

const MOBILE_TABS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Records", href: "/ehr", icon: Database },
  { label: "Tasks", href: "/protocols", icon: ClipboardList },
  { label: "AI", href: "/genex360", icon: Brain },
  { label: "More", href: "/settings", icon: MoreHorizontal },
] as const

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/protocols": "Protocols",
  "/interactions": "Pharmacy",
  "/analytics": "Analytics",
  "/genex360": "AI Analysis",
  "/ehr": "Records",
  "/cme": "Compliance",
  "/settings": "Settings",
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-[#0c1322] pt-20 z-30">
      {/* Practitioner Info */}
      <div className="px-6 mb-8 flex flex-col items-start">
        <h2 className="text-[#6bfb9a] font-bold font-mono text-sm uppercase tracking-wider mb-1">
          Dr. Julian Vane
        </h2>
        <p className="text-[#dce2f7]/60 text-xs font-mono uppercase">Chief Surgeon</p>
        <div className="mt-4 px-2 py-1 bg-[#6bfb9a]/10 rounded-lg">
          <span className="text-[10px] text-[#6bfb9a] font-bold tracking-widest uppercase">
            Nexus-Alpha
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-6 py-3 transition-all duration-300 ease-in-out ${
                isActive
                  ? "bg-[#141b2b] text-[#6bfb9a] border-l-4 border-[#4ade80]"
                  : "text-[#dce2f7]/60 hover:bg-[#232a3a] hover:text-[#dce2f7]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-mono text-sm uppercase tracking-wider">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

// ─── Top Bar ────────────────────────────────────────────────────────────────

function TopBar() {
  const pathname = usePathname()

  const currentPage = React.useMemo(() => {
    const match = Object.entries(PAGE_TITLES).find(
      ([path]) => pathname === path || pathname.startsWith(path + "/")
    )
    return match ? match[1] : "Dashboard"
  }, [pathname])

  return (
    <header className="fixed top-0 w-full z-50 bg-[#0c1322]/40 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-between px-6 h-16">
      {/* Left: Logo + Breadcrumbs */}
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-[#6bfb9a]" />
          <span className="text-xl font-black text-[#6bfb9a] tracking-tighter uppercase">
            ViaConnect
          </span>
        </Link>

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-2 text-sm text-[#dce2f7]/50">
          <span>Nexus</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#6bfb9a]">{currentPage}</span>
        </nav>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-xl px-8 hidden md:block">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#dce2f7]/40 group-focus-within:text-[#6bfb9a] transition-colors" />
          </div>
          <input
            className="w-full bg-[#2e3545] border-none rounded-xl py-2 pl-10 pr-16 text-sm text-[#dce2f7] placeholder:text-[#dce2f7]/40 focus:ring-1 focus:ring-[#6bfb9a]/40 focus:bg-[#232a3a] focus:outline-none transition-all"
            placeholder="Search clinical records..."
            type="text"
          />
          <div className="absolute inset-y-0 right-3 flex items-center">
            <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0c1322]/50 border border-[#3d4a3e]/20 text-[10px] text-[#dce2f7]/40 font-mono">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Notifications + Avatar */}
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-[#232a3a] transition-colors relative">
          <Bell className="h-5 w-5 text-[#dce2f7]/70" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#6bfb9a] rounded-full shadow-[0_0_15px_rgba(107,251,154,0.2)]" />
        </button>
        <div className="h-8 w-8 rounded-full overflow-hidden border border-[#6bfb9a]/20 bg-[#232a3a] flex items-center justify-center text-[10px] font-bold text-[#6bfb9a]">
          JV
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
    { label: "New Protocol", icon: FlaskConical, href: "/protocols/builder" },
    { label: "Quick Check", icon: Zap, href: "/interactions" },
  ]

  return (
    <div
      className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 z-50 flex flex-col items-end gap-3"
      ref={fabRef}
    >
      {/* Expanded Menu */}
      {open && (
        <div className="flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="bg-[#232a3a]/80 backdrop-blur-[20px] px-4 py-2 rounded-full border border-[#3d4a3e]/20 text-xs font-bold uppercase tracking-wider text-[#dce2f7] hover:bg-[#6bfb9a] hover:text-[#0c1322] transition-all flex items-center gap-2 shadow-2xl"
              >
                {item.label}
                <Icon className="h-4 w-4" />
              </Link>
            )
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`h-16 w-16 rounded-full flex items-center justify-center transition-all active:scale-90 active:duration-200 ${
          open
            ? "bg-[#232a3a] border border-[#3d4a3e]/20 text-[#6bfb9a]"
            : "bg-[#6bfb9a] text-[#0c1322] shadow-[0_0_30px_rgba(107,251,154,0.4)]"
        }`}
        aria-label={open ? "Close menu" : "Quick actions"}
      >
        {open ? <X className="h-7 w-7" /> : <Plus className="h-7 w-7 stroke-[3]" />}
      </button>
    </div>
  )
}

// ─── Mobile Bottom Nav ──────────────────────────────────────────────────────

function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-[#0c1322]/60 backdrop-blur-2xl border-t border-[#3d4a3e]/15 flex justify-around items-center px-4 pb-6 pt-3 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      {MOBILE_TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center active:scale-90 transition-transform ${
              isActive
                ? "bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-xl px-3 py-1"
                : "text-[#dce2f7]/50 hover:text-[#6bfb9a]"
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

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-[#0c1322] text-[#dce2f7] selection:bg-[#6bfb9a]/30">
        <TopBar />
        <Sidebar />

        {/* Main Content */}
        <main className="lg:ml-64 pt-20 pb-24 md:pb-8 px-6 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <FAB />
        <MobileBottomNav />
      </div>
    </SidebarContext.Provider>
  )
}
