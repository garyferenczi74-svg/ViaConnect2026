"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MobileNavBar } from "@/components/layout/MobileNavBar";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Target } from "lucide-react";
import {
  portalKeyFromPath,
  portalsForRole,
  roleChipLabel,
  shellRoleForActivePortal,
  type PortalKey,
  type SessionRole,
} from "@/lib/auth/session-role";

const REMEMBERED_PORTAL_KEY = "viaconnect-admin-active-portal";

function isPortalKey(value: string | null): value is PortalKey {
  return (
    value === "consumer" ||
    value === "practitioner" ||
    value === "naturopath" ||
    value === "admin" ||
    value === "hounddog"
  );
}

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
  const allowed = new Set(portals.map((p) => p.key));
  const fromUrl = portalKeyFromPath(pathname);
  const [remembered, setRemembered] = useState<PortalKey | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(REMEMBERED_PORTAL_KEY);
      if (isPortalKey(stored) && allowed.has(stored)) {
        setRemembered(stored);
      }
    } catch {
      // sessionStorage can throw in locked-down browsers
    }
    // allowed is derived from the session role, which does not change here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionRole]);

  useEffect(() => {
    if (!fromUrl || !allowed.has(fromUrl)) return;
    try {
      sessionStorage.setItem(REMEMBERED_PORTAL_KEY, fromUrl);
    } catch {
      // ignore
    }
    setRemembered(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl]);

  const activePortal: PortalKey =
    (fromUrl && allowed.has(fromUrl) && fromUrl) ||
    (remembered && allowed.has(remembered) && remembered) ||
    (sessionRole === "admin" ? "admin" : sessionRole);

  const shellRole = shellRoleForActivePortal(sessionRole, activePortal);
  const chipLabel = roleChipLabel(sessionRole);

  return (
    <AppShell user={user} role={shellRole}>
      <nav
        data-prompt-167="portal-tabs"
        data-session-role={sessionRole}
        aria-label={`Portal navigation (${chipLabel} session)`}
        className="relative z-30 flex items-center gap-1.5 px-4 py-2 bg-[#1E3054]/45 backdrop-blur-md border-b border-white/5 md:bg-[#0D1520] md:backdrop-blur-none md:border-copper/20 overflow-x-auto"
      >
        {portals.map((p) => {
          const isActive = activePortal === p.key;
          return (
            <Link
              key={p.key}
              href={p.href}
              onClick={() => {
                try {
                  sessionStorage.setItem(REMEMBERED_PORTAL_KEY, p.key);
                } catch {
                  // ignore
                }
                setRemembered(p.key);
              }}
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

      <MobileNavBar role={shellRole} />

      <div className="p-4 lg:p-6">{children}</div>
    </AppShell>
  );
}
