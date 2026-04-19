// Prompt #93 Phase 4 + 5: emergency kill switch API.
//
// POST /api/admin/flags/[featureId]/kill-switch
// Body: { action: 'engage' | 'release', reason?: string }
// Engaging requires a non-empty reason. Engages or releases atomically,
// writes an audit row, and invalidates the flag cache immediately so the
// next request sees the change.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { invalidateFlag } from '@/lib/flags/cache';

export async function POST(
  request: NextRequest,
  { params }: { params: { featureId: string } },
) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { action?: 'engage' | 'release'; reason?: string }
    | null;
  if (!body?.action || (body.action !== 'engage' && body.action !== 'release')) {
    return NextResponse.json({ error: 'action must be engage or release' }, { status: 400 });
  }
  if (body.action === 'engage' && !body.reason?.trim()) {
    return NextResponse.json(
      { error: 'Reason is required when engaging the kill switch' },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const engage = body.action === 'engage';

  const { error } = await supabase
    .from('features')
    .update({
      kill_switch_engaged: engage,
      kill_switch_engaged_at: engage ? new Date().toISOString() : null,
      kill_switch_engaged_by: engage ? auth.user.id : null,
      kill_switch_reason: engage ? body.reason?.trim() ?? null : null,
    })
    .eq('id', params.featureId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('feature_flag_audit').insert({
    feature_id: params.featureId,
    change_type: engage ? 'kill_switch_engaged' : 'kill_switch_released',
    previous_state: { kill_switch_engaged: !engage },
    new_state: { kill_switch_engaged: engage },
    change_reason: body.reason?.trim() ?? null,
    changed_by: auth.user.id,
    user_agent: request.headers.get('user-agent'),
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
  });

  await invalidateFlag(params.featureId);

  return NextResponse.json({ ok: true, kill_switch_engaged: engage });
}
