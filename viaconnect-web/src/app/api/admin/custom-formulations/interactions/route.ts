// Prompt #97 Phase 2.5: add an ingredient interaction record.
// POST /api/admin/custom-formulations/interactions
// Body: { ingredient_a_id, ingredient_b_id, severity, mechanism,
//         clinical_significance?, source_reference?, blocks_formulation }
// Canonicalizes (a, b) to alphabetical order to satisfy the CHECK (a<b).

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCustomFormulationsAdmin } from '@/lib/custom-formulations/admin-guard';

const VALID_SEVERITIES = new Set(['minor', 'moderate', 'major', 'contraindicated']);

export async function POST(request: NextRequest) {
  const auth = await requireCustomFormulationsAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        ingredient_a_id?: string;
        ingredient_b_id?: string;
        severity?: string;
        mechanism?: string;
        clinical_significance?: string;
        source_reference?: string;
        blocks_formulation?: boolean;
      }
    | null;

  if (!body?.ingredient_a_id || !body.ingredient_b_id || !body.severity || !body.mechanism) {
    return NextResponse.json(
      { error: 'ingredient_a_id, ingredient_b_id, severity, mechanism are required' },
      { status: 400 },
    );
  }
  if (!VALID_SEVERITIES.has(body.severity)) {
    return NextResponse.json({ error: 'Invalid severity' }, { status: 400 });
  }
  if (body.ingredient_a_id === body.ingredient_b_id) {
    return NextResponse.json(
      { error: 'ingredient_a_id and ingredient_b_id must differ' },
      { status: 400 },
    );
  }

  // Canonicalize to alphabetical order (CHECK (a<b) on the table).
  const [a, b] =
    body.ingredient_a_id < body.ingredient_b_id
      ? [body.ingredient_a_id, body.ingredient_b_id]
      : [body.ingredient_b_id, body.ingredient_a_id];

  const supabase = createClient();
  const { data, error } = await supabase
    .from('ingredient_library_interactions')
    .insert({
      ingredient_a_id: a,
      ingredient_b_id: b,
      severity: body.severity,
      mechanism: body.mechanism,
      clinical_significance: body.clinical_significance ?? null,
      source_reference: body.source_reference ?? null,
      blocks_formulation: body.blocks_formulation ?? false,
      added_by: auth.userId,
    } as never)
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Interaction already exists for this pair' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
