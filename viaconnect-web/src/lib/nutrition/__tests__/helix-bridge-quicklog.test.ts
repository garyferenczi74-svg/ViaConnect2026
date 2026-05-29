// Prompt #170a supplement §16: tests for the Quick Log Helix awards.
// Verifies the three-event eligibility matrix (always meal_logged, completeness
// when all four macros AND a cooking annotation hold, refined when userModified
// is true), per-event isolation on insert errors, and the totalPoints sum.

import { describe, it, expect, vi } from 'vitest';
import { awardQuickLogHelixEvents } from '../helix-bridge';

interface InsertedTx {
  user_id: string;
  amount: number;
  type: string;
  source: string;
  description: string;
  event_type_id: string;
  metadata: Record<string, unknown>;
}

function buildFakeClient(opts: {
  insertResults?: Record<string, { error: { message: string } | null }>;
}): {
  client: Parameters<typeof awardQuickLogHelixEvents>[0]['supabaseAdmin'];
  inserts: InsertedTx[];
} {
  const inserts: InsertedTx[] = [];
  const results = opts.insertResults ?? {};

  const insert = vi.fn(async (row: InsertedTx) => {
    inserts.push(row);
    const r = results[row.event_type_id];
    if (r) return r;
    return { error: null };
  });

  const from = vi.fn((tableName: string) => {
    if (tableName !== 'helix_transactions') {
      throw new Error(`unexpected table: ${tableName}`);
    }
    return { insert };
  });

  const client = { from } as unknown as Parameters<typeof awardQuickLogHelixEvents>[0]['supabaseAdmin'];
  return { client, inserts };
}

describe('awardQuickLogHelixEvents', () => {
  it('awards all three events when every condition holds', async () => {
    const { client, inserts } = buildFakeClient({});

    const result = await awardQuickLogHelixEvents({
      supabaseAdmin: client,
      userId: 'user-1',
      mealId: 'meal-1',
      hasAllFourMacros: true,
      hasCookingAnnotation: true,
      userModified: true,
      requestId: 'req-1',
    });

    expect(result.awarded).toEqual([
      'quick_log_meal_logged',
      'quick_log_high_completeness',
      'quick_log_meal_refined',
    ]);
    expect(result.totalPoints).toBe(8);
    expect(result.errors).toEqual([]);
    expect(inserts.length).toBe(3);
    expect(inserts[0].amount).toBe(5);
    expect(inserts[0].type).toBe('earn');
    expect(inserts[0].source).toBe('quick_log_meal_logged');
    expect(inserts[0].event_type_id).toBe('quick_log_meal_logged');
    expect(inserts[0].metadata.event_key).toBe('quick_log_meal_logged');
    expect(inserts[0].metadata.related_meal_id).toBe('meal-1');
    expect(inserts[0].metadata.source).toBe('quick_log');
    expect(inserts[1].amount).toBe(2);
    expect(inserts[2].amount).toBe(1);
  });

  it('awards only the base meal_logged event when no bonus conditions hold', async () => {
    const { client, inserts } = buildFakeClient({});

    const result = await awardQuickLogHelixEvents({
      supabaseAdmin: client,
      userId: 'user-2',
      mealId: 'meal-2',
      hasAllFourMacros: false,
      hasCookingAnnotation: false,
      userModified: false,
      requestId: 'req-2',
    });

    expect(result.awarded).toEqual(['quick_log_meal_logged']);
    expect(result.totalPoints).toBe(5);
    expect(result.errors).toEqual([]);
    expect(inserts.length).toBe(1);
  });

  it('awards meal_logged + high_completeness when macros + annotation hold but userModified is false', async () => {
    const { client } = buildFakeClient({});

    const result = await awardQuickLogHelixEvents({
      supabaseAdmin: client,
      userId: 'user-3',
      mealId: 'meal-3',
      hasAllFourMacros: true,
      hasCookingAnnotation: true,
      userModified: false,
      requestId: 'req-3',
    });

    expect(result.awarded).toEqual([
      'quick_log_meal_logged',
      'quick_log_high_completeness',
    ]);
    expect(result.totalPoints).toBe(7);
  });

  it('does not award high_completeness when only one of the two flags holds', async () => {
    const { client } = buildFakeClient({});

    const onlyMacros = await awardQuickLogHelixEvents({
      supabaseAdmin: client,
      userId: 'user-4a',
      mealId: 'meal-4a',
      hasAllFourMacros: true,
      hasCookingAnnotation: false,
      userModified: false,
      requestId: 'req-4a',
    });
    expect(onlyMacros.awarded).toEqual(['quick_log_meal_logged']);

    const onlyAnnotation = await awardQuickLogHelixEvents({
      supabaseAdmin: client,
      userId: 'user-4b',
      mealId: 'meal-4b',
      hasAllFourMacros: false,
      hasCookingAnnotation: true,
      userModified: false,
      requestId: 'req-4b',
    });
    expect(onlyAnnotation.awarded).toEqual(['quick_log_meal_logged']);
  });

  it('awards the surviving events when one event insert fails', async () => {
    const { client, inserts } = buildFakeClient({
      insertResults: {
        quick_log_high_completeness: { error: { message: 'unique violation' } },
      },
    });

    const result = await awardQuickLogHelixEvents({
      supabaseAdmin: client,
      userId: 'user-5',
      mealId: 'meal-5',
      hasAllFourMacros: true,
      hasCookingAnnotation: true,
      userModified: true,
      requestId: 'req-5',
    });

    expect(result.awarded).toEqual([
      'quick_log_meal_logged',
      'quick_log_meal_refined',
    ]);
    expect(result.totalPoints).toBe(6);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].event).toBe('quick_log_high_completeness');
    expect(result.errors[0].error_class).toBe('SupabaseError');
    expect(inserts.length).toBe(3);
  });
});
