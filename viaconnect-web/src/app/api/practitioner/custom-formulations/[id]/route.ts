// Prompt #97 Phase 3: update a formulation draft.
// PATCH /api/practitioner/custom-formulations/[id]
// Only drafts are editable. Whitelisted fields only. Does NOT modify
// ingredient list (that goes through /ingredients endpoint).

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';

const ALLOWED_FIELDS = new Set([
  'internal_name',
  'internal_description',
  'delivery_form',
  'capsule_size',
  'servings_per_container',
  'units_per_serving',
  'flavor_if_applicable',
  'intended_primary_indication',
  'intended_adult_use',
  'intended_pediatric_use',
  'intended_pregnancy_use',
  'proposed_structure_function_claims',
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Body required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No allowed fields in patch' }, { status: 400 });
  }

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
      { error: `Cannot edit formulation in status ${row.status}` },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from('custom_formulations')
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, fields_updated: Object.keys(patch).length });
}
