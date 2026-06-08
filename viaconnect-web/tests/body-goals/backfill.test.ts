import { describe, it, expect } from 'vitest';
import { backfillActiveGoalIfMissing } from '@/lib/body-goals/backfill';

// Fake Supabase covering the reads backfill makes (active goal, legacy weight
// goal) with an insert spy so we can assert idempotency.
function makeClient(opts: {
  activeGoal: Record<string, unknown> | null;
  uwg?: Record<string, unknown> | null;
  onInsert?: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const make = (table: string): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select: () => b,
      eq: () => b,
      order: () => b,
      limit: () => b,
      insert: () => {
        opts.onInsert?.();
        return b;
      },
      single: async () => ({ data: { id: 'new' }, error: null }),
      maybeSingle: async () => {
        if (table === 'body_goals') return { data: opts.activeGoal, error: null };
        if (table === 'user_weight_goals') return { data: opts.uwg ?? null, error: null };
        return { data: null, error: null };
      },
    };
    return b;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: (t: string) => make(t) } as any;
}

describe('backfillActiveGoalIfMissing (criterion 5)', () => {
  it('returns the existing active goal and never inserts a second one', async () => {
    let inserted = false;
    const r = await backfillActiveGoalIfMissing(
      'u1',
      makeClient({
        activeGoal: { id: 'g1', goal_weight_lb: 180, start_weight_lb: 200, needs_resync: false },
        onInsert: () => {
          inserted = true;
        },
      }),
    );
    expect(r?.id).toBe('g1');
    expect(inserted).toBe(false);
  });

  it('is a no-op when there is no legacy weight goal to seed from', async () => {
    let inserted = false;
    const r = await backfillActiveGoalIfMissing(
      'u1',
      makeClient({
        activeGoal: null,
        uwg: null,
        onInsert: () => {
          inserted = true;
        },
      }),
    );
    expect(r).toBeNull();
    expect(inserted).toBe(false);
  });
});
