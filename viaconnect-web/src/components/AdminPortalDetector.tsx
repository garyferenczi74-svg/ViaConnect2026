"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { MobileNavBar } from "@/components/layout/MobileNavBar";
import { useAuthStore } from "@/lib/store/auth-store";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Target } from "lucide-react";

const BASE_PORTALS = [
  { key: "consumer", label: "Personal Wellness", href: "/dashboard", color: "bg-teal/20 text-teal" },
  { key: "practitioner", label: "Practitioner", href: "/practitioner/dashboard", color: "bg-portal-green/20 text-portal-green" },
  { key: "naturopath", label: "Naturopath", href: "/naturopath/dashboard", color: "bg-sage/20 text-sage" },
  { key: "admin", label: "Admin", href: "/admin", color: "bg-copper/20 text-copper" },
] as const;

const HOUNDDOG_PORTAL = {
  key: "hounddog" as const,
  label: "Hounddog",
  href: "/admin/hounddog",
  color: "bg-copper/20 text-[#B75E18]",
};

export function AdminPortalDetector({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isHounddogUser = user.email === "gary@farmceuticawellness.com";

  const portals = useMemo(() => {
    if (isHounddogUser) {
      return [...BASE_PORTALS, HOUNDDOG_PORTAL];
    }
    return [...BASE_PORTALS];
  }, [isHounddogUser]);

  let activePortal: string = "consumer";
  if (pathname.startsWith("/admin/hounddog")) activePortal = "hounddog";
  else if (pathname.startsWith("/practitioner")) activePortal = "practitioner";
  else if (pathname.startsWith("/naturopath")) activePortal = "naturopath";
  else if (pathname.startsWith("/admin")) activePortal = "admin";

  return (
    <AppShell user={user} role={activePortal === "hounddog" ? "admin" : activePortal}>
      {/* 1. Portal Switcher Tabs */}
      <div className="relative z-20 flex items-center gap-1.5 px-4 py-2 bg-[#0D1520] border-b border-copper/20 overflow-x-auto">
        {portals.map((p) => {
          const isActive = activePortal === p.key;
          return (
            <Link
              key={p.key}
              href={p.href}
              className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? p.color
                  : "text-gray-500 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {p.key === "hounddog" && (
                <Target className="w-3 h-3 shrink-0" strokeWidth={1.5} />
              )}
              {p.label}
            </Link>
          );
        })}
      </div>

      {/* 2. Mobile Nav Bar — between portal tabs and page content */}
      <MobileNavBar role={activePortal} />

      {/* 3. Page content with padding */}
      <div className="p-4 lg:p-6">
        {children}
      </div>
    </AppShell>
  );
}
