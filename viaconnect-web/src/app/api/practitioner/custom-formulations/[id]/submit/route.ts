// Prompt #97 Phase 3: submit formulation draft for review.
// POST /api/practitioner/custom-formulations/[id]/submit
// Runs the server-side validator; on pass, transitions status to
// ready_for_review and stamps validation timestamp. Phase 4 picks up from
// this status with medical + regulatory review routing.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import { validateFormulation } from '@/lib/custom-formulations/validate-formulation-db';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('custom_formulations')
    .select('id, status, practitioner_id')
    .eq('id', params.id)
    .maybeSingle();
  const row = existing as { id: string; status: string; practitioner_id: string } | null;
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

  const result = await validateFormulation(params.id);

  // Store the validation snapshot regardless of pass/fail; practitioner
  // needs to see what server-side check reported.
  const transitionStatus = result.overallPassed ? 'ready_for_review' : 'validation_failed';

  await supabase
    .from('custom_formulations')
    .update({
      passed_automated_validation: result.overallPassed,
      automated_validation_run_at: new Date().toISOString(),
      automated_validation_issues: result.issues as never,
      status: transitionStatus,
      estimated_cogs_per_unit_cents: result.estimatedCogsPerUnitCents,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', params.id);

  if (!result.overallPassed) {
    return NextResponse.json(
      {
        error: 'Validation failed. Fix blockers and resubmit.',
        validation: result,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: transitionStatus,
    validation: result,
  });
}
