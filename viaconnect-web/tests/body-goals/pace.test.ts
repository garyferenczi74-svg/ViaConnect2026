import { describe, it, expect } from 'vitest';
import { resolveCaqGoalDriver } from '@/lib/body-goals/pace';

describe('resolveCaqGoalDriver', () => {
  it('lose + steady yields rate driver at 1.0 lb/week (criterion 1)', () => {
    const r = resolveCaqGoalDriver({ currentWeightLb: 200, goalWeightLb: 180, pace: 'steady', targetDate: null });
    expect(r.driver).toBe('rate');
    expect(r.targetRateLbPerWeek).toBe(1.0);
    expect(r.pacePreset).toBe('steady');
    expect(r.isMaintain).toBe(false);
  });

  it('gentle is 0.5 and ambitious is 1.5 lb/week', () => {
    expect(resolveCaqGoalDriver({ currentWeightLb: 200, goalWeightLb: 180, pace: 'gentle', targetDate: null }).targetRateLbPerWeek).toBe(0.5);
    expect(resolveCaqGoalDriver({ currentWeightLb: 200, goalWeightLb: 180, pace: 'ambitious', targetDate: null }).targetRateLbPerWeek).toBe(1.5);
  });

  it('maintain (within the band) stores rate driver at 0 with no pace (criterion 2)', () => {
    const r = resolveCaqGoalDriver({ currentWeightLb: 170, goalWeightLb: 170, pace: 'steady', targetDate: null });
    expect(r.driver).toBe('rate');
    expect(r.targetRateLbPerWeek).toBe(0);
    expect(r.isMaintain).toBe(true);
  });

  it('custom_date with a date is date driven', () => {
    const r = resolveCaqGoalDriver({ currentWeightLb: 200, goalWeightLb: 180, pace: 'custom_date', targetDate: '2026-09-01' });
    expect(r.driver).toBe('date');
    expect(r.targetDate).toBe('2026-09-01');
    expect(r.pacePreset).toBe('custom_date');
  });

  it('custom_date without a date falls back to steady rate', () => {
    const r = resolveCaqGoalDriver({ currentWeightLb: 200, goalWeightLb: 180, pace: 'custom_date', targetDate: null });
    expect(r.driver).toBe('rate');
    expect(r.targetRateLbPerWeek).toBe(1.0);
    expect(r.pacePreset).toBe('steady');
  });
});
