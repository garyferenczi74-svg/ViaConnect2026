// Prompt #98 Phase 4: Admin manual milestone backfill trigger.
//
// POST /api/admin/practitioner-referrals/check-milestones/[practitionerId]
// Useful for ops scenarios:
//   - data fix where a milestone was not auto-detected
//   - testing the detection orchestrator outside the daily cron

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scanAndRecordMilestonesForPractitioner } from '@/lib/practitioner-referral/milestone-orchestrator';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: { practitionerId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const results = await scanAndRecordMilestonesForPractitioner(params.practitionerId, { supabase });
    return NextResponse.json({ practitioner_id: params.practitionerId, results });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
