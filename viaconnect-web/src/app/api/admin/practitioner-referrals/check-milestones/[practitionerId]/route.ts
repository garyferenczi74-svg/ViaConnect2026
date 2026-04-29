// Prompt #98 Phase 4: Admin manual milestone backfill trigger.
//
// POST /api/admin/practitioner-referrals/check-milestones/[practitionerId]
// Useful for ops scenarios:
//   - data fix where a milestone was not auto-detected
//   - testing the detection orchestrator outside the daily cron

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scanAndRecordMilestonesForPractitioner } from '@/lib/practitioner-referral/milestone-orchestrator';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: { practitionerId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'api.admin.practitioner-referrals.check-milestones.auth',
    );
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const { data: profile } = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.admin.practitioner-referrals.check-milestones.profile',
    );
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
      const results = await scanAndRecordMilestonesForPractitioner(params.practitionerId, { supabase });
      return NextResponse.json({ practitioner_id: params.practitionerId, results });
    } catch (e) {
      safeLog.error(
        'api.admin.practitioner-referrals.check-milestones',
        'milestone scan failed',
        { error: e, practitionerId: params.practitionerId },
      );
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.practitioner-referrals.check-milestones', 'request timed out', { error: err });
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    safeLog.error('api.admin.practitioner-referrals.check-milestones', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
