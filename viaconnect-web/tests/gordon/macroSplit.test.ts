import { describe, it, expect } from 'vitest';
import { deriveMacroSplit } from '@/lib/gordon/macroSplit';

describe('deriveMacroSplit', () => {
  it('protein anchors on 0.8 g/lb LBM times the goal multiplier', () => {
    const r = deriveMacroSplit({ calorieTargetKcal: 2000, direction: 'maintain', lbmKg: 60, currentWeightKg: 80, dietaryChoice: 'balanced' });
    const lbmLbs = 60 * 2.20462;
    expect(r.proteinG).toBeCloseTo(Math.round((0.8 * 0.8 * lbmLbs) * 10) / 10, 0);
  });
  it('fiber is 14 g per 1000 kcal of the calorie target', () => {
    const r = deriveMacroSplit({ calorieTargetKcal: 2000, direction: 'lose', lbmKg: 55, currentWeightKg: 75, dietaryChoice: 'balanced' });
    expect(r.fiberG).toBe(28);
  });
  it('calories reconcile: 4*protein + 9*fat + 4*carb is within rounding of the target', () => {
    const r = deriveMacroSplit({ calorieTargetKcal: 1800, direction: 'lose', lbmKg: 50, currentWeightKg: 70, dietaryChoice: 'balanced' });
    const kcal = 4 * r.proteinG + 9 * r.fatG + 4 * r.carbG;
    expect(Math.abs(kcal - 1800)).toBeLessThan(60);
  });
  it('keto anchors carbs at the cap', () => {
    const r = deriveMacroSplit({ calorieTargetKcal: 1800, direction: 'lose', lbmKg: 50, currentWeightKg: 70, dietaryChoice: 'keto' });
    expect(r.carbG).toBe(30);
  });
});
