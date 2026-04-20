// Prompt #97 Phase 6.2: create a new version from an existing formulation.
// POST /api/practitioner/custom-formulations/[id]/revise
// Clones the current formulation (+ its ingredients) into a new row with
// version_number+1 and parent_formulation_id set. Marks the prior version
// is_current_version=false. Returns the new version id + classification
// placeholder (classification is computed when the practitioner edits +
// submits — the revise endpoint only opens the editable draft).

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('custom_formulations')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  const prev = existing as Record<string, unknown> | null;
  if (!prev) return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });

  if (prev.practitioner_id !== auth.practitionerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (prev.status !== 'approved_production_ready') {
    return NextResponse.json(
      {
        error: `Revision only available for approved_production_ready formulations; current status ${prev.status}`,
      },
      { status: 409 },
    );
  }
  if (prev.is_current_version !== true) {
    return NextResponse.json({ error: 'Cannot revise a non-current version' }, { status: 409 });
  }

  const nextVersionNumber = Number(prev.version_number ?? 1) + 1;

  // Create the new version row (status=draft so the practitioner edits it
  // before re-submitting).
  const { data: newVersion, error: insertErr } = await supabase
    .from('custom_formulations')
    .insert({
      enrollment_id: prev.enrollment_id,
      practitioner_id: prev.practitioner_id,
      exclusive_to_practitioner_id: prev.practitioner_id,
      internal_name: prev.internal_name,
      internal_description: prev.internal_description,
      delivery_form: prev.delivery_form,
      capsule_size: prev.capsule_size,
      servings_per_container: prev.servings_per_container,
      units_per_serving: prev.units_per_serving,
      flavor_if_applicable: prev.flavor_if_applicable,
      intended_primary_indication: prev.intended_primary_indication,
      intended_adult_use: prev.intended_adult_use,
      intended_pediatric_use: prev.intended_pediatric_use,
      intended_pregnancy_use: prev.intended_pregnancy_use,
      proposed_structure_function_claims: prev.proposed_structure_function_claims,
      status: 'draft',
      version_number: nextVersionNumber,
      parent_formulation_id: params.id,
      is_current_version: true,
      estimated_cogs_per_unit_cents: prev.estimated_cogs_per_unit_cents,
    } as never)
    .select('id')
    .single();

  if (insertErr || !newVersion) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'Version insert failed' },
      { status: 500 },
    );
  }

  const newId = (newVersion as { id: string }).id;

  // Copy ingredients over.
  const { data: prevIngredients } = await supabase
    .from('custom_formulation_ingredients')
    .select('ingredient_id, dose_per_serving, dose_unit, percent_daily_value, ingredient_form, source_notes, is_active_ingredient, sort_order')
    .eq('custom_formulation_id', params.id);

  if (prevIngredients && prevIngredients.length > 0) {
    const rows = (prevIngredients as Array<Record<string, unknown>>).map((row) => ({
      custom_formulation_id: newId,
      ingredient_id: row.ingredient_id,
      dose_per_serving: row.dose_per_serving,
      dose_unit: row.dose_unit,
      percent_daily_value: row.percent_daily_value,
      ingredient_form: row.ingredient_form,
      source_notes: row.source_notes,
      is_active_ingredient: row.is_active_ingredient,
      sort_order: row.sort_order,
    }));
    const { error: cfiErr } = await supabase
      .from('custom_formulation_ingredients')
      .insert(rows as never);
    if (cfiErr) {
      return NextResponse.json(
        { error: `Ingredient clone failed: ${cfiErr.message}` },
        { status: 500 },
      );
    }
  }

  // Mark the prior version as not current. The old row stays in the DB so
  // inventory from prior runs continues to be valid.
  await supabase
    .from('custom_formulations')
    .update({ is_current_version: false, updated_at: new Date().toISOString() } as never)
    .eq('id', params.id);

  return NextResponse.json({
    new_formulation_id: newId,
    version_number: nextVersionNumber,
    parent_formulation_id: params.id,
  });
}
