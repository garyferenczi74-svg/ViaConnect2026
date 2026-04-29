// Prompt #138a Phase 3 — close a round and promote the winning variant.
//
// POST /api/marketing/test-rounds/[id]/promote-winner
// Body: { winner_slot_id: string, ended_reason: 'winner_promoted' | 'no_winner_archived' | 'manual_terminated' | 'superseded' }
//
// Records the closure timestamp + reason. Does NOT auto-archive losing
// variants — that is done explicitly via /variants/[id]/archive so the
// audit log captures each archival action separately.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireMarketingAdmin } from '@/lib/flags/admin-guard';
import type { TestRoundEndedReason } from '@/lib/marketing/variants/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const VALID_REASONS: TestRoundEndedReason[] = [
  'winner_promoted', 'no_winner_archived', 'manual_terminated', 'superseded',
];

const STEVE_LEVEL_ROLES = new Set(['compliance_admin', 'superadmin', 'admin', 'founder']);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireMarketingAdmin();
    if (auth.kind === 'error') return auth.response;
    if (!STEVE_LEVEL_ROLES.has(auth.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: winner promotion requires compliance_admin or superadmin per #138a §6.4 condition 5.' },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      winner_slot_id?: string;
      ended_reason?: string;
    } | null;
    if (!body?.ended_reason || !VALID_REASONS.includes(body.ended_reason as TestRoundEndedReason)) {
      return NextResponse.json({ error: 'ended_reason is required and must be a valid value' }, { status: 400 });
    }
    if (body.ended_reason === 'winner_promoted' && !body.winner_slot_id) {
      return NextResponse.json({ error: 'winner_slot_id required when ended_reason=winner_promoted' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: round } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('marketing_copy_test_rounds')
        .select('id, ended_at')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.marketing.test-rounds.promote.read',
    );
    if (!round) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (round.ended_at) return NextResponse.json({ error: 'Round already ended' }, { status: 409 });

    const { error } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('marketing_copy_test_rounds')
        .update({
          ended_at: new Date().toISOString(),
          ended_reason: body.ended_reason,
          winner_slot_id: body.winner_slot_id ?? null,
        })
        .eq('id', params.id))(),
      8000,
      'api.marketing.test-rounds.promote.update',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marketing.test-rounds.promote', 'timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.marketing.test-rounds.promote', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
