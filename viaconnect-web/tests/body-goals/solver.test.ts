import { describe, it, expect } from 'vitest';
import { solveCalorieTarget } from '@/lib/body-goals/energy';

describe('solveCalorieTarget', () => {
  it('rate-driven lose: target = tdee - weekly deficit', () => {
    const r = solveCalorieTarget({
      tdee: 2500, driver: 'rate', targetRateLbPerWeek: 1, targetDate: null,
      startWeightLb: 200, goalWeightLb: 180, startDate: '2026-06-07', sex: 'male', currentWeightLb: 200,
    });
    expect(r.calorieTargetKcal).toBe(2500 - Math.round((1 * 3500) / 7));
    expect(r.clamps).not.toContain('calorie_floor');
    expect(r.direction).toBe('lose');
  });

  it('clamps to the floor and pushes the date out when the date demands sub-floor calories (DD-3)', () => {
    const r = solveCalorieTarget({
      tdee: 2000, driver: 'date', targetRateLbPerWeek: null, targetDate: '2026-06-21',
      startWeightLb: 200, goalWeightLb: 180, startDate: '2026-06-07', sex: 'male', currentWeightLb: 200,
    });
    expect(r.calorieTargetKcal).toBe(1500); // male floor
    expect(r.clamps).toContain('calorie_floor');
    expect(r.projectedDate).not.toBeNull();
    expect(new Date(r.projectedDate as string).getTime()).toBeGreaterThan(new Date('2026-06-21').getTime());
  });

  it('clamps the rate to the max safe rate (lesser of 2 lb/wk and 1% body weight)', () => {
    const r = solveCalorieTarget({
      tdee: 4000, driver: 'rate', targetRateLbPerWeek: 5, targetDate: null,
      startWeightLb: 150, goalWeightLb: 140, startDate: '2026-06-07', sex: 'female', currentWeightLb: 150,
    });
    expect(r.clamps).toContain('rate_cap');
    const cappedDeficit = Math.round((1.5 * 3500) / 7); // 1% of 150 = 1.5 lb/wk
    expect(r.calorieTargetKcal).toBe(4000 - cappedDeficit);
  });

  it('maintain: target equals tdee, no projected date', () => {
    const r = solveCalorieTarget({
      tdee: 2200, driver: 'rate', targetRateLbPerWeek: 0, targetDate: null,
      startWeightLb: 170, goalWeightLb: 170, startDate: '2026-06-07', sex: 'female', currentWeightLb: 170,
    });
    expect(r.calorieTargetKcal).toBe(2200);
    expect(r.direction).toBe('maintain');
    expect(r.projectedDate).toBeNull();
  });
});
