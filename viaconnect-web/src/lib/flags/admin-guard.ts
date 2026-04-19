// Prompt #93 Phase 4: admin guard used by every admin flag endpoint.
// Returns the authenticated admin user or a NextResponse to short-circuit
// the handler with 401/403. Keeps the role check consistent across routes.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AdminUser {
  id: string;
  role: string;
}

export type AdminCheckResult =
  | { kind: 'ok'; user: AdminUser }
  | { kind: 'error'; response: NextResponse };

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
  if (role !== 'admin' && role !== 'founder' && role !== 'staff') {
    return { kind: 'error', response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { kind: 'ok', user: { id: user.id, role } };
}

export function requireAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'founder' || role === 'staff';
}
