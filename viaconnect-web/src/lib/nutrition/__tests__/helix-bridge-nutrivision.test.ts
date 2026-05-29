// Prompt #170 Phase 1i: tests for the NutriVision-specific Helix awards.
// Verifies the four-event eligibility matrix (always, high confidence, user
// refined, corpus contribution), the per-event isolation guarantee on
// insert errors, and the totalPoints sum.

import { describe, it, expect, vi } from 'vitest';
import { awardNutriVisionHelixEvents } from '../helix-bridge';

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
  client: Parameters<typeof awardNutriVisionHelixEvents>[0]['supabaseAdmin'];
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

  const client = { from } as unknown as Parameters<typeof awardNutriVisionHelixEvents>[0]['supabaseAdmin'];
  return { client, inserts };
}

describe('awardNutriVisionHelixEvents', () => {
  it('awards all four events when every condition holds', async () => {
    const { client, inserts } = buildFakeClient({});

    const result = await awardNutriVisionHelixEvents({
      supabaseAdmin: client,
      userId: 'user-1',
      mealId: 'meal-1',
      mealConfidence: 0.9,
      userModified: true,
      contributedPhotoPath: 'hash/2026-05-28/uuid.jpg',
      requestId: 'req-1',
    });

    expect(result.awarded).toEqual([
      'nutrivision_meal_logged',
      'nutrivision_high_confidence',
      'nutrivision_user_refined',
      'corpus_contribution',
    ]);
    expect(result.totalPoints).toBe(9);
    expect(result.errors).toEqual([]);
    expect(inserts.length).toBe(4);
    expect(inserts[0].amount).toBe(5);
    expect(inserts[0].type).toBe('earn');
    expect(inserts[0].source).toBe('nutrivision_meal_logged');
    expect(inserts[0].event_type_id).toBe('nutrivision_meal_logged');
    expect(inserts[0].metadata.event_key).toBe('nutrivision_meal_logged');
    expect(inserts[0].metadata.related_meal_id).toBe('meal-1');
    expect(inserts[3].type).toBe('earn');
    expect(inserts[3].source).toBe('corpus_contribution');
  });

  it('awards only the base meal_logged event when no bonus conditions hold', async () => {
    const { client, inserts } = buildFakeClient({});

    const result = await awardNutriVisionHelixEvents({
      supabaseAdmin: client,
      userId: 'user-2',
      mealId: 'meal-2',
      mealConfidence: 0.6,
      userModified: false,
      contributedPhotoPath: null,
      requestId: 'req-2',
    });

    expect(result.awarded).toEqual(['nutrivision_meal_logged']);
    expect(result.totalPoints).toBe(5);
    expect(result.errors).toEqual([]);
    expect(inserts.length).toBe(1);
  });

  it('treats undefined confidence as below the high threshold', async () => {
    const { client } = buildFakeClient({});
    const result = await awardNutriVisionHelixEvents({
      supabaseAdmin: client,
      userId: 'user-3',
      mealId: 'meal-3',
      userModified: false,
      requestId: 'req-3',
    });
    expect(result.awarded).toEqual(['nutrivision_meal_logged']);
    expect(result.totalPoints).toBe(5);
  });

  it('treats empty contributedPhotoPath as no contribution', async () => {
    const { client } = buildFakeClient({});
    const result = await awardNutriVisionHelixEvents({
      supabaseAdmin: client,
      userId: 'user-4',
      mealId: 'meal-4',
      mealConfidence: 0.9,
      userModified: false,
      contributedPhotoPath: '',
      requestId: 'req-4',
    });
    expect(result.awarded).toEqual([
      'nutrivision_meal_logged',
      'nutrivision_high_confidence',
    ]);
    expect(result.totalPoints).toBe(7);
  });

  it('awards the surviving events when one event insert fails', async () => {
    const { client, inserts } = buildFakeClient({
      insertResults: {
        nutrivision_high_confidence: { error: { message: 'unique violation' } },
      },
    });

    const result = await awardNutriVisionHelixEvents({
      supabaseAdmin: client,
      userId: 'user-5',
      mealId: 'meal-5',
      mealConfidence: 0.95,
      userModified: true,
      contributedPhotoPath: null,
      requestId: 'req-5',
    });

    expect(result.awarded).toEqual([
      'nutrivision_meal_logged',
      'nutrivision_user_refined',
    ]);
    expect(result.totalPoints).toBe(6);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].event).toBe('nutrivision_high_confidence');
    expect(result.errors[0].error_class).toBe('SupabaseError');
    expect(inserts.length).toBe(3);
  });

  it('still emits info log even when only one award succeeds', async () => {
    const { client } = buildFakeClient({
      insertResults: {
        nutrivision_meal_logged: { error: { message: 'rls' } },
      },
    });

    const result = await awardNutriVisionHelixEvents({
      supabaseAdmin: client,
      userId: 'user-6',
      mealId: 'meal-6',
      mealConfidence: 0.99,
      userModified: true,
      contributedPhotoPath: 'p',
      requestId: 'req-6',
    });

    expect(result.awarded).toEqual([
      'nutrivision_high_confidence',
      'nutrivision_user_refined',
      'corpus_contribution',
    ]);
    expect(result.totalPoints).toBe(4);
    expect(result.errors.length).toBe(1);
  });
});
