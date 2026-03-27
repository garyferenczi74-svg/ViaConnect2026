"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

const PORTALS = [
  { key: "consumer", label: "Personal Wellness", href: "/dashboard", color: "bg-teal/20 text-teal" },
  { key: "practitioner", label: "Practitioner", href: "/practitioner/dashboard", color: "bg-portal-green/20 text-portal-green" },
  { key: "naturopath", label: "Naturopath", href: "/naturopath/dashboard", color: "bg-sage/20 text-sage" },
  { key: "admin", label: "Admin", href: "/admin", color: "bg-copper/20 text-copper" },
] as const;

export function AdminPortalDetector({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Detect which portal the admin is currently viewing based on URL
  let activePortal: string = "consumer";
  if (pathname.startsWith("/practitioner")) activePortal = "practitioner";
  else if (pathname.startsWith("/naturopath")) activePortal = "naturopath";
  else if (pathname.startsWith("/admin")) activePortal = "admin";

  // Pass the detected portal role to AppShell so sidebar switches per portal
  return (
    <AppShell user={user} role={activePortal}>
      {/* Admin Portal Switcher Tabs */}
      <div className="sticky top-0 z-40 flex items-center gap-1.5 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-b border-copper/20">
        {PORTALS.map((p) => {
          const isActive = activePortal === p.key;
          return (
            <Link
              key={p.key}
              href={p.href}
              className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-all ${
                isActive
                  ? p.color
                  : "text-gray-500 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      {children}
    </AppShell>
  );
}
