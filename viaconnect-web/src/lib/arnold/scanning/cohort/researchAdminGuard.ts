// Prompt 211b Workstream 1B -- research-admin auth gate for the cohort
// collection / labeling / validation-run API routes.
//
// Mirrors requireAdmin() in src/lib/flags/admin-guard.ts, but narrows the
// allowed roles to RESEARCH_ADMIN_ROLES, which mirrors the is_research_admin()
// Postgres function added by the (merge-deferred) 211b cohort ground-truth
// migration: role IN ('admin', 'superadmin', 'researcher').
//
// This is a standalone guard rather than an extension of admin-guard.ts
// because 'researcher' is not part of the general ADMIN_ROLES allowlist used
// by every other admin surface in the app; the cohort research tooling is the
// first consumer of that role. Keeping it standalone avoids widening the
// blast radius of the shared admin-guard.ts file for an unrelated surface.
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface ResearchAdminUser {
  id: string;
  role: string;
}

export type ResearchAdminCheckResult =
  | { kind: 'ok'; user: ResearchAdminUser }
  | { kind: 'error'; response: NextResponse };

/** Mirrors is_research_admin() in 20260712110000_prompt_211b_cohort_ground_truth.sql. */
export const RESEARCH_ADMIN_ROLES: ReadonlySet<string> = new Set([
  'admin', 'superadmin', 'researcher',
]);

/**
 * Authenticates the caller and requires a role in RESEARCH_ADMIN_ROLES.
 * Returns { kind: 'error', response } (401 unauthenticated, 403 wrong role)
 * for the caller to short-circuit the handler, or { kind: 'ok', user }.
 *
 * All cohort collection / labeling / validation-run routes call this first,
 * before any database access, so an unauthorized caller never reaches the
 * admin (service-role) client.
 */
export async function requireResearchAdmin(): Promise<ResearchAdminCheckResult> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return {
      kind: 'error',
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile as { role: string | null } | null)?.role;
  if (!role || !RESEARCH_ADMIN_ROLES.has(role)) {
    return {
      kind: 'error',
      response: NextResponse.json(
        { error: 'Forbidden: cohort research tooling requires admin, superadmin, or researcher role.' },
        { status: 403 },
      ),
    };
  }

  return { kind: 'ok', user: { id: user.id, role } };
}
