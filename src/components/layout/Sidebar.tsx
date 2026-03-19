"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Leaf,
  LayoutDashboard,
  Users,
  ClipboardList,
  TrendingUp,
  Brain,
  TestTube,
  Shield,
  Settings,
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";

const navItems = [
  { label: "Dashboard", href: "/naturopath", icon: LayoutDashboard },
  { label: "Patients", href: "/naturopath/patients", icon: Users },
  { label: "Protocols", href: "/naturopath/protocols", icon: ClipboardList },
  { label: "Formulary", href: "/naturopath/formulary", icon: Leaf },
  { label: "Outcomes", href: "/naturopath/outcomes", icon: TrendingUp },
  { label: "AI Engine", href: "/naturopath/ai", icon: Brain },
  { label: "Labs/EHR", href: "/naturopath/labs", icon: TestTube },
  { label: "Compliance", href: "/naturopath/compliance", icon: Shield },
  { label: "Settings", href: "/naturopath/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  const isActive = (href: string) =>
    href === "/naturopath"
      ? pathname === "/naturopath"
      : pathname.startsWith(href);

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-gray-900 border-r border-green-400/10 z-50 transition-all duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2 px-4 pt-6 pb-2 ${
          collapsed ? "justify-center px-0" : ""
        }`}
      >
        <Leaf className="w-6 h-6 text-green-400 shrink-0" />
        {!collapsed && (
          <span className="text-green-400 font-bold text-xl">ViaConnect</span>
        )}
      </div>
      {!collapsed && (
        <span className="text-xs text-white/40 px-4 pb-4">
          Naturopath Portal
        </span>
      )}
      {collapsed && <div className="pb-4" />}

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg transition-all duration-150 ease-in-out ${
                collapsed
                  ? "justify-center px-0 py-2.5"
                  : "pl-4 pr-3 py-2.5"
              } ${
                active
                  ? "bg-green-400/10 text-green-400 border-l-2 border-green-400"
                  : "text-white/60 hover:text-white hover:bg-gray-800/50 border-l-2 border-transparent"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Practitioner Card */}
      <div
        className={`mt-auto border-t border-green-400/10 p-3 ${
          collapsed ? "flex justify-center" : ""
        }`}
      >
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center shrink-0">
            <span className="text-green-400 text-sm font-bold">SC</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Dr. Sarah Chen
              </p>
              <span className="bg-green-400/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                ND
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
