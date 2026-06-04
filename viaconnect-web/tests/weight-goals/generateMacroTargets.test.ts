// Prompt 173 Phase 4 + Prompt 173a Phase 8 (rebuild on main 2026-06-03):
// generateMacroTargets math. Covers Section 5.3 Steps 1-6 (Mifflin-St Jeor +
// TDEE + calorie clamps) AND the 173a Section 5 amendments (lean-mass
// protein, per-diet fat split, keto inversion, fiber 14g/1000kcal of the
// calorie target).

import { describe, it, expect } from 'vitest';
import {
  generateMacroTargets,
  type GenerateMacroTargetsInput,
} from '@/lib/gordon/generateMacroTargets';
import { MACRO_CONFIG, ACTIVITY_MULTIPLIERS, LBS_PER_KG_MACRO } from '@/lib/gordon/macro-config';
import { resolveLeanBodyMass } from '@/lib/gordon/lbm';

// Canonical baseline: 80 kg / 180 cm / 35 male / moderately_active +
// estimated LBM (Boer) + balanced diet. The Boer male estimate for this
// body is 0.407*80 + 0.267*180 - 19.2 = 32.56 + 48.06 - 19.2 = 61.42 kg
// (135.45 lbs).
function baseInput(): GenerateMacroTargetsInput {
  const body = {
    currentWeightKg: 80,
    heightCm: 180,
    age: 35,
    biologicalSex: 'male' as const,
  };
  const lbm = resolveLeanBodyMass({
    weightKg: body.currentWeightKg,
    heightCm: body.heightCm,
    biologicalSex: body.biologicalSex,
    bodyFatFraction: null,
  });
  return {
    body,
    activityLevel: 'moderately_active',
    weightGoal: { goalWeightKg: 78, goalDirection: 'maintain' },
    leanBodyMass: lbm,
    dietaryChoice: 'balanced',
    safety: { deSafetyActive: false },
  };
}

describe('generateMacroTargets: missing-input gate (Section 5.2)', () => {
  it('returns estimate_unavailable when body is null', () => {
    const r = generateMacroTargets({ ...baseInput(), body: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain('currentWeightKg');
  });

  it('returns estimate_unavailable when activityLevel is null', () => {
    const r = generateMacroTargets({ ...baseInput(), activityLevel: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain('activityLevel');
  });

  it('returns estimate_unavailable when leanBodyMass is null', () => {
    const r = generateMacroTargets({ ...baseInput(), leanBodyMass: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain('leanBodyMass');
  });

  it('returns estimate_unavailable when dietaryChoice is null', () => {
    const r = generateMacroTargets({ ...baseInput(), dietaryChoice: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain('dietaryChoice');
  });
});

describe('generateMacroTargets: BMR Mifflin-St Jeor (Step 1)', () => {
  it('male: 10*80 + 6.25*180 - 5*35 + 5 = 1755', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.basis.bmr).toBeCloseTo(1755, 1);
  });

  it('female: -161 sex term', () => {
    const body = { currentWeightKg: 60, heightCm: 165, age: 30, biologicalSex: 'female' as const };
    const lbm = resolveLeanBodyMass({
      weightKg: body.currentWeightKg,
      heightCm: body.heightCm,
      biologicalSex: body.biologicalSex,
      bodyFatFraction: null,
    });
    const r = generateMacroTargets({
      body,
      activityLevel: 'sedentary',
      weightGoal: { goalWeightKg: 60, goalDirection: 'maintain' },
      leanBodyMass: lbm,
      dietaryChoice: 'balanced',
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.bmr).toBeCloseTo(1320.3, 1);
      expect(r.basis.sexEstimated).toBe(false);
    }
  });

  it('unspecified: -78 averaged sex term + sexEstimated flag', () => {
    const body = { currentWeightKg: 75, heightCm: 175, age: 40, biologicalSex: 'unspecified' as const };
    const lbm = resolveLeanBodyMass({
      weightKg: body.currentWeightKg,
      heightCm: body.heightCm,
      biologicalSex: body.biologicalSex,
      bodyFatFraction: null,
    });
    const r = generateMacroTargets({
      body,
      activityLevel: 'moderately_active',
      weightGoal: { goalWeightKg: 75, goalDirection: 'maintain' },
      leanBodyMass: lbm,
      dietaryChoice: 'balanced',
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.bmr).toBeCloseTo(1565.8, 1);
      expect(r.basis.sexEstimated).toBe(true);
    }
  });
});

describe('generateMacroTargets: TDEE + Maintain (Steps 2-3)', () => {
  it('TDEE = BMR * activity multiplier; Maintain target equals TDEE', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.tdee).toBeCloseTo(2720.3, 1);
      expect(r.basis.activityMultiplier).toBe(ACTIVITY_MULTIPLIERS.moderately_active);
      expect(r.targets.calorieTargetKcal).toBe(2720);
      expect(r.basis.effectiveDirection).toBe('maintain');
    }
  });
});

describe('generateMacroTargets: 173a protein basis (0.8 g/lb LBM * goal multiplier)', () => {
  // The engine uses the raw (unrounded) LBM from resolveLeanBodyMass for
  // protein, then rounds the final protein value to 1 decimal. We compute
  // expected against the unrounded LBM (61.42 kg for the canonical fixture)
  // to avoid round-then-multiply drift.
  const RAW_LBM_KG_MALE_80_180 = 0.407 * 80 + 0.267 * 180 - 19.2; // 61.42

  it('Maintain: 0.8 * 0.8 * LBM_lbs', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      const expected = Math.round(0.8 * 0.8 * RAW_LBM_KG_MALE_80_180 * LBS_PER_KG_MACRO * 10) / 10;
      expect(r.targets.proteinG).toBeCloseTo(expected, 1);
    }
  });

  it('Lose: applies the 0.9 multiplier', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 75, goalDirection: 'lose' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const expected = Math.round(0.8 * 0.9 * RAW_LBM_KG_MALE_80_180 * LBS_PER_KG_MACRO * 10) / 10;
      expect(r.targets.proteinG).toBeCloseTo(expected, 1);
    }
  });

  it('Gain: applies the 1.0 multiplier', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 84, goalDirection: 'gain' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const expected = Math.round(0.8 * 1.0 * RAW_LBM_KG_MALE_80_180 * LBS_PER_KG_MACRO * 10) / 10;
      expect(r.targets.proteinG).toBeCloseTo(expected, 1);
    }
  });

  it('uses MEASURED LBM when bodyFatFraction is provided', () => {
    const body = { currentWeightKg: 80, heightCm: 180, age: 35, biologicalSex: 'male' as const };
    const lbm = resolveLeanBodyMass({
      weightKg: body.currentWeightKg,
      heightCm: body.heightCm,
      biologicalSex: body.biologicalSex,
      bodyFatFraction: 0.20,
    });
    const r = generateMacroTargets({
      body,
      activityLevel: 'moderately_active',
      weightGoal: { goalWeightKg: 78, goalDirection: 'maintain' },
      leanBodyMass: lbm,
      dietaryChoice: 'balanced',
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Measured LBM = 80 * (1 - 0.20) = 64 kg = 141.10 lbs.
      expect(r.basis.lbmKg).toBeCloseTo(64, 0);
      expect(r.basis.lbmSource).toBe('measured');
      expect(r.basis.bodyFatFraction).toBeCloseTo(0.20, 5);
    }
  });
});

describe('generateMacroTargets: per-diet fat split (173a 5.3)', () => {
  it('balanced uses 30% of calorie target', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 2720 * 0.30 / 9 = 90.67 g. Allow tolerance for hormonal-floor
      // interactions; 80 kg * 0.6 = 48 g, well below 90.67.
      expect(r.targets.fatG).toBeCloseTo(90.7, 1);
    }
  });

  it('mediterranean uses 35% of calorie target', () => {
    const r = generateMacroTargets({ ...baseInput(), dietaryChoice: 'mediterranean' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 2720 * 0.35 / 9 = 105.78 g.
      expect(r.targets.fatG).toBeCloseTo(105.8, 1);
    }
  });

  it('higher_carb uses 25% of calorie target', () => {
    const r = generateMacroTargets({ ...baseInput(), dietaryChoice: 'higher_carb' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 2720 * 0.25 / 9 = 75.56 g.
      expect(r.targets.fatG).toBeCloseTo(75.6, 1);
    }
  });

  it('plant_based follows the balanced split (per 173a 4.2)', () => {
    const balanced = generateMacroTargets(baseInput());
    const plant = generateMacroTargets({ ...baseInput(), dietaryChoice: 'plant_based' });
    expect(balanced.ok && plant.ok).toBe(true);
    if (balanced.ok && plant.ok) {
      expect(plant.targets.fatG).toBeCloseTo(balanced.targets.fatG, 1);
    }
  });
});

describe('generateMacroTargets: low-carb cap + reallocation', () => {
  it('caps carbs at 25% of calorie target and routes freed calories to fat', () => {
    const r = generateMacroTargets({ ...baseInput(), dietaryChoice: 'low_carb' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const carbKcal = r.targets.carbG * 4;
      const capKcal = r.targets.calorieTargetKcal * MACRO_CONFIG.low_carb_cap_pct;
      // Carbs at the cap (within rounding); fat above the 40% pre-cap base.
      expect(carbKcal).toBeLessThanOrEqual(capKcal + 1);
      const fat40Pct = (r.targets.calorieTargetKcal * MACRO_CONFIG.fat_pct_low_carb) / 9;
      // Fat got the reallocation, so fat_g > 40% baseline.
      expect(r.targets.fatG).toBeGreaterThan(fat40Pct);
      expect(r.basis.clampsFired).toContain('low_carb_cap');
    }
  });
});

describe('generateMacroTargets: keto inversion (173a 5.3)', () => {
  it('anchors carbs at keto_carb_cap_g and lets fat be the balancer', () => {
    const r = generateMacroTargets({ ...baseInput(), dietaryChoice: 'keto' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.targets.carbG).toBe(MACRO_CONFIG.keto_carb_cap_g);
      expect(r.basis.clampsFired).toContain('keto_carb_cap');
      expect(r.basis.effectiveDietaryChoice).toBe('keto');
      // Atwater reconciliation should hold within rounding.
      const totalKcal = r.targets.proteinG * 4 + r.targets.carbG * 4 + r.targets.fatG * 9;
      expect(Math.abs(totalKcal - r.targets.calorieTargetKcal)).toBeLessThanOrEqual(3);
    }
  });

  it('conservative path overrides keto to balanced (173a Section 9)', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      dietaryChoice: 'keto',
      safety: { deSafetyActive: true },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.conservativePath).toBe(true);
      expect(r.basis.effectiveDietaryChoice).toBe('balanced');
      // Carbs should NOT be capped at 30g; the diet inversion is suppressed.
      expect(r.targets.carbG).toBeGreaterThan(MACRO_CONFIG.keto_carb_cap_g);
    }
  });
});

describe('generateMacroTargets: fiber (173a 6, 14g per 1000 kcal of target)', () => {
  it('Maintain at 2720 kcal -> ~38 g fiber', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 14 * 2720 / 1000 = 38.08 -> rounded 38.
      expect(r.targets.fiberG).toBe(38);
    }
  });

  it('Lose at 2231 kcal -> ~31 g fiber', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 76, goalDirection: 'lose' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 14 * 2231 / 1000 = 31.23 -> 31.
      expect(r.targets.fiberG).toBe(31);
    }
  });
});

describe('generateMacroTargets: safety paths (Section 5.5)', () => {
  it('DE safe mode active forces conservative maintenance', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 70, goalDirection: 'lose' },
      safety: { deSafetyActive: true },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.conservativePath).toBe(true);
      expect(r.basis.conservativeReason).toBe('de_safety_mode');
      expect(r.basis.effectiveDirection).toBe('maintain');
    }
  });

  it('under-18 routes to conservative path', () => {
    const body = { currentWeightKg: 60, heightCm: 170, age: 16, biologicalSex: 'male' as const };
    const lbm = resolveLeanBodyMass({
      weightKg: body.currentWeightKg,
      heightCm: body.heightCm,
      biologicalSex: body.biologicalSex,
      bodyFatFraction: null,
    });
    const r = generateMacroTargets({
      body,
      activityLevel: 'moderately_active',
      weightGoal: { goalWeightKg: 55, goalDirection: 'lose' },
      leanBodyMass: lbm,
      dietaryChoice: 'balanced',
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.conservativeReason).toBe('under_18');
      expect(r.basis.effectiveDirection).toBe('maintain');
    }
  });
});

describe('generateMacroTargets: Atwater reconciliation', () => {
  it('protein*4 + carb*4 + fat*9 reconciles to calorie target across all diets', () => {
    for (const diet of ['balanced', 'mediterranean', 'low_carb', 'higher_carb', 'plant_based'] as const) {
      const r = generateMacroTargets({ ...baseInput(), dietaryChoice: diet });
      expect(r.ok).toBe(true);
      if (r.ok) {
        const totalKcal = r.targets.proteinG * 4 + r.targets.carbG * 4 + r.targets.fatG * 9;
        // 4 kcal tolerance: 1-decimal rounding on each macro + integer
        // rounding on calorie target.
        expect(Math.abs(totalKcal - r.targets.calorieTargetKcal)).toBeLessThanOrEqual(4);
      }
    }
  });

  it('emits no negative macro', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.targets.proteinG).toBeGreaterThanOrEqual(0);
      expect(r.targets.carbG).toBeGreaterThanOrEqual(0);
      expect(r.targets.fatG).toBeGreaterThanOrEqual(0);
      expect(r.targets.fiberG).toBeGreaterThanOrEqual(0);
    }
  });
});
