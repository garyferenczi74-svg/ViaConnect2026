// Prompt 192 Task 3 (TDD): runner ledger lifecycle, supersede pass,
// trigger aware filtering, and failure paths over a recording fake client.
//
// Fixture shape: three consecutive scored days ending now trip the
// consistency_streak detector, the only fact the cold start gate allows
// at exactly 3 scored meals besides daily macro_gap (which stays silent
// here because targets resolve to null through the empty fake world).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInsightsForUser } from '../runner';
import { findCall, findCalls, hasFilter, makeFakeAdmin, type FakeCall, type FakeHandler } from './fake-admin';

const USER_ID = 'user-1';

let savedAnthropicKey: string | undefined;

beforeEach(() => {
  // Force the deterministic template composer regardless of the host env.
  savedAnthropicKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  if (savedAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = savedAnthropicKey;
});

function mealRows() {
  const now = Date.now();
  return [0, 1, 2].map((daysAgo) => ({
    meal_id: `meal-${daysAgo}`,
    logged_at: new Date(now - daysAgo * 24 * 3_600_000).toISOString(),
    meal_type: 'lunch',
    calories_kcal: 600,
    protein_g: 30,
    carbs_g: 60,
    fat_total_g: 20,
    fiber_g: 8,
    quality_score: 75,
    score_breakdown: null,
  }));
}

function baseHandlers(overrides: Record<string, FakeHandler> = {}): Record<string, FakeHandler> {
  return {
    nutrition_insight_runs: (call: FakeCall) =>
      call.op === 'insert' ? { data: { id: 'run-1' } } : {},
    meals: () => ({ data: mealRows() }),
    meal_items: () => ({ data: [] }),
    hydration_aggregations_daily: () => ({ data: [] }),
    user_supplement_schedule: () => ({ data: [] }),
    protocol_adherence_log: () => ({ data: [] }),
    nutrition_insights: () => ({ data: [] }),
    ...overrides,
  };
}

describe('runInsightsForUser', () => {
  it('runs the full success path for a daily trigger', async () => {
    const { client, calls } = makeFakeAdmin(baseHandlers());
    const result = await runInsightsForUser(client, USER_ID, 'daily');

    expect(result).toEqual({ runId: 'run-1', inserted: 1 });

    // 1. Run ledger opened with explicit running status.
    const runInsert = findCall(calls, 'nutrition_insight_runs', 'insert');
    expect(runInsert?.payload).toEqual({ user_id: USER_ID, trigger: 'daily', status: 'running' });

    // 2. Supersede pass: the regenerated (type, horizon) pair is expired...
    const updates = findCalls(calls, 'nutrition_insights', 'update');
    const pairExpire = updates.find((c) => hasFilter(c, 'eq', 'insight_type', 'consistency_streak'));
    expect(pairExpire).toBeDefined();
    expect(pairExpire?.payload).toEqual({ status: 'expired' });
    expect(hasFilter(pairExpire as FakeCall, 'eq', 'user_id', USER_ID)).toBe(true);
    expect(hasFilter(pairExpire as FakeCall, 'eq', 'status', 'active')).toBe(true);
    expect(hasFilter(pairExpire as FakeCall, 'eq', 'horizon', 'daily')).toBe(true);

    // ...and the stale sweep targets active rows past expires_at.
    const staleExpire = updates.find((c) => c.filters.some((f) => f.method === 'lte' && f.args[0] === 'expires_at'));
    expect(staleExpire).toBeDefined();
    expect(staleExpire?.payload).toEqual({ status: 'expired' });

    // 3. Insert carries explicit user_id and the engine row shape.
    const insert = findCall(calls, 'nutrition_insights', 'insert');
    const rows = insert?.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(USER_ID);
    expect(rows[0].insight_type).toBe('consistency_streak');
    expect(rows[0].horizon).toBe('daily');
    expect(rows[0].compliance_passed).toBe(true);

    // 4. Ledger closed as done with the inserted count.
    const finalize = findCalls(calls, 'nutrition_insight_runs', 'update')[0];
    expect(finalize?.payload).toMatchObject({ status: 'done', inserted_count: 1 });
    expect(hasFilter(finalize, 'eq', 'id', 'run-1')).toBe(true);
  });

  it('filters daily horizon output away on a weekly trigger', async () => {
    const { client, calls } = makeFakeAdmin(baseHandlers());
    const result = await runInsightsForUser(client, USER_ID, 'weekly');

    expect(result).toEqual({ runId: 'run-1', inserted: 0 });
    expect(findCall(calls, 'nutrition_insights', 'insert')).toBeUndefined();

    // No regenerated pairs, but the stale sweep still runs.
    const updates = findCalls(calls, 'nutrition_insights', 'update');
    expect(updates).toHaveLength(1);
    expect(updates[0].filters.some((f) => f.method === 'lte' && f.args[0] === 'expires_at')).toBe(true);

    const finalize = findCalls(calls, 'nutrition_insight_runs', 'update')[0];
    expect(finalize?.payload).toMatchObject({ status: 'done', inserted_count: 0 });
  });

  it('marks the run failed and returns { error } when the insert fails', async () => {
    const { client, calls } = makeFakeAdmin(
      baseHandlers({
        nutrition_insights: (call: FakeCall) =>
          call.op === 'insert' ? { error: { message: 'boom' } } : { data: [] },
      }),
    );
    const result = await runInsightsForUser(client, USER_ID, 'daily');

    expect('error' in result && result.error).toMatch(/^insert_failed/);

    const runUpdates = findCalls(calls, 'nutrition_insight_runs', 'update');
    expect(runUpdates).toHaveLength(1);
    expect(runUpdates[0].payload).toMatchObject({ status: 'failed' });
    expect(String((runUpdates[0].payload as Record<string, unknown>).failure_reason)).toMatch(
      /insert_failed/,
    );
  });

  it('marks the run failed when the supersede pass fails', async () => {
    const { client, calls } = makeFakeAdmin(
      baseHandlers({
        nutrition_insights: (call: FakeCall) =>
          call.op === 'update' ? { error: { message: 'locked' } } : { data: [] },
      }),
    );
    const result = await runInsightsForUser(client, USER_ID, 'daily');

    expect('error' in result && result.error).toMatch(/^supersede_failed/);
    expect(findCall(calls, 'nutrition_insights', 'insert')).toBeUndefined();
    const runUpdates = findCalls(calls, 'nutrition_insight_runs', 'update');
    expect(runUpdates[0].payload).toMatchObject({ status: 'failed' });
  });

  it('returns { error } without further DB work when the run row insert fails', async () => {
    const { client, calls } = makeFakeAdmin({
      nutrition_insight_runs: () => ({ error: { message: 'down' } }),
    });
    const result = await runInsightsForUser(client, USER_ID, 'daily');

    expect('error' in result && result.error).toMatch(/^run_insert_failed/);
    expect(calls).toHaveLength(1);
  });
});
