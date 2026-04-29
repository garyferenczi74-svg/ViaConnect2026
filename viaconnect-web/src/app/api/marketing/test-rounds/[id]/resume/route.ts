// Prompt #138a Phase 3 — resume a paused test round.
//
// POST /api/marketing/test-rounds/[id]/resume
//
// Resumes by stamping resumed_at; visitors return to variant rotation.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireMarketingAdmin } from '@/lib/flags/admin-guard';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireMarketingAdmin();
    if (auth.kind === 'error') return auth.response;

    const supabase = createClient();
    const { data: round } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('marketing_copy_test_rounds')
        .select('id, paused_at, ended_at')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.marketing.test-rounds.resume.read',
    );
    if (!round) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (round.ended_at) return NextResponse.json({ error: 'Round already ended' }, { status: 409 });
    if (!round.paused_at) return NextResponse.json({ error: 'Round is not paused' }, { status: 409 });

    const { error } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('marketing_copy_test_rounds')
        .update({ resumed_at: new Date().toISOString(), paused_at: null })
        .eq('id', params.id))(),
      8000,
      'api.marketing.test-rounds.resume.update',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marketing.test-rounds.resume', 'timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.marketing.test-rounds.resume', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
