// Prompt #97 Phase 3: submit formulation draft for review.
// POST /api/practitioner/custom-formulations/[id]/submit
// Runs the server-side validator; on pass, transitions status to
// ready_for_review and stamps validation timestamp. Phase 4 picks up from
// this status with medical + regulatory review routing.
//
// Prompt #140b Layer 3 hardening: timeouts on Supabase + validator,
// safeLog instrumentation.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import { validateFormulation } from '@/lib/custom-formulations/validate-formulation-db';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const auth = await requirePractitioner();
    if (auth.kind === 'error') return auth.response;

    const supabase = createClient();

    const existingRes = await withTimeout(
      (async () => supabase
        .from('custom_formulations')
        .select('id, status, practitioner_id')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.custom-formulations.submit.load',
    );
    const row = existingRes.data as { id: string; status: string; practitioner_id: string } | null;
    if (!row) return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });
    if (row.practitioner_id !== auth.practitionerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (row.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot submit formulation in status ${row.status}` },
        { status: 409 },
      );
    }

    let result;
    try {
      result = await withTimeout(
        validateFormulation(params.id),
        20000,
        'api.custom-formulations.submit.validator',
      );
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.custom-formulations.submit', 'validator timeout', { requestId, formulationId: params.id, error: err });
        return NextResponse.json({ error: 'Validation took too long. Please try again.' }, { status: 504 });
      }
      throw err;
    }

    const transitionStatus = result.overallPassed ? 'ready_for_review' : 'validation_failed';

    await withTimeout(
      (async () => supabase
        .from('custom_formulations')
        .update({
          passed_automated_validation: result.overallPassed,
          automated_validation_run_at: new Date().toISOString(),
          automated_validation_issues: result.issues as never,
          status: transitionStatus,
          estimated_cogs_per_unit_cents: result.estimatedCogsPerUnitCents,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', params.id))(),
      8000,
      'api.custom-formulations.submit.update',
    );

    if (!result.overallPassed) {
      safeLog.info('api.custom-formulations.submit', 'validation failed', { requestId, formulationId: params.id, issueCount: result.issues.length });
      return NextResponse.json(
        {
          error: 'Validation failed. Fix blockers and resubmit.',
          validation: result,
        },
        { status: 400 },
      );
    }

    safeLog.info('api.custom-formulations.submit', 'submitted for review', { requestId, formulationId: params.id, practitionerId: auth.practitionerId });
    return NextResponse.json({
      ok: true,
      status: transitionStatus,
      validation: result,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.custom-formulations.submit', 'database timeout', { requestId, formulationId: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.custom-formulations.submit', 'unexpected error', { requestId, formulationId: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
