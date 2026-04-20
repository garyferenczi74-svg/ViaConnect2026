// Prompt #97 Phase 4.4: duplicate formulation detection endpoint.
// GET /api/admin/custom-formulations/[id]/duplicates
// Called by the admin review UI when opening a formulation for approval.
// Surfaces similarity scores against approved formulations from other
// practitioners. Used to enforce exclusive-use commitments.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCustomFormulationsAdmin } from '@/lib/custom-formulations/admin-guard';
import {
  detectDuplicates,
  type FormulationSnapshot,
} from '@/lib/custom-formulations/duplicate-detection';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireCustomFormulationsAdmin();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();

  const [targetResp, othersResp] = await Promise.all([
    supabase
      .from('custom_formulations')
      .select('id, practitioner_id, internal_name, custom_formulation_ingredients(ingredient_id, dose_per_serving)')
      .eq('id', params.id)
      .maybeSingle(),
    supabase
      .from('custom_formulations')
      .select('id, practitioner_id, internal_name, custom_formulation_ingredients(ingredient_id, dose_per_serving)')
      .eq('status', 'approved_production_ready'),
  ]);

  type RawFormulation = {
    id: string;
    practitioner_id: string;
    internal_name: string;
    custom_formulation_ingredients: Array<{ ingredient_id: string; dose_per_serving: number }>;
  };

  const target = targetResp.data as RawFormulation | null;
  if (!target) {
    return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });
  }

  const toSnapshot = (r: RawFormulation): FormulationSnapshot => ({
    id: r.id,
    practitionerId: r.practitioner_id,
    internalName: r.internal_name,
    ingredients: (r.custom_formulation_ingredients ?? []).map((i) => ({
      ingredientId: i.ingredient_id,
      dosePerServing: Number(i.dose_per_serving),
    })),
  });

  const targetSnap = toSnapshot(target);
  const others = ((othersResp.data ?? []) as RawFormulation[])
    .filter((r) => r.id !== target.id)
    .map(toSnapshot);

  const result = detectDuplicates(targetSnap, others);
  return NextResponse.json(result);
}
