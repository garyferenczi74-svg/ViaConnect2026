import { describe, it, expect } from 'vitest';
import { pickResolvedTarget, type ResolvedDailyTarget } from '@/lib/gordon/resolveDailyTarget';

const goal: ResolvedDailyTarget = {
  dailyKcal: 1800, dailyProteinG: 150, dailyCarbsG: 150, dailyFatTotalG: 60, dailyFiberG: 25,
  addedSugarLimitG: 45, hydrationMl: 2600, source: 'goal_target', goalId: 'g1',
};
const override: ResolvedDailyTarget = { ...goal, dailyKcal: 1700, source: 'manual_override' };
const caq: ResolvedDailyTarget = {
  dailyKcal: 2000, dailyProteinG: 120, dailyCarbsG: 220, dailyFatTotalG: 70, dailyFiberG: 28,
  addedSugarLimitG: null, hydrationMl: null, source: 'caq_static', goalId: null,
};

describe('pickResolvedTarget (DD-1 precedence, criterion 4)', () => {
  it('returns the manual override when present', () => {
    expect(pickResolvedTarget({ override, goalTarget: goal, caqStatic: caq })?.source).toBe('manual_override');
  });
  it('returns the goal target when there is no override', () => {
    expect(pickResolvedTarget({ override: null, goalTarget: goal, caqStatic: caq })?.source).toBe('goal_target');
  });
  it('falls back to the CAQ static target when there is no goal', () => {
    expect(pickResolvedTarget({ override: null, goalTarget: null, caqStatic: caq })?.source).toBe('caq_static');
  });
  it('returns null when nothing is available', () => {
    expect(pickResolvedTarget({ override: null, goalTarget: null, caqStatic: null })).toBeNull();
  });
});
