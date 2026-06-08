import { describe, it, expect } from 'vitest';
import { computeRecalibration } from '@/lib/body-goals/recalibrate';
import type { BodyGoalRow } from '@/lib/body-goals/types';

const goal: BodyGoalRow = {
  id: 'g1', user_id: 'u1', status: 'active', driver: 'rate',
  start_weight_lb: 200, goal_weight_lb: 180, goal_bodyfat_pct: null,
  start_date: '2026-05-01', target_date: null, target_rate_lb_per_week: 1,
  sex: 'male', age_years: 35, height_in: 70, activity_level: 'light',
  created_at: '', updated_at: '',
};

// 14 daily points from 2026-05-25 to 2026-06-07, trending down ~2.6 lb.
const weightPoints = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 4, 25) + i * 86_400_000).toISOString().slice(0, 10),
  weightLb: 200 - i * 0.2,
}));

describe('computeRecalibration (criterion 3)', () => {
  it('produces an estimated TDEE and a weekly_recalibration target after 10+ logged days', () => {
    const r = computeRecalibration({
      goal, today: '2026-06-07', windowStart: '2026-05-25', windowEnd: '2026-06-07',
      avgKcal: 1900, daysLogged: 12, weightPoints, latestWeightLb: 197, currentBodyFatPct: 20,
      priorTdee: null, prevCalorieTarget: 2000,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.estimatedTdee).toBeGreaterThan(0);
      expect(r.target.source).toBe('weekly_recalibration');
      expect(r.target.estimatedTdeeKcal).toBe(r.estimatedTdee);
      expect(r.weightChangeLb).toBeLessThan(0);
      expect(r.adherencePct).toBeCloseTo((12 / 14) * 100, 0);
    }
  });

  it('refuses with insufficient_data under 10 logged days, so no row is written', () => {
    const r = computeRecalibration({
      goal, today: '2026-06-07', windowStart: '2026-05-25', windowEnd: '2026-06-07',
      avgKcal: 1900, daysLogged: 8, weightPoints: [], latestWeightLb: 197, currentBodyFatPct: 20,
      priorTdee: null, prevCalorieTarget: 2000,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('insufficient_data');
  });
});
