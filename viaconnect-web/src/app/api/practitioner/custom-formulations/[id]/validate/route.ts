// Prompt #97 Phase 3: server-side validation recheck endpoint.
// GET /api/practitioner/custom-formulations/[id]/validate
// Runs the DB-backed validator and returns the full ValidationResult.
// Used by the builder for live preview + by the submit endpoint as the
// final gate (client-side validation is never trusted alone).

import { type NextRequest, NextResponse } from 'next/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import { validateFormulation } from '@/lib/custom-formulations/validate-formulation-db';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();
  const { data } = await supabase
    .from('custom_formulations')
    .select('practitioner_id')
    .eq('id', params.id)
    .maybeSingle();
  const row = data as { practitioner_id: string } | null;
  if (!row) return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });
  if (row.practitioner_id !== auth.practitionerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await validateFormulation(params.id);
  return NextResponse.json(result);
}
