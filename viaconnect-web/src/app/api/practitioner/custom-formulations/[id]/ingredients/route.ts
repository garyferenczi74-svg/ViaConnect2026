// Prompt #97 Phase 3: add/update/remove ingredient in a formulation draft.
// POST adds an ingredient. PATCH updates dose/unit/is_active. DELETE
// removes. Body validates against ingredient_library's is_available check
// via RLS.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';

async function assertDraftOwnership(
  supabase: ReturnType<typeof createClient>,
  formulationId: string,
  practitionerId: string,
): Promise<NextResponse | null> {
  const { data } = await supabase
    .from('custom_formulations')
    .select('status, practitioner_id')
    .eq('id', formulationId)
    .maybeSingle();
  const row = data as { status: string; practitioner_id: string } | null;
  if (!row) return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });
  if (row.practitioner_id !== practitionerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (row.status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot edit ingredients in status ${row.status}` },
      { status: 409 },
    );
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        ingredient_id?: string;
        dose_per_serving?: number;
        dose_unit?: string;
        ingredient_form?: string;
        is_active_ingredient?: boolean;
      }
    | null;

  if (
    !body?.ingredient_id ||
    body.dose_per_serving === undefined ||
    body.dose_per_serving <= 0 ||
    !body.dose_unit
  ) {
    return NextResponse.json(
      { error: 'ingredient_id, dose_per_serving (>0), dose_unit required' },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const guardRes = await assertDraftOwnership(supabase, params.id, auth.practitionerId);
  if (guardRes) return guardRes;

  const { data, error } = await supabase
    .from('custom_formulation_ingredients')
    .insert({
      custom_formulation_id: params.id,
      ingredient_id: body.ingredient_id,
      dose_per_serving: body.dose_per_serving,
      dose_unit: body.dose_unit,
      ingredient_form: body.ingredient_form ?? null,
      is_active_ingredient: body.is_active_ingredient ?? true,
    } as never)
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ingredient already present in this formulation' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const ingredientId = request.nextUrl.searchParams.get('ingredient_id');
  if (!ingredientId) {
    return NextResponse.json({ error: 'ingredient_id query param required' }, { status: 400 });
  }

  const supabase = createClient();
  const guardRes = await assertDraftOwnership(supabase, params.id, auth.practitionerId);
  if (guardRes) return guardRes;

  const { error } = await supabase
    .from('custom_formulation_ingredients')
    .delete()
    .eq('custom_formulation_id', params.id)
    .eq('ingredient_id', ingredientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
