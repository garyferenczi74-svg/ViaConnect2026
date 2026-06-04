// Prompt 173 Phase 4 (rebuild on main 2026-06-03): generateMacroTargets math.
//
// Covers Section 5.3 Steps 1-6 and Section 5.5 safety paths. Reference
// fixtures are chosen so the expected numbers are derivable by hand:
//   * 80 kg / 180 cm / 35 / male / moderately_active is the canonical
//     "typical adult Lose" fixture.
//   * 60 kg / 165 cm / 30 / female / sedentary anchors the female calorie
//     floor + lower-weight Maintain path.
//   * 75 kg / 175 cm / 40 / unspecified exercises the -78 sex-term branch.

import { describe, it, expect } from 'vitest';
import {
  generateMacroTargets,
  type GenerateMacroTargetsInput,
} from '@/lib/gordon/generateMacroTargets';
import { MACRO_CONFIG, ACTIVITY_MULTIPLIERS } from '@/lib/gordon/macro-config';

function baseInput(): GenerateMacroTargetsInput {
  return {
    body: {
      currentWeightKg: 80,
      heightCm: 180,
      age: 35,
      biologicalSex: 'male',
    },
    activityLevel: 'moderately_active',
    weightGoal: { goalWeightKg: 78, goalDirection: 'maintain' },
    safety: { deSafetyActive: false },
  };
}

describe('generateMacroTargets: missing-input gate (Section 5.2)', () => {
  it('returns estimate_unavailable when body is null', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      body: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('estimate_unavailable');
      expect(r.missing).toContain('currentWeightKg');
    }
  });

  it('returns estimate_unavailable when activityLevel is null', () => {
    const r = generateMacroTargets({ ...baseInput(), activityLevel: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain('activityLevel');
  });

  it('returns estimate_unavailable when weightGoal is null', () => {
    const r = generateMacroTargets({ ...baseInput(), weightGoal: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(expect.arrayContaining(['goalWeightKg', 'goalDirection']));
  });

  it('reports every missing field at once so the UI can pinpoint', () => {
    const r = generateMacroTargets({
      body: null,
      activityLevel: null,
      weightGoal: null,
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing.length).toBeGreaterThanOrEqual(5);
  });
});

describe('generateMacroTargets: BMR Mifflin-St Jeor (Step 1)', () => {
  it('male: 10*kg + 6.25*cm - 5*age + 5', () => {
    // 10*80 + 6.25*180 - 5*35 + 5 = 800 + 1125 - 175 + 5 = 1755
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.basis.bmr).toBeCloseTo(1755, 1);
  });

  it('female: -161 sex term', () => {
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    const r = generateMacroTargets({
      body: { currentWeightKg: 60, heightCm: 165, age: 30, biologicalSex: 'female' },
      activityLevel: 'sedentary',
      weightGoal: { goalWeightKg: 60, goalDirection: 'maintain' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.bmr).toBeCloseTo(1320.3, 1);
      expect(r.basis.sexEstimated).toBe(false);
    }
  });

  it('unspecified: -78 sex term + sexEstimated flag', () => {
    // 10*75 + 6.25*175 - 5*40 - 78 = 750 + 1093.75 - 200 - 78 = 1565.75
    const r = generateMacroTargets({
      body: { currentWeightKg: 75, heightCm: 175, age: 40, biologicalSex: 'unspecified' },
      activityLevel: 'moderately_active',
      weightGoal: { goalWeightKg: 75, goalDirection: 'maintain' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.bmr).toBeCloseTo(1565.8, 1);
      expect(r.basis.sexEstimated).toBe(true);
    }
  });
});

describe('generateMacroTargets: TDEE + Maintain path (Steps 2-3)', () => {
  it('TDEE = BMR * activity multiplier; Maintain target equals TDEE', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 1755 * 1.55 = 2720.25
      expect(r.basis.tdee).toBeCloseTo(2720.3, 1);
      expect(r.basis.activityMultiplier).toBe(ACTIVITY_MULTIPLIERS.moderately_active);
      expect(r.targets.calorieTargetKcal).toBe(2720);
      expect(r.basis.effectiveDirection).toBe('maintain');
      expect(r.basis.clampsFired).toEqual([]);
    }
  });
});

describe('generateMacroTargets: Lose path + deficit cap + calorie floor', () => {
  it('applies the 18% deficit when under the absolute cap', () => {
    // TDEE 2720.25, deficit 0.18 -> 2230.6, no cap fires (deficit 489.6 < 600)
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 75, goalDirection: 'lose' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.targets.calorieTargetKcal).toBeCloseTo(2231, 0);
      expect(r.basis.clampsFired).not.toContain('deficit_cap');
    }
  });

  it('clamps the deficit at max_deficit_kcal when it would exceed', () => {
    // Force a high TDEE so 18% deficit > 600 kcal: very_active male 95 kg, 180 cm, 30
    // BMR = 10*95 + 6.25*180 - 5*30 + 5 = 950 + 1125 - 150 + 5 = 1930
    // TDEE = 1930 * 1.725 = 3329.25; 18% = 599.265, just under cap.
    // Bump to extra_active to push past: TDEE = 1930 * 1.9 = 3667; 18% = 660
    const r = generateMacroTargets({
      body: { currentWeightKg: 95, heightCm: 180, age: 30, biologicalSex: 'male' },
      activityLevel: 'extra_active',
      weightGoal: { goalWeightKg: 90, goalDirection: 'lose' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.clampsFired).toContain('deficit_cap');
      // Capped: target = TDEE - 600 = 3067
      expect(r.targets.calorieTargetKcal).toBeCloseTo(3067, 0);
    }
  });

  it('raises the calorie target to the effective floor (max sex floor, BMR)', () => {
    // Force a tiny TDEE so 18% deficit drops below the female 1200 floor.
    // 45 kg / 150 cm / 60 female sedentary: BMR = 450 + 937.5 - 300 - 161 = 926.5
    // TDEE = 926.5 * 1.2 = 1111.8; 18% deficit = 200.1, target 911.7
    // Effective floor = max(1200, BMR 926.5) = 1200 -> target raised to 1200.
    const r = generateMacroTargets({
      body: { currentWeightKg: 45, heightCm: 150, age: 60, biologicalSex: 'female' },
      activityLevel: 'sedentary',
      weightGoal: { goalWeightKg: 44, goalDirection: 'lose' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.clampsFired).toContain('calorie_floor');
      expect(r.targets.calorieTargetKcal).toBe(MACRO_CONFIG.calorie_floor_female);
      expect(r.basis.effectiveFloorKcal).toBe(MACRO_CONFIG.calorie_floor_female);
    }
  });
});

describe('generateMacroTargets: Gain path + surplus cap', () => {
  it('applies the 12% surplus when under the absolute cap', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 84, goalDirection: 'gain' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // TDEE 2720.25, surplus 12% = 326.4, target 3046.7
      expect(r.targets.calorieTargetKcal).toBeCloseTo(3047, 0);
      expect(r.basis.clampsFired).not.toContain('surplus_cap');
    }
  });

  it('clamps the surplus at max_surplus_kcal when it would exceed', () => {
    // Very large user where 12% surplus > 500 kcal cap.
    // 120 kg / 190 / 25 male extra_active:
    // BMR = 1200 + 1187.5 - 125 + 5 = 2267.5
    // TDEE = 2267.5 * 1.9 = 4308.25; 12% = 517 > 500.
    const r = generateMacroTargets({
      body: { currentWeightKg: 120, heightCm: 190, age: 25, biologicalSex: 'male' },
      activityLevel: 'extra_active',
      weightGoal: { goalWeightKg: 125, goalDirection: 'gain' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.clampsFired).toContain('surplus_cap');
      expect(r.targets.calorieTargetKcal).toBeCloseTo(4308 + 500, 0);
    }
  });
});

describe('generateMacroTargets: protein reference weight choice (Step 4)', () => {
  it('uses goal weight on Lose path', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 70, goalDirection: 'lose' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.basis.referenceWeightKg).toBe(70);
  });

  it('uses current weight on Maintain path', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 80, goalDirection: 'maintain' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.basis.referenceWeightKg).toBe(80);
  });

  it('uses goal weight on Gain path', () => {
    const r = generateMacroTargets({
      ...baseInput(),
      weightGoal: { goalWeightKg: 85, goalDirection: 'gain' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.basis.referenceWeightKg).toBe(85);
  });
});

describe('generateMacroTargets: protein 40% ceiling clamp', () => {
  it('fires protein_pct_ceiling when 2.0 g/kg on Lose would exceed 40% of target', () => {
    // 100 kg lose with very small calorie target (highly capped) -> 2.0*100 = 200 g
    // 200 * 4 = 800 kcal protein. If target ~1500 kcal, 40% ceiling = 600. Triggered.
    // To engineer this: low TDEE (small / inactive user) with goal weight HIGH so
    // reference weight is high. Easier: heavier user on female floor.
    // 90 kg female extra_active, goal 85 (Lose): BMR = 900 + 1100 - 175 - 161 = 1664
    // TDEE = 1664 * 1.9 = 3161.6; 18% deficit = 569 < 600, target 2592.6.
    // Protein = 2.0 * 85 = 170 g; protein kcal = 680; 40% of 2593 = 1037. NOT triggered.
    // We need protein-to-kcal ratio > 0.40. Lower kcal/higher protein.
    // Force calorie_floor: 50 kg female sedentary lose 40 (goal). BMR = 500+1031.25-150-161 = 1220.25
    // TDEE = 1464.3; deficit 18% = 263.6, target 1200 (floor binds).
    // Protein 2.0 * 40 = 80 g; protein kcal = 320; 40% of 1200 = 480. Not triggered.
    // Try goal 70: protein 2.0*70 = 140; protein kcal 560 > 480. Triggered.
    const r = generateMacroTargets({
      body: { currentWeightKg: 50, heightCm: 165, age: 30, biologicalSex: 'female' },
      activityLevel: 'sedentary',
      weightGoal: { goalWeightKg: 70, goalDirection: 'lose' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Goal weight 70 > current 50 with goalDirection 'lose' is unusual but the
      // engine is order-driven; the test exercises the ceiling regardless.
      expect(r.basis.clampsFired).toContain('protein_pct_ceiling');
      const proteinKcal = r.targets.proteinG * 4;
      expect(proteinKcal).toBeLessThanOrEqual(r.targets.calorieTargetKcal * MACRO_CONFIG.protein_max_pct_of_kcal + 1);
    }
  });
});

describe('generateMacroTargets: fat hormonal floor (Step 5)', () => {
  it('raises fat to min_fat_g_per_kg * current_weight when 28% would be lower', () => {
    // Heavier user on low-calorie deficit path; 28% of small target * /9 may be
    // below 0.6 * current. 100 kg current, calorie floor 1500:
    // 28% of 1500 / 9 = 46.67 g fat; min = 0.6 * 100 = 60 g -> hormonal floor fires.
    const r = generateMacroTargets({
      body: { currentWeightKg: 100, heightCm: 180, age: 50, biologicalSex: 'male' },
      activityLevel: 'sedentary',
      weightGoal: { goalWeightKg: 80, goalDirection: 'lose' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const hormonalMin = MACRO_CONFIG.min_fat_g_per_kg * 100;
      expect(r.targets.fatG).toBeGreaterThanOrEqual(hormonalMin);
      if (r.targets.fatG === hormonalMin) {
        expect(r.basis.clampsFired).toContain('fat_hormonal_floor');
      }
    }
  });
});

describe('generateMacroTargets: macro reconciliation to calorie target', () => {
  it('protein*4 + carb*4 + fat*9 reconciles to calorie target within rounding', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      const totalKcal = r.targets.proteinG * 4 + r.targets.carbG * 4 + r.targets.fatG * 9;
      // Atwater reconciliation tolerance: 2 kcal accounts for the 1-decimal
      // rounding on each macro plus the integer rounding on the calorie target.
      expect(Math.abs(totalKcal - r.targets.calorieTargetKcal)).toBeLessThanOrEqual(2.5);
    }
  });

  it('emits no negative macro', () => {
    const r = generateMacroTargets(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.targets.proteinG).toBeGreaterThanOrEqual(0);
      expect(r.targets.carbG).toBeGreaterThanOrEqual(0);
      expect(r.targets.fatG).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('generateMacroTargets: Section 5.5 safety paths', () => {
  it('DE safe mode active forces conservative maintenance regardless of direction', () => {
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
      expect(r.targets.calorieTargetKcal).toBeCloseTo(r.basis.tdee, 0);
    }
  });

  it('under-18 routes to conservative path', () => {
    const r = generateMacroTargets({
      body: { currentWeightKg: 60, heightCm: 170, age: 16, biologicalSex: 'male' },
      activityLevel: 'moderately_active',
      weightGoal: { goalWeightKg: 55, goalDirection: 'lose' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.conservativePath).toBe(true);
      expect(r.basis.conservativeReason).toBe('under_18');
      expect(r.basis.effectiveDirection).toBe('maintain');
    }
  });

  it('goal BMI < 18.5 routes to conservative path', () => {
    // 175 cm height; 50 kg goal -> BMI 16.3 < 18.5.
    const r = generateMacroTargets({
      body: { currentWeightKg: 70, heightCm: 175, age: 30, biologicalSex: 'female' },
      activityLevel: 'sedentary',
      weightGoal: { goalWeightKg: 50, goalDirection: 'lose' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.conservativePath).toBe(true);
      expect(r.basis.conservativeReason).toBe('goal_bmi_below_floor');
      expect(r.basis.effectiveDirection).toBe('maintain');
    }
  });

  it('DE safe mode takes precedence over the under-18 + sub-18.5 reasons', () => {
    const r = generateMacroTargets({
      body: { currentWeightKg: 50, heightCm: 175, age: 15, biologicalSex: 'female' },
      activityLevel: 'sedentary',
      weightGoal: { goalWeightKg: 40, goalDirection: 'lose' },
      safety: { deSafetyActive: true },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.basis.conservativeReason).toBe('de_safety_mode');
  });
});

describe('generateMacroTargets: weekly rate cap reporting', () => {
  it('reports a positive weeklyRateKg on a non-conservative Lose path', () => {
    // 80 kg / 180 cm / 35 male moderately_active, goal 76 kg (BMI 23.5 > 18.5).
    // TDEE 2720.25, deficit 18% = 489.65, target 2231 kcal.
    // weeklyKcalDelta = (2720.25 - 2231) * 7 = 3424.75; weeklyRateKg ~= 0.4.
    const r = generateMacroTargets({
      body: { currentWeightKg: 80, heightCm: 180, age: 35, biologicalSex: 'male' },
      activityLevel: 'moderately_active',
      weightGoal: { goalWeightKg: 76, goalDirection: 'lose' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.conservativePath).toBe(false);
      expect(r.basis.weeklyRateKg).toBeGreaterThan(0);
    }
  });

  it('zeroes weeklyRateKg on a conservative-path Lose because the target equals TDEE', () => {
    // Same body but goal weight implies BMI below 18.5 -> conservative path
    // forces effectiveDirection to maintain, so target == TDEE and weekly
    // delta is zero by construction.
    const r = generateMacroTargets({
      body: { currentWeightKg: 80, heightCm: 180, age: 35, biologicalSex: 'male' },
      activityLevel: 'moderately_active',
      weightGoal: { goalWeightKg: 55, goalDirection: 'lose' },
      safety: { deSafetyActive: false },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.basis.conservativePath).toBe(true);
      expect(r.basis.weeklyRateKg).toBe(0);
    }
  });
});
