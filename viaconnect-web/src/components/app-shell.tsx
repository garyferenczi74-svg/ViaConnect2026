"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  Dna,
  FlaskConical,
  Coins,
  UserCircle,
  MessageSquare,
  Users,
  ClipboardList,
  BarChart3,
  Search,
  Zap,
  Brain,
  Settings,
  Leaf,
  Calendar,
  Shield,
  Compass,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };

const CONSUMER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/genetics", label: "Genetics", icon: Dna },
  { href: "/supplements", label: "Supplements", icon: FlaskConical },
  { href: "/tokens", label: "ViaTokens", icon: Coins },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

const PRACTITIONER_NAV: NavItem[] = [
  { href: "/practitioner/dashboard", label: "Dashboard", icon: Home },
  { href: "/practitioner/patients", label: "Patients", icon: Users },
  { href: "/practitioner/protocols", label: "Protocols", icon: ClipboardList },
  { href: "/practitioner/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/practitioner/genomics", label: "Genomics", icon: Dna },
  { href: "/practitioner/interactions", label: "Interactions", icon: Zap },
  { href: "/practitioner/ehr", label: "EHR Hub", icon: Search },
  { href: "/practitioner/ai", label: "AI Advisor", icon: Brain },
  { href: "/practitioner/settings", label: "Settings", icon: Settings },
];

const NATUROPATH_NAV: NavItem[] = [
  { href: "/naturopath/dashboard", label: "Dashboard", icon: Home },
  { href: "/naturopath/patients", label: "Patients", icon: Users },
  { href: "/naturopath/botanical", label: "Botanical", icon: Leaf },
  { href: "/naturopath/constitutional", label: "Constitutional", icon: Compass },
  { href: "/naturopath/protocols", label: "Protocols", icon: ClipboardList },
  { href: "/naturopath/scheduler", label: "Scheduler", icon: Calendar },
  { href: "/naturopath/compliance", label: "Compliance", icon: Shield },
  { href: "/naturopath/settings", label: "Settings", icon: Settings },
];

function getNav(role: string): NavItem[] {
  switch (role) {
    case "practitioner":
      return PRACTITIONER_NAV;
    case "naturopath":
      return NATUROPATH_NAV;
    default:
      return CONSUMER_NAV;
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case "practitioner":
      return { label: "PRO", color: "bg-portal-green/20 text-portal-green" };
    case "naturopath":
      return { label: "NATURO", color: "bg-sage/20 text-sage" };
    default:
      return null;
  }
}

export function AppShell({
  user,
  role,
  children,
}: {
  user: User;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNav(role);
  const badge = getRoleBadge(role);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-dark-card border-r border-dark-border transition-all duration-200
          ${collapsed ? "w-16" : "w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-1">
              <span className="text-lg font-bold text-copper">Via</span>
              <span className="text-lg font-bold text-white">Connect</span>
              {badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${badge.color}`}>
                  {badge.label}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              setMobileOpen(false);
            }}
            className="text-gray-400 hover:text-white transition-colors hidden lg:block"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${isActive ? "bg-copper/10 text-copper" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-dark-border p-3">
          {!collapsed && (
            <p className="text-xs text-gray-400 truncate mb-2">
              {user.user_metadata?.full_name ?? user.email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${collapsed ? "lg:ml-16" : "lg:ml-60"}`}>
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-dark-bg/80 backdrop-blur-sm border-b border-dark-border flex items-center px-4 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-400 hover:text-white lg:hidden mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-500 hidden sm:block">
            {user.user_metadata?.full_name ?? user.email}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
