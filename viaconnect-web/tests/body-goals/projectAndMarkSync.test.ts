import { describe, it, expect } from 'vitest';
import { projectAndMarkSync } from '@/lib/body-goals/projectWeightGoal';

// Fake Supabase: the user_weight_goals write (the projection) optionally
// throws; the body_goals flag update is captured so we can assert needs_resync.
function fakeClient(opts: { projectionThrows: boolean; captured: { patch?: Record<string, unknown> } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const make = (table: string): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select: () => b,
      eq: () => b,
      order: () => b,
      limit: () => b,
      insert: () => b,
      update: (patch: Record<string, unknown>) => {
        if (table === 'body_goals') opts.captured.patch = patch;
        return b;
      },
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => {
        if (table === 'user_weight_goals' && opts.projectionThrows) throw new Error('uwg write boom');
        return { data: { id: 'x', goal_direction: 'lose', goal_weight_kg: 81, current_weight_kg: 90 }, error: null };
      },
    };
    return b;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: (t: string) => make(t) } as any;
}

describe('projectAndMarkSync (criterion 6 self-heal)', () => {
  it('marks needs_resync true when the projection fails, without throwing', async () => {
    const captured: { patch?: Record<string, unknown> } = {};
    const r = await projectAndMarkSync(
      'g1',
      { userId: 'u1', goalWeightLb: 180, startWeightLb: 200 },
      fakeClient({ projectionThrows: true, captured }),
    );
    expect(r.ok).toBe(false);
    expect(captured.patch?.needs_resync).toBe(true);
  });

  it('clears needs_resync and stamps legacy_synced_at when the projection succeeds', async () => {
    const captured: { patch?: Record<string, unknown> } = {};
    const r = await projectAndMarkSync(
      'g1',
      { userId: 'u1', goalWeightLb: 180, startWeightLb: 200 },
      fakeClient({ projectionThrows: false, captured }),
    );
    expect(r.ok).toBe(true);
    expect(captured.patch?.needs_resync).toBe(false);
    expect(captured.patch?.legacy_synced_at).toBeTruthy();
  });
});
