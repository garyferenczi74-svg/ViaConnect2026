// Prompt #97 Phase 3: server-side validation recheck endpoint.
// GET /api/practitioner/custom-formulations/[id]/validate
// Runs the DB-backed validator and returns the full ValidationResult.
// Used by the builder for live preview + by the submit endpoint as the
// final gate (client-side validation is never trusted alone).

import { type NextRequest, NextResponse } from 'next/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import { validateFormulation } from '@/lib/custom-formulations/validate-formulation-db';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const auth = await requirePractitioner();
    if (auth.kind === 'error') return auth.response;

    const supabase = createClient();
    const res = await withTimeout(
      (async () => supabase
        .from('custom_formulations')
        .select('practitioner_id')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.custom-formulations.validate.formulation-load',
    );
    const row = res.data as { practitioner_id: string } | null;
    if (!row) return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });
    if (row.practitioner_id !== auth.practitionerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await withTimeout(
      validateFormulation(params.id),
      10000,
      'api.practitioner.custom-formulations.validate.engine',
    );
    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.custom-formulations.validate', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Validation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.custom-formulations.validate', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
