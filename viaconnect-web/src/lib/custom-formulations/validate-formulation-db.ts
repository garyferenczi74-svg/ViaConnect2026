// Prompt #97 Phase 3.2: DB-backed wrapper for the validation engine.
//
// Loads a formulation + its ingredients + the relevant library rows and
// interactions, then delegates to the pure validator. Called by the
// server-side "recheck" before status transitions out of draft.

import { createClient } from '@/lib/supabase/server';
import {
  type FormulationDoseUnit,
  type InteractionSeverity,
  type PregnancyCategory,
  type ValidationResult,
} from '@/types/custom-formulations';
import {
  validateFormulationPure,
  type PureIngredientInput,
  type PureInteractionInput,
} from './validation-engine';

export async function validateFormulation(formulationId: string): Promise<ValidationResult> {
  const supabase = createClient();

  const { data: formulationRow } = await supabase
    .from('custom_formulations')
    .select(
      'id, intended_adult_use, intended_pediatric_use, intended_pregnancy_use, units_per_serving',
    )
    .eq('id', formulationId)
    .maybeSingle();
  const formulation = formulationRow as
    | {
        id: string;
        intended_adult_use: boolean;
        intended_pediatric_use: boolean;
        intended_pregnancy_use: boolean;
        units_per_serving: number;
      }
    | null;
  if (!formulation) throw new Error(`Formulation ${formulationId} not found`);

  const { data: cfIngredients } = await supabase
    .from('custom_formulation_ingredients')
    .select('ingredient_id, dose_per_serving, dose_unit, is_active_ingredient')
    .eq('custom_formulation_id', formulationId);

  const ingredientRows = (cfIngredients ?? []) as Array<{
    ingredient_id: string;
    dose_per_serving: number;
    dose_unit: FormulationDoseUnit;
    is_active_ingredient: boolean;
  }>;
  const ingredientIds = ingredientRows.map((r) => r.ingredient_id);

  if (ingredientIds.length === 0) {
    return validateFormulationPure({
      formulation: {
        intendedAdultUse: formulation.intended_adult_use,
        intendedPediatricUse: formulation.intended_pediatric_use,
        intendedPregnancyUse: formulation.intended_pregnancy_use,
        unitsPerServing: formulation.units_per_serving,
        servingsPerDay: 1,
      },
      ingredients: [],
      interactions: [],
    });
  }

  const { data: libRows } = await supabase
    .from('ingredient_library')
    .select(
      'id, common_name, tolerable_upper_limit_adult_mg, tolerable_upper_limit_pediatric_mg, pregnancy_category, typical_cogs_cents_per_mg, fda_warning_letter_issued, fda_safety_concern_listed, is_available_for_custom_formulation',
    )
    .in('id', ingredientIds);
  const library = new Map<string, Record<string, unknown>>();
  for (const row of (libRows ?? []) as Array<Record<string, unknown> & { id: string }>) {
    library.set(row.id, row);
  }

  const { data: interactionRows } = await supabase
    .from('ingredient_library_interactions')
    .select('ingredient_a_id, ingredient_b_id, severity, mechanism, blocks_formulation')
    .or(
      `and(ingredient_a_id.in.(${ingredientIds.join(',')}),ingredient_b_id.in.(${ingredientIds.join(',')}))`,
    );

  const ingredients: PureIngredientInput[] = ingredientRows.map((row) => {
    const lib = library.get(row.ingredient_id) ?? {};
    return {
      ingredientId: row.ingredient_id,
      dosePerServing: Number(row.dose_per_serving),
      doseUnit: row.dose_unit,
      isActiveIngredient: row.is_active_ingredient,
      library: {
        commonName: (lib.common_name as string) ?? row.ingredient_id,
        tolerableUpperLimitAdultMg: (lib.tolerable_upper_limit_adult_mg as number | null) ?? null,
        tolerableUpperLimitPediatricMg:
          (lib.tolerable_upper_limit_pediatric_mg as number | null) ?? null,
        pregnancyCategory: (lib.pregnancy_category as PregnancyCategory | null) ?? null,
        typicalCogsCentsPerMg: (lib.typical_cogs_cents_per_mg as number | null) ?? null,
        fdaWarningLetterIssued: Boolean(lib.fda_warning_letter_issued),
        fdaSafetyConcernListed: Boolean(lib.fda_safety_concern_listed),
        isAvailableForCustomFormulation: Boolean(lib.is_available_for_custom_formulation),
      },
    };
  });

  const interactions: PureInteractionInput[] = ((interactionRows ?? []) as Array<{
    ingredient_a_id: string;
    ingredient_b_id: string;
    severity: InteractionSeverity;
    mechanism: string;
    blocks_formulation: boolean;
  }>).map((r) => ({
    ingredientAId: r.ingredient_a_id,
    ingredientBId: r.ingredient_b_id,
    severity: r.severity,
    mechanism: r.mechanism,
    blocksFormulation: r.blocks_formulation,
  }));

  // PROHIBITED_INGREDIENT_ID_SET is consumed by default inside
  // validateFormulationPure; this wrapper does not override it.
  return validateFormulationPure({
    formulation: {
      intendedAdultUse: formulation.intended_adult_use,
      intendedPediatricUse: formulation.intended_pediatric_use,
      intendedPregnancyUse: formulation.intended_pregnancy_use,
      unitsPerServing: formulation.units_per_serving,
      servingsPerDay: 1,
    },
    ingredients,
    interactions,
  });
}
