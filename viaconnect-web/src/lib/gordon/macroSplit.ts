// Prompt 179: the macro split (protein, fat, carb, reconcile, fiber) extracted
// verbatim from generateMacroTargets so BOTH the CAQ macro engine and the
// Goals goal engine derive macros from a calorie target through ONE function.
// Behavior is identical to the prior inline logic (173 + 173a). The goal engine
// supplies its own solved calorie target; the macro engine supplies the one it
// computed from Mifflin + activity + deficit.

import { MACRO_CONFIG, LBS_PER_KG_MACRO, type DietaryChoice } from './macro-config';
import type { GoalDirection } from '@/lib/weight-goals/accessor';
import type { ClampReason } from './generateMacroTargets';

export interface DeriveMacroSplitInput {
  calorieTargetKcal: number;
  direction: GoalDirection;
  lbmKg: number;
  currentWeightKg: number;
  dietaryChoice: DietaryChoice;
}
export interface MacroSplitResult {
  proteinG: number;
  fatG: number;
  carbG: number;
  fiberG: number;
  clamps: ClampReason[];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

// 173a Step 2: protein = 0.8 g/lb LBM * goal multiplier. Apply the 40% kcal
// ceiling so very-low-calorie + high-multiplier combos cannot let protein
// dominate the day.
function resolveProteinGrams(
  direction: GoalDirection,
  lbmKg: number,
  calorieTargetKcal: number,
): { proteinG: number; clamps: ClampReason[] } {
  const clamps: ClampReason[] = [];
  const multiplier =
    direction === 'lose' ? MACRO_CONFIG.protein_multiplier_lose
      : direction === 'gain' ? MACRO_CONFIG.protein_multiplier_gain
      : MACRO_CONFIG.protein_multiplier_maintain;
  const lbmLbs = lbmKg * LBS_PER_KG_MACRO;
  let proteinG = MACRO_CONFIG.protein_g_per_lb_lbm * multiplier * lbmLbs;

  const proteinKcalCeiling = calorieTargetKcal * MACRO_CONFIG.protein_max_pct_of_kcal;
  if (proteinG * 4 > proteinKcalCeiling) {
    proteinG = proteinKcalCeiling / 4;
    clamps.push('protein_pct_ceiling');
  }
  return { proteinG, clamps };
}

function fatPctForDiet(diet: DietaryChoice): number {
  switch (diet) {
    case 'mediterranean':
      return MACRO_CONFIG.fat_pct_mediterranean;
    case 'low_carb':
      return MACRO_CONFIG.fat_pct_low_carb;
    case 'higher_carb':
      return MACRO_CONFIG.fat_pct_higher_carb;
    case 'plant_based':
      return MACRO_CONFIG.fat_pct_plant_based;
    case 'keto':
      return MACRO_CONFIG.fat_pct_low_carb;
    case 'balanced':
    default:
      return MACRO_CONFIG.fat_pct_balanced;
  }
}

// 173a Section 5 Step 3: fat + carbohydrate by dietary choice.
function resolveFatAndCarb(
  diet: DietaryChoice,
  calorieTargetKcal: number,
  proteinG: number,
  currentWeightKg: number,
): { fatG: number; carbG: number; clamps: ClampReason[] } {
  const clamps: ClampReason[] = [];
  const proteinKcal = proteinG * 4;
  const remainingKcal = calorieTargetKcal - proteinKcal;
  const fatHormonalFloorG = MACRO_CONFIG.min_fat_g_per_kg * currentWeightKg;
  const fatHormonalFloorKcal = fatHormonalFloorG * 9;

  if (diet === 'keto') {
    const carbG = MACRO_CONFIG.keto_carb_cap_g;
    const carbKcal = carbG * 4;
    let fatKcal = remainingKcal - carbKcal;
    if (fatKcal < fatHormonalFloorKcal) {
      fatKcal = fatHormonalFloorKcal;
      clamps.push('fat_hormonal_floor');
    }
    const fatG = fatKcal / 9;
    clamps.push('keto_carb_cap');
    return { fatG, carbG, clamps };
  }

  let fatKcal = calorieTargetKcal * fatPctForDiet(diet);
  if (fatKcal < fatHormonalFloorKcal) {
    fatKcal = fatHormonalFloorKcal;
    clamps.push('fat_hormonal_floor');
  }

  let carbKcal = Math.max(0, remainingKcal - fatKcal);

  if (diet === 'low_carb') {
    const carbCapKcal = calorieTargetKcal * MACRO_CONFIG.low_carb_cap_pct;
    if (carbKcal > carbCapKcal) {
      const freedKcal = carbKcal - carbCapKcal;
      carbKcal = carbCapKcal;
      fatKcal += freedKcal;
      clamps.push('low_carb_cap');
    }
  }

  return { fatG: fatKcal / 9, carbG: carbKcal / 4, clamps };
}

export function deriveMacroSplit(input: DeriveMacroSplitInput): MacroSplitResult {
  const { calorieTargetKcal, direction, lbmKg, currentWeightKg, dietaryChoice } = input;

  const protein = resolveProteinGrams(direction, lbmKg, calorieTargetKcal);
  let proteinG = protein.proteinG;

  const fatAndCarb = resolveFatAndCarb(dietaryChoice, calorieTargetKcal, proteinG, currentWeightKg);
  let fatG = fatAndCarb.fatG;
  let carbG = fatAndCarb.carbG;

  // Reconciliation guard (173a Section 5). Non-keto: protein anchored, fat
  // floors to healthy minimum, carbs absorb remainder. Keto: handled above.
  const reconcileClamps: ClampReason[] = [];
  if (dietaryChoice !== 'keto') {
    let carbKcal = carbG * 4;
    if (carbKcal < 0) {
      const fatHormonalFloorG = MACRO_CONFIG.min_fat_g_per_kg * currentWeightKg;
      const fatExcessKcal = (fatG - fatHormonalFloorG) * 9;
      if (fatExcessKcal > 0) {
        const reduction = Math.min(fatExcessKcal, -carbKcal);
        fatG -= reduction / 9;
        carbKcal += reduction;
        reconcileClamps.push('carb_reconcile_fat');
      }
    }
    if (carbKcal < 0) {
      const proteinFloorG = 1.2 * lbmKg;
      const proteinExcessKcal = (proteinG - proteinFloorG) * 4;
      if (proteinExcessKcal > 0) {
        const reduction = Math.min(proteinExcessKcal, -carbKcal);
        proteinG -= reduction / 4;
        carbKcal += reduction;
        reconcileClamps.push('carb_reconcile_protein');
      }
    }
    carbG = Math.max(0, carbKcal / 4);
  }

  // Step 6 (173a): fiber = 14 g per 1000 kcal of the calorie target.
  const fiberG = Math.round((MACRO_CONFIG.fiber_g_per_1000_kcal * calorieTargetKcal) / 1000);

  return {
    proteinG: round1(proteinG),
    fatG: round1(fatG),
    carbG: round1(carbG),
    fiberG,
    clamps: [...protein.clamps, ...fatAndCarb.clamps, ...reconcileClamps],
  };
}
