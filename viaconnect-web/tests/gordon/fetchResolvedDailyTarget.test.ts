import { describe, it, expect } from 'vitest';
import { fetchResolvedDailyTarget } from '@/lib/gordon/resolveDailyTarget';

// Minimal chainable stub: every builder method returns the same object; the
// terminal maybeSingle resolves a preset result.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chain(result: any): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = {};
  for (const m of ['select', 'eq', 'is', 'order', 'limit', 'lte']) c[m] = () => c;
  c.maybeSingle = async () => result;
  return c;
}

const CAQ_ROW = {
  daily_kcal: 2000, daily_protein_g: 120, daily_carbs_g: 220, daily_fat_total_g: 70, daily_fiber_g: 28,
};

// body_goal_targets is queried twice (override, then latest). Distinguish by
// which filter was used: the override query calls eq('source', ...); the latest
// query calls lte('effective_date', ...).
function bodyGoalTargetsChain() {
  const state = { isOverride: false, isLatest: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = {};
  c.select = () => c;
  c.eq = (k: string) => {
    if (k === 'source') state.isOverride = true;
    return c;
  };
  c.lte = () => {
    state.isLatest = true;
    return c;
  };
  c.order = () => c;
  c.limit = () => c;
  c.maybeSingle = async () => {
    if (state.isOverride) return { data: null };
    if (state.isLatest) {
      return {
        data: {
          goal_id: 'g1', calorie_target_kcal: 1800, protein_g: 150, carb_g: 150,
          fat_g: 60, fiber_g: 25, added_sugar_limit_g: 45, hydration_ml: 2600, source: 'goal_target',
        },
      };
    }
    return { data: null };
  };
  return c;
}

describe('fetchResolvedDailyTarget', () => {
  it('falls back to the CAQ static target when the goal layer throws (criterion 5)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = {
      from(table: string) {
        if (table === 'nutrition_targets') return chain({ data: CAQ_ROW });
        throw new Error('body_goals boom');
      },
    };
    const r = await fetchResolvedDailyTarget('u1', '2026-06-07', client);
    expect(r?.source).toBe('caq_static');
    expect(r?.dailyKcal).toBe(2000);
  });

  it('returns the goal target when an active goal has a latest effective target', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = {
      from(table: string) {
        if (table === 'nutrition_targets') return chain({ data: CAQ_ROW });
        if (table === 'body_goals') return chain({ data: { id: 'g1' } });
        if (table === 'body_goal_targets') return bodyGoalTargetsChain();
        return chain({ data: null });
      },
    };
    const r = await fetchResolvedDailyTarget('u1', '2026-06-07', client);
    expect(r?.source).toBe('goal_target');
    expect(r?.dailyKcal).toBe(1800);
  });

  it('returns the CAQ static target when there is no active goal', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = {
      from(table: string) {
        if (table === 'nutrition_targets') return chain({ data: CAQ_ROW });
        if (table === 'body_goals') return chain({ data: null });
        return chain({ data: null });
      },
    };
    const r = await fetchResolvedDailyTarget('u1', '2026-06-07', client);
    expect(r?.source).toBe('caq_static');
  });
});
