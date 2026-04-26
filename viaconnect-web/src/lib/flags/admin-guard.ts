// Prompt #93 Phase 4: admin guard used by every admin flag endpoint.
// Returns the authenticated admin user or a NextResponse to short-circuit
// the handler with 401/403. Keeps the role check consistent across routes.
//
// Prompt #138a Phase 5a: allowlist expanded to include marketing_admin,
// superadmin, and compliance_admin so the marketing-copy admin pages and
// the variant-lifecycle API routes (Phase 3) admit Steve and Marketing
// without falling back to admin/founder roles. The expansion is additive:
// admin/founder/staff continue to pass exactly as before.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AdminUser {
  id: string;
  role: string;
}

export type AdminCheckResult =
  | { kind: 'ok'; user: AdminUser }
  | { kind: 'error'; response: NextResponse };

const ADMIN_ROLES: ReadonlySet<string> = new Set([
  'admin', 'founder', 'staff',
  'marketing_admin', 'superadmin', 'compliance_admin',
]);

/**
 * Prompt #138a Phase 5b: subset of ADMIN_ROLES that the marketing API
 * routes accept. Matches the Phase 2 RLS policy variants_admin_rw exactly
 * so a successful requireMarketingAdmin() call is guaranteed to write
 * cleanly through RLS, instead of the silent 0-row update staff and
 * founder users would have hit before.
 */
export const MARKETING_WRITE_ROLES: ReadonlySet<string> = new Set([
  'admin', 'superadmin', 'compliance_admin', 'marketing_admin',
]);

export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return { kind: 'error', response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as { role: string | null } | null)?.role;
  if (!role || !ADMIN_ROLES.has(role)) {
    return { kind: 'error', response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { kind: 'ok', user: { id: user.id, role } };
}

/**
 * Marketing-surface admin gate. Calls requireAdmin first (so unauthenticated
 * requests still 401), then narrows to MARKETING_WRITE_ROLES. staff and
 * founder users get a clean 403 with a meaningful error message instead of
 * the silent RLS no-op they would have hit before Phase 5b.
 */
export async function requireMarketingAdmin(): Promise<AdminCheckResult> {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth;
  if (!MARKETING_WRITE_ROLES.has(auth.user.role)) {
    return {
      kind: 'error',
      response: NextResponse.json(
        { error: 'Forbidden: marketing surfaces require admin, superadmin, compliance_admin, or marketing_admin role.' },
        { status: 403 },
      ),
    };
  }
  return auth;
}

export function requireAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
}

export function requireMarketingWriteRole(role: string | null | undefined): boolean {
  return !!role && MARKETING_WRITE_ROLES.has(role);
}
