// Prompt #122 P8: Revoke an auditor grant.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!COMPLIANCE_ROLES.has(role)) {
    return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { error } = await sb
    .from('soc2_auditor_grants')
    .update({ revoked: true, revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq('id', params.id)
    .eq('revoked', false); // idempotent no-op if already revoked
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[soc2 auditor-grants revoke] update failed', { id: params.id, message: error.message });
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
