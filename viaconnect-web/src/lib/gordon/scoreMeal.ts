// Gordon AI: client-side meal quality scoring algorithm.
//
// Pure function. No I/O, no Supabase client, no fetch. Only Date.now() touches
// the runtime, and only to stamp breakdown.calculated_at. The same algorithm
// runs server-side in supabase/functions/gordon-score-meal at Apply C; this
// module is the SSOT for sub-300ms slider feedback and the Jest/vitest parity
// fixture target.
//
// Section 3.4 of docs/superpowers/plans/2026-05-14-prompt-168-meal-foundation.md.

import type {
  KnownNutrients,
  Meal,
  MealDistribution,
  NutritionTargets,
  ScoreBreakdown,
  ScoreModifier,
} from './types';
import {
  ATWATER_FACTORS,
  FIBER_RATIO_FULL,
  FIBER_RATIO_HIGH,
  FIBER_RATIO_LOW,
  FIBER_RATIO_MID,
  GORDON_VERSION,
  KCAL_FIT_LOOSE,
  KCAL_FIT_TIGHT,
  KCAL_FIT_WIDE,
  MACRO_FIT_LOOSE_THRESHOLD,
  MACRO_FIT_TIGHT_THRESHOLD,
  MACRO_FIT_WIDE_THRESHOLD,
  SAT_FAT_RATIO_DOUBLE,
  SAT_FAT_RATIO_FULL,
  SAT_FAT_RATIO_HIGH,
  SCORE_BASE,
  SODIUM_RATIO_DOUBLE,
  SODIUM_RATIO_FULL,
  SODIUM_RATIO_HIGH,
  SUGAR_RATIO_DOUBLE,
  SUGAR_RATIO_FULL,
  SUGAR_RATIO_HIGH,
  SUGAR_RATIO_NEAR,
  assignTier,
} from './constants';

function shareForMealType(
  mealType: Meal['mealType'],
  distribution: MealDistribution,
  snacksLoggedTodayAtSaveTime: number,
): number {
  if (mealType === 'snack') {
    const cap = distribution.snackDivisorCap;
    const rawCount = snacksLoggedTodayAtSaveTime > 0 ? snacksLoggedTodayAtSaveTime : 1;
    const divisor = Math.min(rawCount, cap);
    // distribution.snack is the per-snack share at the expected default count
    // of 2 snacks per day. Total snack pool is therefore 2 * distribution.snack
    // (= 0.15 for the default 3-meals-plus-2-snacks distribution). The
    // locked-on-save divisor scales it by current snack count, capped at
    // snackDivisorCap. TODO Apply C: configurable expectedSnackCount for
    // adaptive distributions where the default count is not 2.
    const pool = distribution.snack * 2;
    return pool / divisor;
  }
  if (mealType === 'breakfast') return distribution.breakfast;
  if (mealType === 'lunch') return distribution.lunch;
  return distribution.dinner;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function macroFitNote(macroLabel: string, targetG: number, deltaPct: number): string {
  const sign = deltaPct >= 0 ? 'over' : 'under';
  const absPct = pct(Math.abs(deltaPct));
  return `${absPct} ${sign} your ${Math.round(targetG)}g ${macroLabel} target`;
}

function evaluateMacroFit(deltaPct: number): number {
  const abs = Math.abs(deltaPct);
  if (abs <= MACRO_FIT_TIGHT_THRESHOLD) return 10;
  if (abs <= MACRO_FIT_LOOSE_THRESHOLD) return 5;
  if (abs <= MACRO_FIT_WIDE_THRESHOLD) return 0;
  return -10;
}

// Prompt 177d Phase C (2026-06-07): knownNutrients is an optional 5th
// argument. When a nutrient key is explicitly false, the dependent
// modifier is marked excluded with value 0 and a note explaining the
// channel could not determine it. Existing callers that omit the
// argument get the original behavior because the helper treats missing
// or undefined keys as "known".
function isKnown(map: KnownNutrients | undefined, key: keyof KnownNutrients): boolean {
  if (!map) return true;
  const v = map[key];
  return v !== false;
}

export function scoreMeal(
  meal: Meal,
  targets: NutritionTargets,
  mealDistribution: MealDistribution,
  snacksLoggedTodayAtSaveTime: number,
  knownNutrients?: KnownNutrients,
): ScoreBreakdown {
  const share = shareForMealType(meal.mealType, mealDistribution, snacksLoggedTodayAtSaveTime);

  const proteinTargetG = targets.dailyProteinG * share;
  const carbsTargetG = targets.dailyCarbsG * share;
  const fatTargetG = targets.dailyFatTotalG * share;
  const fiberTargetG = targets.dailyFiberG * share;
  const sugarLimitG = targets.dailySugarG * share;
  const satFatLimitG = targets.dailyFatSaturatedG * share;
  const sodiumLimitMg = targets.dailySodiumMg * share;
  const kcalTarget = targets.dailyKcal * share;

  const modifiers: ScoreModifier[] = [];
  let score = SCORE_BASE;

  // Macro Fit: protein, carbs, fat. Each contributes -10 to +10. Per
  // 177d Phase C, exclude any macro whose known_nutrients flag is
  // false rather than scoring it from 0 (which would penalize a meal
  // as "10 percent under target" when the underlying value is just
  // unknown).
  if (isKnown(knownNutrients, 'protein_g')) {
    const proteinDelta = proteinTargetG > 0 ? (meal.proteinG - proteinTargetG) / proteinTargetG : 0;
    const proteinValue = evaluateMacroFit(proteinDelta);
    score += proteinValue;
    modifiers.push({
      name: 'Protein Fit',
      value: proteinValue,
      note: macroFitNote('protein', proteinTargetG, proteinDelta),
    });
  } else {
    modifiers.push({
      name: 'Protein Fit',
      value: 0,
      note: 'Protein not determinable; excluded from score',
      excluded: true,
    });
  }

  if (isKnown(knownNutrients, 'carbs_g')) {
    const carbsDelta = carbsTargetG > 0 ? (meal.carbsG - carbsTargetG) / carbsTargetG : 0;
    const carbsValue = evaluateMacroFit(carbsDelta);
    score += carbsValue;
    modifiers.push({
      name: 'Carb Fit',
      value: carbsValue,
      note: macroFitNote('carb', carbsTargetG, carbsDelta),
    });
  } else {
    modifiers.push({
      name: 'Carb Fit',
      value: 0,
      note: 'Carbs not determinable; excluded from score',
      excluded: true,
    });
  }

  if (isKnown(knownNutrients, 'fat_total_g')) {
    const fatDelta = fatTargetG > 0 ? (meal.fatTotalG - fatTargetG) / fatTargetG : 0;
    const fatValue = evaluateMacroFit(fatDelta);
    score += fatValue;
    modifiers.push({
      name: 'Fat Fit',
      value: fatValue,
      note: macroFitNote('fat', fatTargetG, fatDelta),
    });
  } else {
    modifiers.push({
      name: 'Fat Fit',
      value: 0,
      note: 'Fat not determinable; excluded from score',
      excluded: true,
    });
  }

  // Fiber Bonus: 0 to +15. Excluded entirely if fiber was not
  // determinable on the originating channel.
  if (isKnown(knownNutrients, 'fiber_g')) {
    const fiberRatio = fiberTargetG > 0 ? meal.fiberG / fiberTargetG : 0;
    let fiberBonus = 0;
    if (fiberRatio >= FIBER_RATIO_FULL) fiberBonus = 15;
    else if (fiberRatio >= FIBER_RATIO_HIGH) fiberBonus = 10;
    else if (fiberRatio >= FIBER_RATIO_MID) fiberBonus = 5;
    else if (fiberRatio >= FIBER_RATIO_LOW) fiberBonus = 2;
    score += fiberBonus;
    modifiers.push({
      name: 'Fiber Bonus',
      value: fiberBonus,
      note: `${meal.fiberG.toFixed(1)}g of ${fiberTargetG.toFixed(1)}g target`,
    });
  } else {
    modifiers.push({
      name: 'Fiber Bonus',
      value: 0,
      note: 'Fiber not determinable; excluded from score',
      excluded: true,
    });
  }

  // Sugar Penalty: 0 to -20. Excluded entirely if sugar was not
  // determinable on the originating channel.
  if (isKnown(knownNutrients, 'sugar_g')) {
    const sugarRatio = sugarLimitG > 0 ? meal.sugarG / sugarLimitG : 0;
    let sugarPenalty = 0;
    if (sugarRatio >= SUGAR_RATIO_DOUBLE) sugarPenalty = -20;
    else if (sugarRatio >= SUGAR_RATIO_HIGH) sugarPenalty = -15;
    else if (sugarRatio >= SUGAR_RATIO_FULL) sugarPenalty = -10;
    else if (sugarRatio >= SUGAR_RATIO_NEAR) sugarPenalty = -5;
    score += sugarPenalty;
    modifiers.push({
      name: 'Sugar Penalty',
      value: sugarPenalty,
      note:
        sugarPenalty === 0
          ? 'Total sugar from all sources, including natural fruit and dairy, within range'
          : 'Total sugar from all sources, including natural fruit and dairy, over per-meal guidance',
    });
  } else {
    modifiers.push({
      name: 'Sugar Penalty',
      value: 0,
      note: 'Sugar not determinable; excluded from score',
      excluded: true,
    });
  }

  // Saturated Fat Penalty: 0 to -15. Sat fat = max(0, fat_total - fat_healthy).
  // Excluded only when total fat OR healthy-fat split is not determinable.
  if (isKnown(knownNutrients, 'fat_total_g') && isKnown(knownNutrients, 'fat_healthy_g')) {
    const satFat = Math.max(0, meal.fatTotalG - meal.fatHealthyG);
    const satFatRatio = satFatLimitG > 0 ? satFat / satFatLimitG : 0;
    let satFatPenalty = 0;
    if (satFatRatio >= SAT_FAT_RATIO_DOUBLE) satFatPenalty = -15;
    else if (satFatRatio >= SAT_FAT_RATIO_HIGH) satFatPenalty = -10;
    else if (satFatRatio >= SAT_FAT_RATIO_FULL) satFatPenalty = -5;
    score += satFatPenalty;
    modifiers.push({
      name: 'Saturated Fat Penalty',
      value: satFatPenalty,
      note:
        satFatPenalty === 0
          ? 'Within healthy range'
          : `${satFat.toFixed(1)}g saturated fat vs ${satFatLimitG.toFixed(1)}g limit`,
    });
  } else {
    modifiers.push({
      name: 'Saturated Fat Penalty',
      value: 0,
      note: 'Saturated fat not determinable; excluded from score',
      excluded: true,
    });
  }

  // Sodium Penalty: 0 to -15. The canonical "not determinable" macro on
  // the text channel. When excluded, the breakdown explicitly says so
  // rather than letting a silent zero read as "within guidance".
  if (isKnown(knownNutrients, 'sodium_mg')) {
    const sodiumRatio = sodiumLimitMg > 0 ? meal.sodiumMg / sodiumLimitMg : 0;
    let sodiumPenalty = 0;
    if (sodiumRatio >= SODIUM_RATIO_DOUBLE) sodiumPenalty = -15;
    else if (sodiumRatio >= SODIUM_RATIO_HIGH) sodiumPenalty = -10;
    else if (sodiumRatio >= SODIUM_RATIO_FULL) sodiumPenalty = -5;
    score += sodiumPenalty;
    modifiers.push({
      name: 'Sodium Penalty',
      value: sodiumPenalty,
      note:
        sodiumPenalty === 0
          ? 'Within sodium guidance'
          : `${Math.round(meal.sodiumMg)}mg vs ${Math.round(sodiumLimitMg)}mg limit`,
    });
  } else {
    modifiers.push({
      name: 'Sodium Penalty',
      value: 0,
      note: 'Sodium not determinable; excluded from score',
      excluded: true,
    });
  }

  // Whole Food Bonus: 0 to +10. whole_food_flag wins; else inspect ingredient
  // list ratio when array shaped.
  let wholeFoodBonus = 0;
  let wholeFoodNote = 'Whole-food signal absent';
  if (meal.wholeFoodFlag === true) {
    wholeFoodBonus = 10;
    wholeFoodNote = 'Whole-food meal';
  } else if (Array.isArray(meal.ingredientsList) && meal.ingredientsList.length > 0) {
    const list = meal.ingredientsList as Array<{ whole?: boolean }>;
    const wholeCount = list.filter((item) => item && item.whole === true).length;
    const ratio = wholeCount / list.length;
    if (ratio >= 0.8) {
      wholeFoodBonus = 7;
      wholeFoodNote = 'Mostly whole foods detected';
    } else if (ratio >= 0.5) {
      wholeFoodBonus = 4;
      wholeFoodNote = 'Half whole foods detected';
    }
  }
  score += wholeFoodBonus;
  modifiers.push({
    name: 'Whole Food Bonus',
    value: wholeFoodBonus,
    note: wholeFoodNote,
  });

  // Calorie Fit: -5 to +5. Auto-recompute via Atwater when meal.caloriesAutoCalc.
  const loggedKcal = meal.caloriesAutoCalc
    ? meal.proteinG * ATWATER_FACTORS.protein +
      meal.carbsG * ATWATER_FACTORS.carbs +
      meal.fatTotalG * ATWATER_FACTORS.fat
    : meal.caloriesKcal;
  const kcalDeltaPct = kcalTarget > 0 ? Math.abs(loggedKcal - kcalTarget) / kcalTarget : 0;
  let kcalValue = 0;
  if (kcalDeltaPct <= KCAL_FIT_TIGHT) kcalValue = 5;
  else if (kcalDeltaPct <= KCAL_FIT_LOOSE) kcalValue = 0;
  else if (kcalDeltaPct <= KCAL_FIT_WIDE) kcalValue = -2;
  else kcalValue = -5;
  score += kcalValue;
  modifiers.push({
    name: 'Calorie Fit',
    value: kcalValue,
    note: `${pct(kcalDeltaPct)} ${loggedKcal >= kcalTarget ? 'over' : 'under'} per-meal kcal target`,
  });

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const tier = assignTier(finalScore);

  return {
    final_score: finalScore,
    tier,
    base: SCORE_BASE,
    modifiers,
    calculated_at: new Date(Date.now()).toISOString(),
    gordon_version: GORDON_VERSION,
  };
}
