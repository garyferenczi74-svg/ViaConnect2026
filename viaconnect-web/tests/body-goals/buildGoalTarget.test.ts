import { describe, it, expect } from 'vitest';
import { buildGoalTarget, type BuildGoalTargetInput } from '@/lib/body-goals/buildGoalTarget';

const base: BuildGoalTargetInput = {
  driver: 'rate', targetRateLbPerWeek: 1, targetDate: null,
  startWeightLb: 200, goalWeightLb: 180, startDate: '2026-06-07',
  latestWeightLb: 200, bodyFatPct: 22, heightIn: 70, age: 35,
  sex: 'male', activityLevel: 'light', dietaryChoice: 'balanced',
  effectiveDate: '2026-06-07', source: 'initial_plan',
  tdeeOverride: null, priorTdee: null,
};

describe('buildGoalTarget', () => {
  it('rate-driven goal: target above floor, non-null macro split, est TDEE null (criterion 1)', () => {
    const r = buildGoalTarget(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.target.proteinG).toBeGreaterThan(0);
      expect(r.target.fatG).toBeGreaterThan(0);
      expect(r.target.carbG).toBeGreaterThan(0);
      expect(r.target.fiberG).toBeGreaterThan(0);
      expect(r.target.calorieTargetKcal).toBeGreaterThanOrEqual(1500);
      expect(r.target.estimatedTdeeKcal).toBeNull(); // initial_plan: NULL until data
      expect(r.target.hydrationMl).toBeGreaterThan(0);
    }
  });

  it('date-driven sub-floor demand clamps to floor and pushes projectedDate out (criterion 2)', () => {
    // Small, older, sedentary member: low TDEE so even the safe rate would
    // require sub-floor calories, forcing the floor clamp.
    const r = buildGoalTarget({
      ...base,
      sex: 'female', latestWeightLb: 130, startWeightLb: 130, goalWeightLb: 110,
      heightIn: 62, age: 60, activityLevel: 'sedentary', bodyFatPct: null,
      driver: 'date', targetRateLbPerWeek: null, targetDate: '2026-07-05',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.target.calorieTargetKcal).toBe(1200); // female floor
      expect(r.target.rationale.clamps as string[]).toContain('calorie_floor');
      expect(r.target.projectedDate).not.toBeNull();
      expect(new Date(r.target.projectedDate as string).getTime()).toBeGreaterThan(
        new Date('2026-07-05').getTime(),
      );
    }
  });

  it('returns setup_required when profile inputs are missing', () => {
    const r = buildGoalTarget({ ...base, heightIn: 0, bodyFatPct: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain('height');
  });

  it('recalibration path: tdeeOverride flows through and est TDEE is recorded', () => {
    const r = buildGoalTarget({ ...base, source: 'weekly_recalibration', tdeeOverride: 2400 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.target.estimatedTdeeKcal).toBe(2400);
      expect(r.target.source).toBe('weekly_recalibration');
    }
  });
});
