// Prompt #97 Phase 3.2: formulation validation engine (safety-critical).
//
// Pure function: given a fully-loaded formulation snapshot plus the
// relevant ingredient library + interaction + prohibited-set lookups,
// return the full list of issues (blockers, warnings, info) plus the
// estimated COGS per unit. 90%+ test coverage required.
//
// Safety guardrails enforced here cannot be overridden by admin or
// practitioner. The validation logic is pure; it reads from injected
// lookups, never from the database directly. This makes every branch
// testable with fixtures.

import {
  PROHIBITED_INGREDIENT_ID_SET,
  type FormulationDoseUnit,
  type InteractionSeverity,
  type PregnancyCategory,
  type ValidationIssue,
  type ValidationResult,
} from '@/types/custom-formulations';

export interface PureIngredientInput {
  ingredientId: string;
  dosePerServing: number;
  doseUnit: FormulationDoseUnit;
  isActiveIngredient: boolean;
  library: {
    commonName: string;
    tolerableUpperLimitAdultMg: number | null;
    tolerableUpperLimitPediatricMg: number | null;
    pregnancyCategory: PregnancyCategory | null;
    typicalCogsCentsPerMg: number | null;
    fdaWarningLetterIssued: boolean;
    fdaSafetyConcernListed: boolean;
    isAvailableForCustomFormulation: boolean;
  };
}

export interface PureInteractionInput {
  ingredientAId: string;
  ingredientBId: string;
  severity: InteractionSeverity;
  mechanism: string;
  blocksFormulation: boolean;
}

export interface PureValidationInput {
  formulation: {
    intendedAdultUse: boolean;
    intendedPediatricUse: boolean;
    intendedPregnancyUse: boolean;
    unitsPerServing: number;
    servingsPerDay: number;
  };
  ingredients: PureIngredientInput[];
  interactions: PureInteractionInput[];
  /** Override the built-in prohibited set for testing; defaults to the
   *  hardcoded PROHIBITED_INGREDIENT_ID_SET. */
  prohibitedIngredientIds?: ReadonlySet<string>;
}

/** Pure: validate a formulation against every Phase 3 gate. */
export function validateFormulationPure(input: PureValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const prohibited = input.prohibitedIngredientIds ?? PROHIBITED_INGREDIENT_ID_SET;
  const servingsPerDay = Math.max(1, input.formulation.servingsPerDay);

  // ---- Check 1: prohibited-category blocker ------------------------------
  for (const ing of input.ingredients) {
    if (prohibited.has(ing.ingredientId)) {
      issues.push({
        severity: 'blocker',
        category: 'prohibited',
        ingredientId: ing.ingredientId,
        message: `${ing.library.commonName} is prohibited from custom formulations (regulatory category).`,
      });
    }
    if (ing.library.fdaWarningLetterIssued) {
      issues.push({
        severity: 'blocker',
        category: 'prohibited',
        ingredientId: ing.ingredientId,
        message: `${ing.library.commonName} has an FDA warning letter on file and cannot appear in approved formulations.`,
      });
    }
    if (ing.library.fdaSafetyConcernListed) {
      issues.push({
        severity: 'blocker',
        category: 'prohibited',
        ingredientId: ing.ingredientId,
        message: `${ing.library.commonName} is on the FDA safety concerns list.`,
      });
    }
    if (!ing.library.isAvailableForCustomFormulation) {
      issues.push({
        severity: 'blocker',
        category: 'prohibited',
        ingredientId: ing.ingredientId,
        message: `${ing.library.commonName} is not enabled for custom formulations.`,
      });
    }
  }

  // ---- Check 2: UL enforcement (adult + pediatric) -----------------------
  for (const ing of input.ingredients) {
    const doseMg = convertToMg(ing.dosePerServing, ing.doseUnit);
    const dailyDoseMg = doseMg * input.formulation.unitsPerServing * servingsPerDay;

    if (input.formulation.intendedPediatricUse && ing.library.tolerableUpperLimitPediatricMg !== null) {
      const ul = ing.library.tolerableUpperLimitPediatricMg;
      if (dailyDoseMg > ul) {
        issues.push({
          severity: 'blocker',
          category: 'ul_exceeded',
          ingredientId: ing.ingredientId,
          message: `${ing.library.commonName} at ${dailyDoseMg.toFixed(2)}mg/day exceeds the pediatric Tolerable Upper Intake Level of ${ul}mg.`,
          suggestedFix: `Reduce dose to ${(ul * 0.9).toFixed(1)}mg or below.`,
        });
      }
    }

    if (
      input.formulation.intendedAdultUse &&
      !input.formulation.intendedPediatricUse &&
      ing.library.tolerableUpperLimitAdultMg !== null
    ) {
      const ul = ing.library.tolerableUpperLimitAdultMg;
      if (dailyDoseMg > ul) {
        issues.push({
          severity: 'blocker',
          category: 'ul_exceeded',
          ingredientId: ing.ingredientId,
          message: `${ing.library.commonName} at ${dailyDoseMg.toFixed(2)}mg/day exceeds the adult Tolerable Upper Intake Level of ${ul}mg.`,
          suggestedFix: `Reduce dose to ${(ul * 0.9).toFixed(1)}mg or below.`,
        });
      }
    }
  }

  // ---- Check 3: pairwise interactions -----------------------------------
  const ingredientIds = new Set(input.ingredients.map((i) => i.ingredientId));
  for (const inter of input.interactions) {
    if (
      ingredientIds.has(inter.ingredientAId) &&
      ingredientIds.has(inter.ingredientBId)
    ) {
      issues.push({
        severity: inter.blocksFormulation ? 'blocker' : inter.severity === 'minor' ? 'info' : 'warning',
        category: 'interaction',
        ingredientId: inter.ingredientAId,
        ingredientBId: inter.ingredientBId,
        message: `Interaction between ${inter.ingredientAId} and ${inter.ingredientBId} (${inter.severity}): ${inter.mechanism}`,
      });
    }
  }

  // ---- Check 4: pediatric safety (info tier) -----------------------------
  if (input.formulation.intendedPediatricUse) {
    issues.push({
      severity: 'info',
      category: 'pediatric',
      message:
        'Pediatric use formulations require additional medical review. Expect 2 to 3 weeks longer approval timeline.',
    });
  }

  // ---- Check 5: pregnancy contraindications ------------------------------
  if (input.formulation.intendedPregnancyUse) {
    for (const ing of input.ingredients) {
      if (ing.library.pregnancyCategory === 'contraindicated') {
        issues.push({
          severity: 'blocker',
          category: 'pregnancy',
          ingredientId: ing.ingredientId,
          message: `${ing.library.commonName} is contraindicated in pregnancy and cannot appear in a pregnancy-use formulation.`,
        });
      } else if (ing.library.pregnancyCategory === 'caution') {
        issues.push({
          severity: 'warning',
          category: 'pregnancy',
          ingredientId: ing.ingredientId,
          message: `${ing.library.commonName} pregnancy category: caution. Medical review will evaluate appropriateness.`,
        });
      } else if (ing.library.pregnancyCategory === 'insufficient_data') {
        issues.push({
          severity: 'warning',
          category: 'pregnancy',
          ingredientId: ing.ingredientId,
          message: `${ing.library.commonName} pregnancy safety data insufficient. Medical review will require supporting evidence.`,
        });
      }
    }
  }

  // ---- Check 6: minimum active ingredient count --------------------------
  const activeIngredients = input.ingredients.filter((ing) => ing.isActiveIngredient);
  if (activeIngredients.length === 0) {
    issues.push({
      severity: 'blocker',
      category: 'dose',
      message: 'Formulation must contain at least one active ingredient.',
    });
  }

  // ---- Cost estimation (per unit) ---------------------------------------
  const estimatedCogsPerUnitCents = estimateCogsPerUnit(input.ingredients);

  const blockerCount = issues.filter((i) => i.severity === 'blocker').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    overallPassed: blockerCount === 0,
    blockerCount,
    warningCount,
    infoCount,
    issues,
    estimatedCogsPerUnitCents,
  };
}

/** Pure: convert a dose to milligrams for UL comparison.
 *  IU is handled by convention (returned as-is since IU-to-mg varies by
 *  vitamin; UL tables use mg units but IU doses need per-vitamin
 *  conversion outside this helper). CFU billions never convert (not
 *  weight-based).
 */
export function convertToMg(dose: number, unit: FormulationDoseUnit): number {
  switch (unit) {
    case 'mg':
      return dose;
    case 'mcg':
      return dose / 1000;
    case 'g':
      return dose * 1000;
    case 'iu':
      // IU conversion varies by vitamin; caller must pre-convert for
      // weight-based UL comparison. Returning `dose` preserves the input.
      return dose;
    case 'cfu_billions':
      // Not weight-based; UL does not apply. Returning 0 keeps the value
      // out of any UL comparison without crashing.
      return 0;
    default: {
      const _exhaustive: never = unit;
      throw new Error(`Unhandled dose unit: ${String(_exhaustive)}`);
    }
  }
}

/** Pure: estimate per-unit COGS in cents. Uses library per-mg cost; zero
 *  if the library row lacks that data. Does not include manufacturing
 *  overhead (that's added by the Phase 5 pricing calculator). */
export function estimateCogsPerUnit(ingredients: PureIngredientInput[]): number {
  let totalCents = 0;
  for (const ing of ingredients) {
    if (ing.library.typicalCogsCentsPerMg === null) continue;
    const doseMg = convertToMg(ing.dosePerServing, ing.doseUnit);
    totalCents += doseMg * ing.library.typicalCogsCentsPerMg;
  }
  // Round up to nearest cent to avoid under-quoting.
  return Math.ceil(totalCents);
}
