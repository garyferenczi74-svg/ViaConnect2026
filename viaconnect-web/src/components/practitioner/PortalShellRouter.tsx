'use client';

// Revised Prompt #91 Path C: portal shell selector.
// Wraps (app)/layout.tsx children so practitioner routes get the new
// PractitionerPortalShell (tab nav + tab-aware sidebar) while every other
// route continues to render through the shared AppShell + MobileNavWrapper
// chain. Admin users on practitioner routes also get the practitioner shell
// (admin can act in any portal).
//
// Why a client wrapper: usePathname is a client API. The (app) layout
// itself stays server-rendered (auth + role normalization); this client
// wrapper picks the right shell at the boundary.

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { AppShell } from '@/components/app-shell';
import { MobileNavWrapper } from '@/components/MobileNavWrapper';
import {
  PractitionerPortalShell,
  type PractitionerShellProfile,
} from './PractitionerPortalShell';

interface Props {
  user: User;
  role: string;
  practitionerProfile: PractitionerShellProfile | null;
  showNaturopathTab: boolean;
  children: ReactNode;
}

export function PortalShellRouter({
  user, role, practitionerProfile, showNaturopathTab, children,
}: Props) {
  const pathname = usePathname();

  // Practitioner-portal routes ONLY (note trailing slash discipline:
  // /practitioners is the public marketing landing, not the portal)
  const isPractitionerRoute =
    pathname === '/practitioner' || pathname.startsWith('/practitioner/');

  if (isPractitionerRoute && practitionerProfile) {
    return (
      <PractitionerPortalShell
        practitioner={practitionerProfile}
        showNaturopathTab={showNaturopathTab}
      >
        {children}
      </PractitionerPortalShell>
    );
  }

  // Default: existing shared AppShell + MobileNavWrapper (consumer,
  // naturopath, admin non-practitioner routes).
  return (
    <AppShell user={user} role={role}>
      <MobileNavWrapper role={role}>
        {children}
      </MobileNavWrapper>
    </AppShell>
  );
}
