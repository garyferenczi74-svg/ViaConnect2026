// Prompt 172 Phase 0 (170c primitive): GET /api/safety-mode/status.
//
// 170c §16.2 endpoint contract: returns { enabled: boolean } for the calling
// user. Reads from public.user_safety_preferences (Phase 0 migration). RLS
// scopes reads to the calling user_id, so a cross user lookup is server side
// impossible regardless of bug in this route.
//
// Posture per 170c §8.4 silent UX:
//   - Unauthenticated: enabled false with 200. No 401 (a 401 from this
//     specific endpoint would leak whether the auth boundary cares).
//   - Authenticated with no row: enabled false (never opted in).
//   - Authenticated with row: enabled is the ed_safety_mode_enabled column.
//   - Database error: enabled false (fail closed per §23.1).
//   - Master kill switch off: enabled false regardless of stored value.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // 170c §8.13 master kill switch. When off, short circuit before even
  // consulting Supabase. New opt ins are blocked at the UI; existing rows
  // are honored by the dedicated POST endpoints when they land. The status
  // endpoint returns the runtime answer the UI should render against, and
  // when the master is off that answer is always false.
  if (!isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')) {
    return NextResponse.json({ enabled: false });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ enabled: false });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_safety_preferences')
    .select('ed_safety_mode_enabled')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ enabled: false });
  }

  const enabled = Boolean(data?.ed_safety_mode_enabled);
  return NextResponse.json({ enabled });
}
