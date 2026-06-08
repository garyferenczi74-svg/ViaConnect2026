import { describe, it, expect } from 'vitest';
import { projectGoalToWeightGoals } from '@/lib/body-goals/projectWeightGoal';
import { lbsToKg } from '@/lib/weight-goals/guardrails';

function fakeClient(opts: {
  existing?: Record<string, unknown> | null;
  throwOnWrite?: boolean;
  captured?: { row?: Record<string, unknown> };
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({ data: opts.existing ?? null, error: null }),
    insert: (row: Record<string, unknown>) => {
      if (opts.captured) opts.captured.row = row;
      if (opts.throwOnWrite) throw new Error('write boom');
      return builder;
    },
    single: async () => ({ data: { id: 'x', goal_direction: 'lose', ...(opts.captured?.row ?? {}) }, error: null }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: () => builder } as any;
}

describe('projectGoalToWeightGoals (179a write-through, save path)', () => {
  it('writes goal weight in kg and seeds current weight from start when none exists', async () => {
    const captured: { row?: Record<string, unknown> } = {};
    const r = await projectGoalToWeightGoals(
      { userId: 'u1', goalWeightLb: 180, startWeightLb: 200 },
      fakeClient({ existing: null, captured }),
    );
    expect(r.ok).toBe(true);
    expect(captured.row?.goal_weight_kg).toBeCloseTo(lbsToKg(180), 3);
    expect(captured.row?.current_weight_kg).toBeCloseTo(lbsToKg(200), 3);
  });

  it('fails open (ok:false) when the write throws and never rethrows', async () => {
    const r = await projectGoalToWeightGoals(
      { userId: 'u1', goalWeightLb: 180, startWeightLb: 200 },
      fakeClient({ existing: null, throwOnWrite: true }),
    );
    expect(r.ok).toBe(false);
  });
});
