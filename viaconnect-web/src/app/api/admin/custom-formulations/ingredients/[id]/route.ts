// Prompt #97 Phase 2: update an ingredient library row.
// Admin toggles availability, edits metadata, updates regulatory status.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCustomFormulationsAdmin } from '@/lib/custom-formulations/admin-guard';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const ALLOWED_FIELDS = new Set([
  'common_name', 'scientific_name', 'alternate_names',
  'category', 'subcategory',
  'regulatory_status', 'gras_notice_number', 'gras_affirmation_date',
  'ndi_notification_number',
  'fda_warning_letter_issued', 'fda_safety_concern_listed',
  'available_forms',
  'minimum_effective_dose_mg', 'typical_dose_mg', 'dose_unit',
  'tolerable_upper_limit_adult_mg', 'tolerable_upper_limit_pediatric_mg',
  'pregnancy_category',
  'typical_cogs_cents_per_mg', 'supplier_notes', 'minimum_source_quantity_kg',
  'primary_indications', 'mechanism_summary',
  'structure_function_claim_allowed', 'allowed_claim_language',
  'contains_allergen_milk', 'contains_allergen_soy', 'contains_allergen_wheat',
  'contains_allergen_egg', 'contains_allergen_tree_nut', 'contains_allergen_peanut',
  'contains_allergen_fish', 'contains_allergen_shellfish', 'contains_allergen_sesame',
  'is_available_for_custom_formulation', 'inclusion_justification', 'excluded_reason',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireCustomFormulationsAdmin();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Body required' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(k)) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No allowed fields in patch' }, { status: 400 });
    }

    patch.last_reviewed_at = new Date().toISOString();
    patch.last_reviewed_by = auth.userId;

    const supabase = createClient();
    const updateRes = await withTimeout(
      (async () => supabase
        .from('ingredient_library')
        .update(patch as never)
        .eq('id', params.id))(),
      8000,
      'api.custom-formulations.ingredients.update',
    );

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, fields_updated: Object.keys(patch).length });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.custom-formulations.ingredients', 'database timeout', { id: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.custom-formulations.ingredients', 'unexpected error', { id: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
