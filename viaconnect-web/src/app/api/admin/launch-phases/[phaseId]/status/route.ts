// Prompt #93 Phase 4 + 5: launch phase status update.
//
// POST /api/admin/launch-phases/[phaseId]/status
// Body: { status: 'active' | 'paused' | 'completed' | 'canceled',
//         confirmed: boolean, reason?: string }
// Activating a phase requires the client-side two-step confirmation flow:
// the server requires `confirmed=true`, and the UI enforces the 60-second
// delay between the arm + confirm presses. Pause is the launch-phase
// rollback: all features linked to this phase become disabled on next
// evaluation because the pure engine requires status in (active, completed).

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { invalidateFlag } from '@/lib/flags/cache';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const ALLOWED_STATUSES = new Set(['active', 'paused', 'completed', 'canceled', 'scheduled', 'planned']);

export async function POST(
  request: NextRequest,
  { params }: { params: { phaseId: string } },
) {
  try {
    const auth = await requireAdmin();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as
      | { status?: string; confirmed?: boolean; reason?: string }
      | null;

    if (!body?.status || !ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid target status' }, { status: 400 });
    }
    if (body.status === 'active' && !body.confirmed) {
      return NextResponse.json(
        { error: 'Activating a launch phase requires explicit confirmation' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    const updates: Record<string, unknown> = {
      activation_status: body.status,
      updated_at: new Date().toISOString(),
    };
    if (body.status === 'active') {
      updates.actual_activation_date = new Date().toISOString().slice(0, 10);
    }

    const updateRes = await withTimeout(
      (async () => supabase.from('launch_phases').update(updates).eq('id', params.phaseId))(),
      8000,
      'api.launch-phases.status.update',
    );
    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    // Invalidate every feature in the phase so the new status lands on next
    // request. We collect the ids first so we can hit each cache tag.
    const featuresRes = await withTimeout(
      (async () => supabase
        .from('features')
        .select('id')
        .eq('launch_phase_id', params.phaseId))(),
      8000,
      'api.launch-phases.status.list-features',
    );
    const featureIds = ((featuresRes.data ?? []) as Array<{ id: string }>).map((f) => f.id);
    await Promise.all(featureIds.map((id) => invalidateFlag(id)));

    return NextResponse.json({
      ok: true,
      phase_id: params.phaseId,
      status: body.status,
      features_invalidated: featureIds.length,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.launch-phases.status', 'database timeout', { phaseId: params.phaseId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.launch-phases.status', 'unexpected error', { phaseId: params.phaseId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
