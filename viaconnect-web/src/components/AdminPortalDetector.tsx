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
      {/* 1. Portal Switcher Tabs (Prompt 167: glass on mobile, scrolls away
            with the page. Desktop solid #0D1520 + copper border preserved). */}
      <nav
        data-prompt-167="portal-tabs"
        aria-label="Portal navigation"
        className="relative z-30 flex items-center gap-1.5 px-4 py-2 bg-[#1E3054]/45 backdrop-blur-md border-b border-white/5 md:bg-[#0D1520] md:backdrop-blur-none md:border-copper/20 overflow-x-auto"
      >
        {portals.map((p) => {
          const isActive = activePortal === p.key;
          return (
            <Link
              key={p.key}
              href={p.href}
              className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? p.color
                  : "text-white hover:bg-[#1A2744]/80"
              }`}
            >
              {p.key === "hounddog" && (
                <Target className="w-3 h-3 shrink-0" strokeWidth={1.5} />
              )}
              {p.label}
            </Link>
          );
        })}
      </nav>

      {/* 2. Mobile Nav Bar (Prompt 167: sticky under the brand header on
            mobile, glass background, decoupled from portal tabs above). */}
      <MobileNavBar role={activePortal} />

      {/* 3. Page content with padding */}
      <div className="p-4 lg:p-6">
        {children}
      </div>
    </AppShell>
  );
}
