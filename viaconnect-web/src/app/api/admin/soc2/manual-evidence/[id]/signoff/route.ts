// Prompt #122 P6: Mark manual evidence as signed off by the current user.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.soc2.manual-evidence.signoff.auth');
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const profileRes = await withTimeout(
      (async () => supabase.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.soc2.manual-evidence.signoff.load-profile',
    );
    const role = (profileRes.data as { role?: string } | null)?.role ?? '';
    if (!COMPLIANCE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await withTimeout(
      (async () => sb
        .from('soc2_manual_evidence')
        .update({ signoff_by: user.id, signoff_at: new Date().toISOString() })
        .eq('id', params.id))(),
      8000,
      'api.soc2.manual-evidence.signoff.update',
    );
    if (error) {
      safeLog.error('api.soc2.manual-evidence.signoff', 'update failed', { id: params.id, message: error.message });
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.soc2.manual-evidence.signoff', 'database timeout', { id: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.soc2.manual-evidence.signoff', 'unexpected error', { id: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
