// Prompt #170 Phase 1h: tests for the user_meal_corpus writer.
// Covers the pure helpers (deriveDominantCuisine + collectOilSelections),
// the happy path (writeCorpusRow with full inputs), the quick_log variant
// (no recognition payload), and the error propagation path.

import { describe, it, expect, vi } from 'vitest';
import { writeCorpusRow, deriveDominantCuisine, collectOilSelections } from '../writer';
import type {
  CorpusFinalState,
  CorpusFinalStateItem,
} from '../writer';
import type { CuisineTag } from '../../vision/types';
import type { CookingOilSelection } from '../../cooking-oil/suggester';

function item(overrides: Partial<CorpusFinalStateItem> = {}): CorpusFinalStateItem {
  return {
    foodName: 'Salad',
    portionGrams: 150,
    calories_kcal: 200,
    protein_g: 5,
    carbs_g: 20,
    fat_g: 10,
    userModified: false,
    ...overrides,
  };
}

function oil(overrides: Partial<CookingOilSelection> = {}): CookingOilSelection {
  return {
    type: 'olive_oil',
    amount_ml: 5,
    was_suggested_default: true,
    suggested_default_type: 'olive_oil',
    suggested_default_amount_ml: 5,
    ...overrides,
  };
}

function makeFinalState(overrides: Partial<CorpusFinalState> = {}): CorpusFinalState {
  return {
    mealId: '00000000-0000-0000-0000-000000000abc',
    source: 'nutrivision',
    items: [item()],
    totals: { calories_kcal: 200, protein_g: 5, carbs_g: 20, fat_g: 10 },
    mealConfidence: 0.9,
    ...overrides,
  };
}

interface InsertedRow {
  user_hash: string;
  salt_version: number;
  meal_id: string;
  source: string;
  cuisine_tag: string | null;
  recognition_payload_json: unknown;
  final_state_json: unknown;
  edit_diff_json: unknown;
  cooking_oil_json: unknown[];
  meal_confidence: number | null;
  user_modified: boolean;
  contributed_photo_path: string | null;
}

function buildFakeClient(opts: {
  saltValue?: string;
  saltError?: { message: string } | null;
  insertResult: { data: unknown; error: { message: string } | null };
  captureInsert?: (row: InsertedRow) => void;
}): {
  client: Parameters<typeof writeCorpusRow>[0]['supabaseAdmin'];
  rpcCalls: string[];
  fromCalls: string[];
} {
  const rpcCalls: string[] = [];
  const fromCalls: string[] = [];

  const rpc = vi.fn(async (fn: string) => {
    rpcCalls.push(fn);
    if (opts.saltError) return { data: null, error: opts.saltError };
    return { data: opts.saltValue ?? 'test-salt', error: null };
  });

  const insert = vi.fn((row: InsertedRow) => {
    opts.captureInsert?.(row);
    return {
      select: vi.fn(() => ({
        single: vi.fn(async () => opts.insertResult),
      })),
    };
  });

  const from = vi.fn((tableName: string) => {
    fromCalls.push(tableName);
    return { insert };
  });

  const client = { rpc, from } as unknown as Parameters<typeof writeCorpusRow>[0]['supabaseAdmin'];
  return { client, rpcCalls, fromCalls };
}

describe('deriveDominantCuisine', () => {
  it('returns unknown for an empty array', () => {
    expect(deriveDominantCuisine([])).toBe('unknown');
  });

  it('returns the cuisine of a single tagged item', () => {
    expect(deriveDominantCuisine([{ cuisineTag: 'mediterranean' }])).toBe('mediterranean');
  });

  it('returns unknown when no item has a cuisine tag', () => {
    expect(deriveDominantCuisine([{}, {}])).toBe('unknown');
  });

  it('skips items whose cuisineTag is explicitly unknown', () => {
    expect(
      deriveDominantCuisine([
        { cuisineTag: 'unknown' as CuisineTag },
        { cuisineTag: 'east_asian' },
      ]),
    ).toBe('east_asian');
  });

  it('returns the first-seen tag on a tie', () => {
    const result = deriveDominantCuisine([
      { cuisineTag: 'mediterranean' },
      { cuisineTag: 'east_asian' },
      { cuisineTag: 'mediterranean' },
      { cuisineTag: 'east_asian' },
    ]);
    expect(result).toBe('mediterranean');
  });

  it('returns the plurality winner', () => {
    const result = deriveDominantCuisine([
      { cuisineTag: 'mediterranean' },
      { cuisineTag: 'east_asian' },
      { cuisineTag: 'east_asian' },
      { cuisineTag: 'east_asian' },
    ]);
    expect(result).toBe('east_asian');
  });
});

describe('collectOilSelections', () => {
  it('returns oil objects only, skipping items without oil', () => {
    const a = oil({ type: 'olive_oil' });
    const b = oil({ type: 'sesame_oil' });
    const items: CorpusFinalStateItem[] = [
      item({ cookingOil: a }),
      item(),
      item({ cookingOil: b }),
    ];
    expect(collectOilSelections(items)).toEqual([a, b]);
  });

  it('returns an empty array when no items have oil', () => {
    expect(collectOilSelections([item(), item()])).toEqual([]);
  });
});

describe('writeCorpusRow', () => {
  it('persists userHash, saltVersion, and a null cuisine_tag when items are tag-less', async () => {
    let captured: InsertedRow | undefined;
    const { client, rpcCalls, fromCalls } = buildFakeClient({
      insertResult: { data: { id: 'corpus-row-id' }, error: null },
      captureInsert: (row) => {
        captured = row;
      },
    });

    const finalState = makeFinalState({
      items: [item({ userModified: true }), item({ userModified: false })],
    });

    const result = await writeCorpusRow({
      supabaseAdmin: client,
      userId: 'user-1',
      finalState,
      requestId: 'req-1',
    });

    expect(rpcCalls).toEqual(['get_corpus_salt']);
    expect(fromCalls).toEqual(['user_meal_corpus']);
    expect(captured).toBeDefined();
    expect(captured?.user_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(captured?.salt_version).toBe(1);
    expect(captured?.meal_id).toBe(finalState.mealId);
    expect(captured?.cuisine_tag).toBeNull();
    expect(captured?.user_modified).toBe(true);
    expect(captured?.contributed_photo_path).toBeNull();
    expect(captured?.meal_confidence).toBe(0.9);
    expect(result.corpusRowId).toBe('corpus-row-id');
    expect(result.cuisineTag).toBeUndefined();
  });

  it('persists the dominant cuisine tag when items are tagged', async () => {
    let captured: InsertedRow | undefined;
    const { client } = buildFakeClient({
      insertResult: { data: { id: 'corpus-row-id' }, error: null },
      captureInsert: (row) => {
        captured = row;
      },
    });

    const result = await writeCorpusRow({
      supabaseAdmin: client,
      userId: 'user-2',
      finalState: makeFinalState({
        items: [
          item({ cuisineTag: 'east_asian' }),
          item({ cuisineTag: 'east_asian' }),
          item({ cuisineTag: 'mediterranean' }),
        ],
      }),
      requestId: 'req-2',
    });

    expect(captured?.cuisine_tag).toBe('east_asian');
    expect(result.cuisineTag).toBe('east_asian');
  });

  it('sets recognition_payload_json null for quick_log source with no recognition', async () => {
    let captured: InsertedRow | undefined;
    const { client } = buildFakeClient({
      insertResult: { data: { id: 'corpus-row-id' }, error: null },
      captureInsert: (row) => {
        captured = row;
      },
    });

    await writeCorpusRow({
      supabaseAdmin: client,
      userId: 'user-3',
      finalState: makeFinalState({ source: 'quick_log' }),
      requestId: 'req-3',
    });

    expect(captured?.source).toBe('quick_log');
    expect(captured?.recognition_payload_json).toBeNull();
    expect(captured?.edit_diff_json).toBeNull();
  });

  it('rethrows when the insert returns an error', async () => {
    const { client } = buildFakeClient({
      insertResult: { data: null, error: { message: 'rls denied' } },
    });

    await expect(
      writeCorpusRow({
        supabaseAdmin: client,
        userId: 'user-4',
        finalState: makeFinalState(),
        requestId: 'req-4',
      }),
    ).rejects.toThrow(/rls denied/);
  });

  it('rethrows when the insert returns no id', async () => {
    const { client } = buildFakeClient({
      insertResult: { data: null, error: null },
    });

    await expect(
      writeCorpusRow({
        supabaseAdmin: client,
        userId: 'user-5',
        finalState: makeFinalState(),
        requestId: 'req-5',
      }),
    ).rejects.toThrow(/no id/);
  });

  it('passes through contributedPhotoPath verbatim', async () => {
    let captured: InsertedRow | undefined;
    const { client } = buildFakeClient({
      insertResult: { data: { id: 'corpus-row-id' }, error: null },
      captureInsert: (row) => {
        captured = row;
      },
    });

    await writeCorpusRow({
      supabaseAdmin: client,
      userId: 'user-6',
      finalState: makeFinalState(),
      contributedPhotoPath: 'abc123/2026-05-28/uuid.jpg',
      requestId: 'req-6',
    });

    expect(captured?.contributed_photo_path).toBe('abc123/2026-05-28/uuid.jpg');
  });
});
