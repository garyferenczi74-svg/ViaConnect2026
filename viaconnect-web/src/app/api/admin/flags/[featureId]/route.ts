// Prompt #93 Phase 4: admin flag update endpoint.
//
// POST /api/admin/flags/[featureId]
// Body: partial FeatureRow patch + optional { reason } for audit trail.
// Runs role check → loads previous state → diffs → writes atomic UPDATE →
// writes per-change audit rows → invalidates the flag cache.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { invalidateFlag } from '@/lib/flags/cache';
import { buildAuditEntries } from '@/lib/flags/audit-builder';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const ALLOWED_FIELDS = new Set([
  'is_active',
  'launch_phase_id',
  'rollout_strategy',
  'rollout_percentage',
  'rollout_cohort_ids',
  'feature_owner',
  'description',
  'gate_behavior',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { featureId: string } },
) {
  try {
    const auth = await requireAdmin();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as
      | { patch?: Record<string, unknown>; reason?: string }
      | null;
    if (!body?.patch) {
      return NextResponse.json({ error: 'Missing patch body' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body.patch)) {
      if (ALLOWED_FIELDS.has(k)) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No allowed fields in patch' }, { status: 400 });
    }

    const supabase = createClient();

    const prevRes = await withTimeout(
      (async () => supabase
        .from('features')
        .select(
          'is_active, kill_switch_engaged, launch_phase_id, rollout_strategy, rollout_percentage, rollout_cohort_ids, feature_owner, description, gate_behavior',
        )
        .eq('id', params.featureId)
        .maybeSingle())(),
      8000,
      'api.flags.update.load-prev',
    );
    if (prevRes.error || !prevRes.data) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }
    const prev = prevRes.data;

    const updateRes = await withTimeout(
      (async () => supabase
        .from('features')
        .update(patch)
        .eq('id', params.featureId))(),
      8000,
      'api.flags.update.update',
    );
    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    const newState = { ...(prev as Record<string, unknown>), ...patch };
    const auditRows = buildAuditEntries({
      featureId: params.featureId,
      previousState: prev as Record<string, unknown>,
      newState,
      changedBy: auth.user.id,
      changeReason: body.reason,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim(),
    });

    if (auditRows.length > 0) {
      await withTimeout(
        (async () => supabase.from('feature_flag_audit').insert(auditRows as never))(),
        8000,
        'api.flags.update.audit-insert',
      );
    }

    await invalidateFlag(params.featureId);

    return NextResponse.json({ ok: true, audit_entries: auditRows.length });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.flags.update', 'database timeout', { featureId: params.featureId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.flags.update', 'unexpected error', { featureId: params.featureId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
