// Prompt #93 Phase 4 + 5: cancel a pending scheduled activation.
//
// POST /api/admin/scheduled-activations/[id]/cancel
// Body: { reason?: string }
// Cancels only rows where executed_at IS NULL AND canceled_at IS NULL to
// avoid racing the Phase 5 Edge Function. Records an audit row.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as { reason?: string } | null;

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('scheduled_flag_activations')
    .select('id, feature_id, executed_at, canceled_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'Activation not found' }, { status: 404 });
  }
  const row = existing as {
    id: string; feature_id: string; executed_at: string | null; canceled_at: string | null;
  };
  if (row.executed_at) {
    return NextResponse.json({ error: 'Activation already executed' }, { status: 409 });
  }
  if (row.canceled_at) {
    return NextResponse.json({ error: 'Activation already canceled' }, { status: 409 });
  }

  let updateError;
  try {
    const result = await withTimeout(
      (async () => supabase
        .from('scheduled_flag_activations')
        .update({
          canceled_at: new Date().toISOString(),
          canceled_by: auth.user.id,
          cancel_reason: body?.reason?.trim() ?? null,
          execution_result: 'canceled',
        })
        .eq('id', params.id))(),
      8000,
      'api.admin.scheduled-activations.cancel',
    );
    updateError = result.error;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.admin.scheduled-activations.cancel', 'update timeout', { activationId: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.scheduled-activations.cancel', 'update error', { activationId: params.id, error: err });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (updateError) {
    safeLog.error('api.admin.scheduled-activations.cancel', 'update returned error', { activationId: params.id, error: updateError });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from('feature_flag_audit').insert({
    feature_id: row.feature_id,
    change_type: 'scheduled_activation_canceled',
    new_state: { activation_id: row.id, canceled_reason: body?.reason?.trim() ?? null },
    change_reason: body?.reason?.trim() ?? null,
    changed_by: auth.user.id,
  });

  return NextResponse.json({ ok: true });
}
