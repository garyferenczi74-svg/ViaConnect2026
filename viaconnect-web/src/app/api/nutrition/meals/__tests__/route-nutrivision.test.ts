// Prompt #170 Phase 1j: NutriVision branch tests for POST /api/nutrition/meals.
//
// Verifies:
//   - Valid NutriVision payload returns 200, fans out to meal_items insert,
//     corpus writer, helix award, BOS recompute.
//   - Existing quick_log payload still works (regression).
//   - 400 when payload matches neither schema.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

interface InsertCall {
  table: string;
  rows: unknown;
}

const mocks = vi.hoisted(() => ({
  supabaseAuth: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } } }),
  inserts: [] as InsertCall[],
  mealInsertResult: {
    data: { meal_id: 'meal-uuid-1', quality_score: 72, quality_tier: 'good' },
    error: null as { message: string } | null,
  },
  mealItemsInsertError: null as { message: string } | null,
  legacyDeleteError: null as { message: string } | null,
  scoreMealForServerInsert: vi.fn().mockResolvedValue({
    quality_score: 72,
    quality_tier: 'good',
    score_breakdown: { final_score: 72 },
    scored_at: '2026-05-28T10:00:00Z',
    gordon_version: 'g.v.test',
  }),
  awardNutritionLogPoints: vi.fn().mockResolvedValue(undefined),
  awardNutriVisionHelixEvents: vi.fn().mockResolvedValue({
    awarded: ['nutrivision_meal_logged'],
    totalPoints: 5,
    errors: [],
  }),
  recomputeNutritionDimension: vi.fn().mockResolvedValue(undefined),
  writeCorpusRow: vi.fn().mockResolvedValue({
    corpusRowId: 'corpus-1',
    userHash: 'hash',
    saltVersion: 1,
  }),
}));

function userScopedClient() {
  return {
    auth: { getUser: mocks.supabaseAuth },
    from: (table: string) => ({
      delete: () => ({
        eq: () => ({
          eq: () => ({
            // Recipe-exclusion fix (2026-06-12) added .is('recipe_id', null) to
            // the replace-on-save delete chain; the mock mirrors it so the
            // legacy quick_log regression path resolves instead of throwing.
            is: () => ({
              gte: () => ({
                lt: () => Promise.resolve({ error: mocks.legacyDeleteError }),
              }),
            }),
          }),
        }),
      }),
      insert: (rows: unknown) => {
        mocks.inserts.push({ table, rows });
        if (table === 'meal_items') {
          return Promise.resolve({ error: mocks.mealItemsInsertError });
        }
        if (table === 'meal_logs') {
          // Hotfix 7 (#170 Phase 1q): legacy dual-write target. Same
          // promise shape as meal_items (no .select() chain).
          return Promise.resolve({ error: null });
        }
        return {
          select: () => ({
            single: () => Promise.resolve(mocks.mealInsertResult),
          }),
        };
      },
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => userScopedClient(),
}));

vi.mock('@/lib/supabase/admin-optional', () => ({
  tryCreateAdminClient: () => ({}),
}));

vi.mock('@/lib/gordon/scoreMealForServerInsert', () => ({
  scoreMealForServerInsert: mocks.scoreMealForServerInsert,
}));

vi.mock('@/lib/nutrition/helix-bridge', () => ({
  awardNutritionLogPoints: mocks.awardNutritionLogPoints,
  awardNutriVisionHelixEvents: mocks.awardNutriVisionHelixEvents,
}));

vi.mock('@/lib/nutrition/bos-bridge', () => ({
  recomputeNutritionDimension: mocks.recomputeNutritionDimension,
}));

vi.mock('@/lib/nutrition/corpus/writer', () => ({
  writeCorpusRow: mocks.writeCorpusRow,
}));

import { POST } from '../route';

function makeJsonReq(body: object): NextRequest {
  return new Request('http://localhost/api/nutrition/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.supabaseAuth.mockResolvedValue({ data: { user: { id: 'u-1' } } });
  mocks.inserts = [];
  mocks.mealInsertResult = {
    data: { meal_id: 'meal-uuid-1', quality_score: 72, quality_tier: 'good' },
    error: null,
  };
  mocks.mealItemsInsertError = null;
  mocks.legacyDeleteError = null;
  mocks.scoreMealForServerInsert.mockClear();
  mocks.awardNutritionLogPoints.mockClear();
  mocks.awardNutriVisionHelixEvents.mockClear();
  mocks.recomputeNutritionDimension.mockClear();
  mocks.writeCorpusRow.mockClear();
});

const nvPayload = {
  source: 'nutrivision' as const,
  meal_type: 'lunch' as const,
  logged_at: '2026-05-28T12:00:00.000Z',
  meal_confidence: 0.88,
  recognition_provider_primary: 'logmeal' as const,
  recognition_provider_secondary: 'gemini' as const,
  source_photo_blob_id: '11111111-2222-4333-8444-555555555555',
  items: [
    {
      food_name: 'Grilled chicken breast',
      cuisine_tag: 'north_american',
      bounding_box: { x: 100, y: 100, w: 200, h: 200 },
      recognition_provider: 'logmeal' as const,
      recognition_confidence: 0.9,
      portion_grams: 142,
      portion_estimation_method: 'vision_inference' as const,
      nutrient_source: 'usda_fdc' as const,
      usda_fdc_id: 171477,
      calories_kcal: 234,
      protein_g: 44,
      carbs_g: 0,
      fat_g: 5.1,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 75,
      cooking_method: 'grilled',
      user_modified: false,
    },
    {
      food_name: 'Steamed broccoli',
      cuisine_tag: 'north_american',
      portion_grams: 90,
      portion_estimation_method: 'vision_inference' as const,
      nutrient_source: 'usda_fdc' as const,
      calories_kcal: 31,
      protein_g: 2.5,
      carbs_g: 6,
      fat_g: 0.4,
      fiber_g: 2.4,
      sugar_g: 1.4,
      sodium_mg: 30,
      cooking_method: 'steamed',
      user_modified: true,
    },
  ],
  edit_diff: {
    itemsAdded: 0,
    itemsRemoved: 0,
    itemsModified: 1,
    oilSelections: 0,
    portionChanges: 0,
  },
};

const legacyPayload = {
  logged_at: '2026-05-28T12:00:00.000Z',
  meal_type: 'lunch',
  source: 'quick_log',
  source_confidence: 0.9,
  protein_g: 30,
  carbs_g: 40,
  fat_total_g: 15,
  fat_healthy_g: 5,
  fiber_g: 8,
  sugar_g: 5,
  sodium_mg: 500,
  calories_kcal: 450,
  calories_auto_calc: true,
  whole_food_flag: true,
  meal_name: 'Quick lunch',
  raw_input: { sliders: { protein: 30 } },
  snack_index: null,
};

describe('POST /api/nutrition/meals NutriVision branch', () => {
  it('valid NutriVision payload writes meal_items, corpus, helix, BOS', async () => {
    const res = await POST(makeJsonReq(nvPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meal_id).toBe('meal-uuid-1');
    expect(json.gordon.quality_score).toBe(72);
    expect(json.gordon.quality_tier).toBe('good');
    expect(json.helix_events_emitted).toEqual(['nutrivision_meal_logged']);
    expect(json.corpus_row_written).toBe(true);
    expect(json.dashboard_crossover.nutrition_dimension_recompute_queued).toBe(true);

    const mealsInserts = mocks.inserts.filter((c) => c.table === 'meals');
    const itemsInserts = mocks.inserts.filter((c) => c.table === 'meal_items');
    expect(mealsInserts).toHaveLength(1);
    expect(itemsInserts).toHaveLength(1);
    const mealRow = mealsInserts[0].rows as { source: string; source_photo_blob_id: string };
    expect(mealRow.source).toBe('nutrivision');
    expect(mealRow.source_photo_blob_id).toBe('11111111-2222-4333-8444-555555555555');
    const itemRows = itemsInserts[0].rows as Array<{
      food_name: string;
      user_modified: boolean;
      position: number;
      source: string;
      user_id: string;
    }>;
    expect(itemRows).toHaveLength(2);
    expect(itemRows[0].food_name).toBe('Grilled chicken breast');
    expect(itemRows[1].user_modified).toBe(true);
    // Phase 1q hotfix 2: column is `position` (not `item_index`) per live schema.
    expect(itemRows[0].position).toBe(0);
    expect(itemRows[1].position).toBe(1);
    expect(itemRows[0].source).toBe('nutrivision');
    expect(itemRows[0].user_id).toBe('u-1');

    expect(mocks.writeCorpusRow).toHaveBeenCalledTimes(1);
    expect(mocks.awardNutriVisionHelixEvents).toHaveBeenCalledTimes(1);
    expect(mocks.recomputeNutritionDimension).toHaveBeenCalledTimes(1);
    // Legacy Helix awarder should NOT be called on the NutriVision branch.
    expect(mocks.awardNutritionLogPoints).not.toHaveBeenCalled();

    // Hotfix 7 (#170 Phase 1q): NutriVision dual-writes to legacy meal_logs
    // so dashboard daily-scores panel + nutrition score card pick up the
    // save alongside the Quick Logs surface.
    const legacyInserts = mocks.inserts.filter((c) => c.table === 'meal_logs');
    expect(legacyInserts).toHaveLength(1);
    const legacyRow = legacyInserts[0].rows as {
      user_id: string;
      meal_type: string;
      log_method: string;
      source_app: string;
      meal_date: string;
      description: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      meal_score: number | null;
    };
    expect(legacyRow.user_id).toBe('u-1');
    expect(legacyRow.meal_type).toBe('lunch');
    expect(legacyRow.log_method).toBe('photo_ai');
    expect(legacyRow.source_app).toBe('nutrivision');
    expect(legacyRow.meal_date).toBe('2026-05-28');
    expect(legacyRow.description).toBe('Grilled chicken breast, Steamed broccoli');
    expect(legacyRow.meal_score).toBe(72);
  });

  it('existing quick_log payload still works (regression)', async () => {
    const res = await POST(makeJsonReq(legacyPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meal_id).toBe('meal-uuid-1');
    expect(json.quality_score).toBe(72);
    expect(json.quality_tier).toBe('good');
    expect(mocks.awardNutritionLogPoints).toHaveBeenCalledTimes(1);
    // NutriVision-only side effects should not fire on the legacy branch.
    expect(mocks.awardNutriVisionHelixEvents).not.toHaveBeenCalled();
    expect(mocks.writeCorpusRow).not.toHaveBeenCalled();
  });

  it('returns 400 when payload matches neither schema', async () => {
    const res = await POST(
      makeJsonReq({
        logged_at: '2026-05-28T12:00:00.000Z',
        meal_type: 'lunch',
        source: 'nutrivision',
        // missing items: schema fails NutriVision validation
        // and lacks the legacy required fields too.
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid payload');
    expect(Array.isArray(json.nutrivision_issues)).toBe(true);
    expect(Array.isArray(json.legacy_issues)).toBe(true);
  });

  it('NutriVision continues with corpus_row_written=false if writer fails', async () => {
    mocks.writeCorpusRow.mockRejectedValueOnce(new Error('boom'));
    const res = await POST(makeJsonReq(nvPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.corpus_row_written).toBe(false);
    // Helix + BOS still fire.
    expect(mocks.awardNutriVisionHelixEvents).toHaveBeenCalledTimes(1);
    expect(mocks.recomputeNutritionDimension).toHaveBeenCalledTimes(1);
  });
});
