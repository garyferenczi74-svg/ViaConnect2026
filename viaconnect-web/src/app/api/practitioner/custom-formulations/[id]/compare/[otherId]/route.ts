// Prompt #97 Phase 6.3: version comparison endpoint.
// GET /api/practitioner/custom-formulations/[id]/compare/[otherId]
// Returns the pure diff computed by computeVersionDiff. Both formulations
// must belong to the caller.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import {
  computeVersionDiff,
  type VersionSnapshot,
} from '@/lib/custom-formulations/version-diff';
import { classifyRevision } from '@/lib/custom-formulations/revision-classification';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; otherId: string } },
) {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();

  const { data } = await supabase
    .from('custom_formulations')
    .select(
      'id, practitioner_id, internal_name, delivery_form, units_per_serving, servings_per_container, intended_adult_use, intended_pediatric_use, intended_pregnancy_use, proposed_structure_function_claims, custom_formulation_ingredients(ingredient_id, dose_per_serving, dose_unit, is_active_ingredient)',
    )
    .in('id', [params.id, params.otherId]);

  const rows = (data ?? []) as Array<{
    id: string;
    practitioner_id: string;
    internal_name: string;
    delivery_form: string;
    units_per_serving: number;
    servings_per_container: number;
    intended_adult_use: boolean;
    intended_pediatric_use: boolean;
    intended_pregnancy_use: boolean;
    proposed_structure_function_claims: string[];
    custom_formulation_ingredients: Array<{
      ingredient_id: string;
      dose_per_serving: number;
      dose_unit: string;
      is_active_ingredient: boolean;
    }>;
  }>;

  if (rows.length < 2) {
    return NextResponse.json({ error: 'One or both formulations not found' }, { status: 404 });
  }
  for (const r of rows) {
    if (r.practitioner_id !== auth.practitionerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const prevRow = rowById.get(params.otherId)!;
  const nextRow = rowById.get(params.id)!;

  const toSnapshot = (r: typeof rows[number]): VersionSnapshot => ({
    internalName: r.internal_name,
    deliveryForm: r.delivery_form,
    unitsPerServing: r.units_per_serving,
    servingsPerContainer: r.servings_per_container,
    intendedAdultUse: r.intended_adult_use,
    intendedPediatricUse: r.intended_pediatric_use,
    intendedPregnancyUse: r.intended_pregnancy_use,
    proposedClaims: r.proposed_structure_function_claims ?? [],
    ingredients: (r.custom_formulation_ingredients ?? []).map((i) => ({
      ingredientId: i.ingredient_id,
      dosePerServing: Number(i.dose_per_serving),
      doseUnit: i.dose_unit,
      isActive: i.is_active_ingredient,
    })),
  });

  const prev = toSnapshot(prevRow);
  const next = toSnapshot(nextRow);
  const diff = computeVersionDiff(prev, next);
  const classification = classifyRevision({
    previous: {
      intendedAdultUse: prev.intendedAdultUse,
      intendedPediatricUse: prev.intendedPediatricUse,
      intendedPregnancyUse: prev.intendedPregnancyUse,
      deliveryForm: prev.deliveryForm,
      proposedClaims: prev.proposedClaims,
      ingredients: prev.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        dosePerServing: i.dosePerServing,
        isActive: i.isActive,
      })),
    },
    next: {
      intendedAdultUse: next.intendedAdultUse,
      intendedPediatricUse: next.intendedPediatricUse,
      intendedPregnancyUse: next.intendedPregnancyUse,
      deliveryForm: next.deliveryForm,
      proposedClaims: next.proposedClaims,
      ingredients: next.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        dosePerServing: i.dosePerServing,
        isActive: i.isActive,
      })),
    },
  });

  return NextResponse.json({ diff, classification });
}
