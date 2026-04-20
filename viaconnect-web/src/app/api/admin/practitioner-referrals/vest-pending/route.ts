// Prompt #98 Phase 4: Admin manual vesting trigger.
//
// POST /api/admin/practitioner-referrals/vest-pending
// Runs the same orchestrator the daily Edge Function uses; useful for
// testing or out-of-cycle vesting after admin clears a fraud flag.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processPendingVesting } from '@/lib/practitioner-referral/vesting-orchestrator';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const summary = await processPendingVesting(new Date(), { supabase });
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
