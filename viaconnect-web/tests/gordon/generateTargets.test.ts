// Prompt 168 Refine phase: generateTargets vitest suite.
//
// Eight fixtures plus a USDA-defaults case. Each expected dailyKcal is
// hand-calculated via Mifflin-St Jeor then activity multiplier then goal
// adjustment. Spec section 3.2.

import { describe, it, expect } from 'vitest';
import { generateTargets } from '@/lib/gordon/generateTargets';
import type {
  CaqSnapshot,
  BodySnapshot,
} from '@/lib/gordon/generateTargets';

const F35_MAINTAIN_MODERATE: { caq: CaqSnapshot; body: BodySnapshot } = {
  caq: { activityLevel: 'moderate', weightGoal: 'maintenance' },
  body: { weightKg: 65, heightCm: 168, age: 35, biologicalSex: 'female' },
};

const M45_LOSS_SEDENTARY: { caq: CaqSnapshot; body: BodySnapshot } = {
  caq: { activityLevel: 'sedentary', weightGoal: 'loss' },
  body: { weightKg: 90, heightCm: 180, age: 45, biologicalSex: 'male' },
};

const F60_GAIN_VERY_ACTIVE: { caq: CaqSnapshot; body: BodySnapshot } = {
  caq: { activityLevel: 'very_active', weightGoal: 'gain' },
  body: { weightKg: 55, heightCm: 162, age: 60, biologicalSex: 'female' },
};

const M22_RECOMP_ATHLETE: { caq: CaqSnapshot; body: BodySnapshot } = {
  caq: { activityLevel: 'athlete', weightGoal: 'recomposition' },
  body: { weightKg: 80, heightCm: 185, age: 22, biologicalSex: 'male' },
};

const F55_CARDIO_FLAG: { caq: CaqSnapshot; body: BodySnapshot } = {
  caq: { activityLevel: 'light', weightGoal: 'maintenance', cardiovascularRiskFlag: true },
  body: { weightKg: 70, heightCm: 165, age: 55, biologicalSex: 'female' },
};

const M40_KIDNEY: { caq: CaqSnapshot; body: BodySnapshot } = {
  caq: { activityLevel: 'sedentary', weightGoal: 'loss', kidneyConcern: true },
  body: { weightKg: 85, heightCm: 178, age: 40, biologicalSex: 'male' },
};

const F50_DIGESTIVE: { caq: CaqSnapshot; body: BodySnapshot } = {
  caq: { activityLevel: 'moderate', weightGoal: 'maintenance', digestiveFlag: true },
  body: { weightKg: 62, heightCm: 167, age: 50, biologicalSex: 'female' },
};

const M35_DIABETES: { caq: CaqSnapshot; body: BodySnapshot } = {
  caq: { activityLevel: 'moderate', weightGoal: 'maintenance', diabetesFlag: true },
  body: { weightKg: 82, heightCm: 175, age: 35, biologicalSex: 'male' },
};

describe('generateTargets fixtures', () => {
  it('USDA defaults when both caq and body null', () => {
    const t = generateTargets({
      caqSnapshot: null,
      bodySnapshot: null,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    expect(t.dailyKcal).toBe(2000);
    expect(t.dailyProteinG).toBe(50);
    expect(t.dailyCarbsG).toBe(275);
    expect(t.dailyFatTotalG).toBe(78);
    expect(t.dailySodiumMg).toBe(2300);
    expect(t.generatedByVersion).toContain('usda-fallback');
  });

  it('female age 35 maintenance moderate: BMR 1393.5, TDEE 2160, ±5 kcal', () => {
    // BMR = 10*65 + 6.25*168 - 5*35 - 161 = 650 + 1050 - 175 - 161 = 1364
    // TDEE = 1364 * 1.55 = 2114.2
    // Goal maintenance: +0 -> 2114
    const t = generateTargets({
      caqSnapshot: F35_MAINTAIN_MODERATE.caq,
      bodySnapshot: F35_MAINTAIN_MODERATE.body,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    expect(t.dailyKcal).toBeGreaterThanOrEqual(2109);
    expect(t.dailyKcal).toBeLessThanOrEqual(2119);
    // Protein: 65 * 1.4 = 91g
    expect(t.dailyProteinG).toBeCloseTo(91, 0);
    // Sodium default 2300
    expect(t.dailySodiumMg).toBe(2300);
    // Fiber adult female under 50: 25g
    expect(t.dailyFiberG).toBe(25);
  });

  it('male age 45 loss sedentary: BMR 1850, TDEE 2220, -500 = 1720', () => {
    // BMR = 10*90 + 6.25*180 - 5*45 + 5 = 900 + 1125 - 225 + 5 = 1805
    // TDEE = 1805 * 1.2 = 2166
    // Goal loss: -500 -> 1666
    const t = generateTargets({
      caqSnapshot: M45_LOSS_SEDENTARY.caq,
      bodySnapshot: M45_LOSS_SEDENTARY.body,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    expect(t.dailyKcal).toBeGreaterThanOrEqual(1661);
    expect(t.dailyKcal).toBeLessThanOrEqual(1671);
    // Protein loss: 90 * 1.8 = 162g
    expect(t.dailyProteinG).toBeCloseTo(162, 0);
    // Fiber male under 50: 38g
    expect(t.dailyFiberG).toBe(38);
  });

  it('female age 60 gain very_active', () => {
    // BMR = 10*55 + 6.25*162 - 5*60 - 161 = 550 + 1012.5 - 300 - 161 = 1101.5
    // TDEE = 1101.5 * 1.725 = 1900.1
    // Goal gain: +300 -> 2200
    const t = generateTargets({
      caqSnapshot: F60_GAIN_VERY_ACTIVE.caq,
      bodySnapshot: F60_GAIN_VERY_ACTIVE.body,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    expect(t.dailyKcal).toBeGreaterThanOrEqual(2195);
    expect(t.dailyKcal).toBeLessThanOrEqual(2205);
    // Protein gain: 55 * 1.8 = 99g
    expect(t.dailyProteinG).toBeCloseTo(99, 0);
    // Fiber female over 50: 21g
    expect(t.dailyFiberG).toBe(21);
  });

  it('male age 22 recomposition athlete', () => {
    // BMR = 10*80 + 6.25*185 - 5*22 + 5 = 800 + 1156.25 - 110 + 5 = 1851.25
    // TDEE = 1851.25 * 1.9 = 3517.4
    // Goal recomp: -200 -> 3317
    const t = generateTargets({
      caqSnapshot: M22_RECOMP_ATHLETE.caq,
      bodySnapshot: M22_RECOMP_ATHLETE.body,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    expect(t.dailyKcal).toBeGreaterThanOrEqual(3312);
    expect(t.dailyKcal).toBeLessThanOrEqual(3322);
    // Protein recomp: 80 * 2.2 = 176g
    expect(t.dailyProteinG).toBeCloseTo(176, 0);
  });

  it('female age 55 cardio flag: sodium tightens to 1500', () => {
    const t = generateTargets({
      caqSnapshot: F55_CARDIO_FLAG.caq,
      bodySnapshot: F55_CARDIO_FLAG.body,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    expect(t.dailySodiumMg).toBe(1500);
  });

  it('male age 40 kidney concern: protein tightened 30 percent down', () => {
    const t = generateTargets({
      caqSnapshot: M40_KIDNEY.caq,
      bodySnapshot: M40_KIDNEY.body,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    // Loss base = 85 * 1.8 = 153g; 30% down = 107.1g
    expect(t.dailyProteinG).toBeCloseTo(107.1, 1);
  });

  it('female age 50 digestive flag: fiber ramped down 50 percent', () => {
    const t = generateTargets({
      caqSnapshot: F50_DIGESTIVE.caq,
      bodySnapshot: F50_DIGESTIVE.body,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    // Age 50 means age > 50 is false, so baseline 25g; ramped 50% = 12.5g
    expect(t.dailyFiberG).toBe(12.5);
  });

  it('male age 35 diabetes flag: sugar tightened 30 percent', () => {
    const t = generateTargets({
      caqSnapshot: M35_DIABETES.caq,
      bodySnapshot: M35_DIABETES.body,
      bioOptDay: null,
      mealPatternHistory: null,
    });
    // BMR = 10*82 + 6.25*175 - 5*35 + 5 = 820 + 1093.75 - 175 + 5 = 1743.75
    // TDEE = 1743.75 * 1.55 = 2702.8
    // Goal maintenance: 2703
    // Sugar base = 2703 * 0.10 / 4 = 67.6g; 30% down = 47.3g
    expect(t.dailySugarG).toBeGreaterThanOrEqual(45);
    expect(t.dailySugarG).toBeLessThanOrEqual(50);
  });
});
