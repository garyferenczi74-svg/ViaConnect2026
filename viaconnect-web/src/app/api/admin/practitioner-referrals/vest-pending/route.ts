// Prompt #98 Phase 4: Admin manual vesting trigger.
//
// POST /api/admin/practitioner-referrals/vest-pending
// Runs the same orchestrator the daily Edge Function uses; useful for
// testing or out-of-cycle vesting after admin clears a fraud flag.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processPendingVesting } from '@/lib/practitioner-referral/vesting-orchestrator';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'api.admin.practitioner-referrals.vest-pending.auth',
    );
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const { data: profile } = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.admin.practitioner-referrals.vest-pending.profile',
    );
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
      const summary = await processPendingVesting(new Date(), { supabase });
      return NextResponse.json({ ok: true, summary });
    } catch (e) {
      safeLog.error('api.admin.practitioner-referrals.vest-pending', 'vesting orchestrator failed', { error: e });
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.practitioner-referrals.vest-pending', 'request timed out', { error: err });
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    safeLog.error('api.admin.practitioner-referrals.vest-pending', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
