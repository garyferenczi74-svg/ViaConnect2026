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

export function requireAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
}
