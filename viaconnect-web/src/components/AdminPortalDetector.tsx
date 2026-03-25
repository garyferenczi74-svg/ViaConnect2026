"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

const PORTALS = [
  { key: "consumer", label: "Consumer", href: "/dashboard" },
  { key: "practitioner", label: "Practitioner", href: "/practitioner/dashboard" },
  { key: "naturopath", label: "Naturopath", href: "/naturopath/dashboard" },
  { key: "admin", label: "Admin", href: "/admin" },
] as const;

export function AdminPortalDetector({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Detect which portal the admin is currently viewing
  let activeRole: string = "consumer";
  if (pathname.startsWith("/practitioner")) activeRole = "practitioner";
  else if (pathname.startsWith("/naturopath")) activeRole = "naturopath";
  else if (pathname.startsWith("/admin")) activeRole = "admin";

  // Admin portal uses consumer shell (no sidebar needed — full-width dashboard)
  const shellRole = activeRole === "admin" ? "consumer" : activeRole;

  return (
    <AppShell user={user} role={shellRole}>
      {/* Admin Portal Switcher */}
      <div className="sticky top-0 z-40 flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-copper/10 to-transparent border-b border-copper/20">
        <span className="text-[10px] text-copper font-semibold uppercase tracking-wider mr-2">
          Admin
        </span>
        {PORTALS.map((p) => (
          <Link
            key={p.key}
            href={p.href}
            className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
              activeRole === p.key
                ? "bg-copper/20 text-copper font-medium"
                : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>
      {children}
    </AppShell>
  );
}
