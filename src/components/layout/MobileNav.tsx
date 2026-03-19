"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, Brain, MoreHorizontal } from "lucide-react";

const tabs = [
  { label: "Dashboard", href: "/naturopath", icon: LayoutDashboard },
  { label: "Patients", href: "/naturopath/patients", icon: Users },
  { label: "Protocols", href: "/naturopath/protocols", icon: ClipboardList },
  { label: "AI", href: "/naturopath/ai", icon: Brain },
  { label: "More", href: "/naturopath/settings", icon: MoreHorizontal },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-green-400/10 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active =
            tab.href === "/naturopath"
              ? pathname === "/naturopath"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 transition-all duration-200 ${
                active ? "text-green-400" : "text-white/40"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
