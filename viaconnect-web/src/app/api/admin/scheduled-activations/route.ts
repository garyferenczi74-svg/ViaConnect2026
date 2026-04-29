// Prompt #93 Phase 4 + 5: create a scheduled flag activation.
//
// POST /api/admin/scheduled-activations
// Body: { feature_id, target_action, target_value, scheduled_for }
// The row is picked up by the Phase 5 execute-scheduled-flags Edge Function
// when NOW() >= scheduled_for. Records a feature_flag_audit row.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const ALLOWED_ACTIONS = new Set([
  'activate', 'deactivate',
  'kill_switch_engage', 'kill_switch_release',
  'rollout_percentage_change', 'phase_advance',
]);

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        feature_id?: string;
        target_action?: string;
        target_value?: Record<string, unknown>;
        scheduled_for?: string;
      }
    | null;

  if (!body?.feature_id || !body.target_action || !body.scheduled_for) {
    return NextResponse.json(
      { error: 'feature_id, target_action, and scheduled_for are required' },
      { status: 400 },
    );
  }
  if (!ALLOWED_ACTIONS.has(body.target_action)) {
    return NextResponse.json({ error: 'Invalid target_action' }, { status: 400 });
  }
  const scheduledAt = new Date(body.scheduled_for);
  if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'scheduled_for must be a future ISO timestamp' }, { status: 400 });
  }

  const supabase = createClient();

  let data, error;
  try {
    const result = await withTimeout(
      (async () => supabase
        .from('scheduled_flag_activations')
        .insert({
          feature_id: body.feature_id!,
          target_action: body.target_action!,
          target_value: (body.target_value ?? {}) as never,
          scheduled_for: scheduledAt.toISOString(),
          scheduled_by: auth.user.id,
        })
        .select('id')
        .single())(),
      8000,
      'api.admin.scheduled-activations.insert',
    );
    data = result.data;
    error = result.error;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.admin.scheduled-activations', 'insert timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.scheduled-activations', 'insert error', { error: err });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (error || !data) {
    safeLog.error('api.admin.scheduled-activations', 'insert returned error', { error });
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  await supabase.from('feature_flag_audit').insert({
    feature_id: body.feature_id,
    change_type: 'scheduled_activation_set',
    new_state: { activation_id: (data as { id: string }).id, scheduled_for: scheduledAt.toISOString(), target_action: body.target_action },
    changed_by: auth.user.id,
  });

  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
