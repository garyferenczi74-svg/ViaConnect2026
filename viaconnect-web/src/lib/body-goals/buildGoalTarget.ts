// Prompt 179: orchestrates the energy engine + the shared macro split + added
// sugar + hydration into one persistable daily target. PURE given resolved
// inputs (the caller fetches weight, profile, and logged-window stats). The
// recalibration path passes tdeeOverride (the adaptive TDEE); the initial plan
// passes null and the engine derives TDEE from BMR * activity.

import { lbsToKg } from '@/lib/weight-goals/guardrails';
import { resolveLeanBodyMass } from '@/lib/gordon/lbm';
import { deriveMacroSplit } from '@/lib/gordon/macroSplit';
import { personalizeHydrationTarget } from '@/lib/nutrition/hydration/target-personalizer';
import type { BiologicalSex } from '@/lib/gordon/generateMacroTargets';
import type { DietaryChoice } from '@/lib/gordon/macro-config';
import type { GoalDirection } from '@/lib/weight-goals/accessor';
import { computeBmr, computeInitialTdee, solveCalorieTarget, type BmrResult } from './energy';
import { goalToHydrationActivity } from './activity';
import type { BuiltGoalTarget, GoalActivityLevel, GoalDriver, TargetSource } from './types';

const IN_TO_CM = 2.54;
const ADDED_SUGAR_PCT = 0.10; // 10 percent of calories ceiling (Section 5.5)

export interface BuildGoalTargetInput {
  driver: GoalDriver;
  targetRateLbPerWeek: number | null;
  targetDate: string | null;
  startWeightLb: number;
  goalWeightLb: number;
  startDate: string;
  latestWeightLb: number;
  bodyFatPct: number | null;
  heightIn: number | null;
  age: number | null;
  sex: BiologicalSex | null;
  activityLevel: GoalActivityLevel | null;
  dietaryChoice: DietaryChoice | null;
  effectiveDate: string;
  source: TargetSource;
  tdeeOverride: number | null; // recalibration passes the adaptive TDEE
  priorTdee: number | null;
}

export type BuildGoalTargetResult =
  | { ok: false; reason: 'setup_required'; missing: string[] }
  | { ok: true; target: BuiltGoalTarget };

export function buildGoalTarget(input: BuildGoalTargetInput): BuildGoalTargetResult {
  const missing: string[] = [];
  if (!(input.latestWeightLb > 0)) missing.push('currentWeight');
  if (!input.heightIn || input.heightIn <= 0) missing.push('height');
  if (input.tdeeOverride === null && (input.age === null || input.age <= 0)) missing.push('age');

  const sex: BiologicalSex = input.sex ?? 'unspecified';
  const weightKg = lbsToKg(input.latestWeightLb > 0 ? input.latestWeightLb : 0);
  const heightCm = (input.heightIn ?? 0) * IN_TO_CM;
  const lbm = resolveLeanBodyMass({
    weightKg,
    heightCm,
    biologicalSex: sex,
    bodyFatFraction:
      input.bodyFatPct !== null && input.bodyFatPct > 0 ? input.bodyFatPct / 100 : null,
  });

  let bmrResult: BmrResult | null = null;
  if (input.tdeeOverride === null) {
    bmrResult = computeBmr({ lbm, weightKg, heightCm, age: input.age ?? 0, sex });
    if (bmrResult === null) missing.push('bmrInputs');
  }
  if (missing.length > 0) return { ok: false, reason: 'setup_required', missing };

  const tdee = input.tdeeOverride ?? computeInitialTdee(bmrResult!.bmr, input.activityLevel);

  const solved = solveCalorieTarget({
    tdee,
    driver: input.driver,
    targetRateLbPerWeek: input.targetRateLbPerWeek,
    targetDate: input.targetDate,
    startWeightLb: input.startWeightLb,
    goalWeightLb: input.goalWeightLb,
    startDate: input.startDate,
    sex,
    currentWeightLb: input.latestWeightLb,
  });

  const direction: GoalDirection = solved.direction;
  const split = deriveMacroSplit({
    calorieTargetKcal: solved.calorieTargetKcal,
    direction,
    // lbm is non-null whenever weight + height are valid, which the missing
    // gate above guarantees; the fallback is defensive only.
    lbmKg: lbm ? lbm.lbmKg : weightKg * 0.75,
    currentWeightKg: weightKg,
    dietaryChoice: input.dietaryChoice ?? 'balanced',
  });

  const addedSugarLimitG = Math.round((ADDED_SUGAR_PCT * solved.calorieTargetKcal) / 4);
  const hydrationMl = personalizeHydrationTarget({
    body_weight_kg: weightKg,
    custom_target_ml_per_day: null,
    activity_level: goalToHydrationActivity(input.activityLevel),
  });

  return {
    ok: true,
    target: {
      effectiveDate: input.effectiveDate,
      source: input.source,
      // 179 Section 4.2: estimated_tdee_kcal stays NULL until it is data-derived
      // (recalibration). The initial plan TDEE is recorded in rationale only.
      estimatedTdeeKcal: input.tdeeOverride !== null ? Math.round(input.tdeeOverride) : null,
      calorieTargetKcal: solved.calorieTargetKcal,
      proteinG: Math.round(split.proteinG),
      fatG: Math.round(split.fatG),
      carbG: Math.round(split.carbG),
      fiberG: split.fiberG,
      addedSugarLimitG,
      hydrationMl,
      rationale: {
        bmrMethod: input.tdeeOverride !== null ? 'tdee_override' : bmrResult!.method,
        tdee: Math.round(tdee),
        direction,
        effectiveRateLbPerWeek: solved.effectiveRateLbPerWeek,
        clamps: solved.clamps,
        lbmKg: lbm ? Math.round(lbm.lbmKg * 10) / 10 : null,
        lbmSource: lbm ? lbm.source : null,
        macroClamps: split.clamps,
        projectedDate: solved.projectedDate,
      },
      projectedDate: solved.projectedDate,
    },
  };
}
