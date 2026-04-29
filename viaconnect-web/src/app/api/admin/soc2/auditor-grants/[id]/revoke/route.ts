// Prompt #122 P8: Revoke an auditor grant.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.soc2.auditor-grants.revoke.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const profileRes = await withTimeout(
      (async () => supabase.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.soc2.auditor-grants.revoke.load-profile',
    );
    const role = (profileRes.data as { role?: string } | null)?.role ?? '';
    if (!COMPLIANCE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await withTimeout(
      (async () => sb
        .from('soc2_auditor_grants')
        .update({ revoked: true, revoked_at: new Date().toISOString(), revoked_by: user.id })
        .eq('id', params.id)
        .eq('revoked', false))(), // idempotent no-op if already revoked
      8000,
      'api.soc2.auditor-grants.revoke.update',
    );
    if (error) {
      safeLog.error('api.soc2.auditor-grants.revoke', 'update failed', { id: params.id, message: error.message });
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.soc2.auditor-grants.revoke', 'database timeout', { id: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.soc2.auditor-grants.revoke', 'unexpected error', { id: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
