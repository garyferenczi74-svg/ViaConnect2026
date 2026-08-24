"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MobileNavBar } from "@/components/layout/MobileNavBar";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Target } from "lucide-react";
import {
  activePortalForSession,
  portalsForRole,
  roleChipLabel,
  shellRoleForSession,
  type SessionRole,
} from "@/lib/auth/session-role";

export function AdminPortalDetector({
  user,
  sessionRole,
  children,
}: {
  user: User;
  sessionRole: SessionRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const portals = portalsForRole(sessionRole);
  const activePortal = activePortalForSession(sessionRole, pathname);
  const shellRole = shellRoleForSession(sessionRole, pathname);
  const chipLabel = roleChipLabel(sessionRole);

  return (
    <AppShell user={user} role={shellRole}>
      <nav
        data-prompt-167="portal-tabs"
        data-session-role={sessionRole}
        aria-label="Portal navigation"
        className="relative z-30 flex items-center gap-1.5 px-4 py-2 bg-[#1E3054]/45 backdrop-blur-md border-b border-white/5 md:bg-[#0D1520] md:backdrop-blur-none md:border-copper/20 overflow-x-auto"
      >
        <span
          data-testid="session-role-chip"
          className="text-[11px] px-3 py-1.5 min-h-[44px] md:min-h-0 inline-flex items-center rounded-full font-medium whitespace-nowrap bg-white/10 text-white/80 mr-1"
        >
          {chipLabel}
        </span>
        {portals.map((p) => {
          const isActive = activePortal === p.key;
          return (
            <Link
              key={p.key}
              href={p.href}
              className={`text-[11px] px-3 py-1.5 min-h-[44px] md:min-h-0 inline-flex items-center rounded-full font-medium transition-all whitespace-nowrap gap-1 ${
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

      <MobileNavBar role={shellRole === "admin" && activePortal === "hounddog" ? "admin" : shellRole} />

      <div className="p-4 lg:p-6">
        {children}
      </div>
    </AppShell>
  );
}
