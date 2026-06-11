// Prompt 187 Task 2: unit tests for the Nutrition by Genetics pure shaping
// helpers and the fail open findings read. Node environment, no DOM.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  applySourcePrecedence,
  fetchActiveFindings,
  groupRecommendations,
  type SupabaseLike,
} from '../recommendations';
import type { NutritionGeneticFinding } from '../types';

function finding(overrides: Partial<NutritionGeneticFinding> = {}): NutritionGeneticFinding {
  return {
    id: 'f-1',
    userId: 'u-1',
    source: 'nutrigendx',
    sourceRefId: 'ref-1',
    category: 'food',
    itemName: 'Spinach',
    itemSlug: 'spinach',
    direction: 'need',
    strength: 'moderate',
    confidence: 'high',
    estimated: false,
    rationale: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    supersededAt: null,
    ...overrides,
  };
}

describe('applySourcePrecedence', () => {
  it('nutrigendx wins an overlapping item_slug regardless of input order', () => {
    const uploaded = finding({
      id: 'u',
      source: 'uploaded_test',
      itemSlug: 'magnesium',
      category: 'mineral',
      itemName: 'Magnesium',
    });
    const panel = finding({
      id: 'n',
      source: 'nutrigendx',
      itemSlug: 'magnesium',
      category: 'mineral',
      itemName: 'Magnesium',
    });

    for (const input of [
      [uploaded, panel],
      [panel, uploaded],
    ]) {
      const out = applySourcePrecedence(input);
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe('n');
    }
  });

  it('uploaded_test fills slugs nutrigendx does not cover', () => {
    const out = applySourcePrecedence([
      finding({
        id: 'n1',
        source: 'nutrigendx',
        itemSlug: 'vitamin-d',
        category: 'vitamin',
        itemName: 'Vitamin D',
      }),
      finding({
        id: 'u1',
        source: 'uploaded_test',
        itemSlug: 'zinc',
        category: 'mineral',
        itemName: 'Zinc',
      }),
    ]);
    expect(out.map((f) => f.id).sort()).toEqual(['n1', 'u1']);
  });

  it('excludes superseded rows even when they are newer than the active one', () => {
    const out = applySourcePrecedence([
      finding({
        id: 'active-upload',
        source: 'uploaded_test',
        itemSlug: 'iron',
        category: 'mineral',
        itemName: 'Iron',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      finding({
        id: 'superseded-panel',
        source: 'nutrigendx',
        itemSlug: 'iron',
        category: 'mineral',
        itemName: 'Iron',
        createdAt: '2026-06-01T00:00:00.000Z',
        supersededAt: '2026-06-02T00:00:00.000Z',
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('active-upload');
  });

  it('orders deterministically by category then itemName', () => {
    const out = applySourcePrecedence([
      finding({ id: 'a', category: 'vitamin', itemName: 'Vitamin D', itemSlug: 'vitamin-d' }),
      finding({ id: 'b', category: 'food', itemName: 'Spinach', itemSlug: 'spinach' }),
      finding({ id: 'c', category: 'food', itemName: 'Kale', itemSlug: 'kale' }),
      finding({ id: 'd', category: 'mineral', itemName: 'Zinc', itemSlug: 'zinc' }),
    ]);
    expect(out.map((f) => f.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

describe('groupRecommendations', () => {
  it('splits need vs avoid into the three named category groups', () => {
    const { needs, avoid } = groupRecommendations([
      finding({ id: '1', direction: 'need', category: 'food', itemSlug: 'salmon', itemName: 'Salmon' }),
      finding({
        id: '2',
        direction: 'need',
        category: 'vitamin',
        itemSlug: 'vitamin-b12',
        itemName: 'Vitamin B12',
      }),
      finding({ id: '3', direction: 'avoid', category: 'mineral', itemSlug: 'sodium', itemName: 'Sodium' }),
      finding({ id: '4', direction: 'avoid', category: 'food', itemSlug: 'gluten', itemName: 'Gluten' }),
    ]);
    expect(needs.food.map((f) => f.id)).toEqual(['1']);
    expect(needs.vitamin.map((f) => f.id)).toEqual(['2']);
    expect(needs.mineral).toEqual([]);
    expect(avoid.mineral.map((f) => f.id)).toEqual(['3']);
    expect(avoid.food.map((f) => f.id)).toEqual(['4']);
    expect(avoid.vitamin).toEqual([]);
  });

  it('excludes neutral and unknown directions from both groups', () => {
    const { needs, avoid } = groupRecommendations([
      finding({ id: 'n', direction: 'neutral', category: 'food' }),
      finding({ id: 'u', direction: 'unknown', category: 'vitamin', itemSlug: 'vitamin-c' }),
    ]);
    for (const group of [needs, avoid]) {
      expect(group.food).toEqual([]);
      expect(group.vitamin).toEqual([]);
      expect(group.mineral).toEqual([]);
      expect(group.other).toBeUndefined();
    }
  });

  it('puts category other into the optional other array, never the named groups', () => {
    const { needs, avoid } = groupRecommendations([
      finding({ id: 'o1', direction: 'need', category: 'other', itemSlug: 'caffeine', itemName: 'Caffeine' }),
    ]);
    expect(needs.other?.map((f) => f.id)).toEqual(['o1']);
    expect(needs.food).toEqual([]);
    expect(needs.vitamin).toEqual([]);
    expect(needs.mineral).toEqual([]);
    expect(avoid.other).toBeUndefined();
  });
});

type QueryOutcome = { data: unknown; error: unknown } | { reject: Error };

// Minimal chainable thenable standing in for the supabase query builder:
// select/eq/is/order return the chain, await consumes the outcome.
function stubClient(outcome: QueryOutcome): SupabaseLike {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'is', 'order']) {
    chain[method] = () => chain;
  }
  chain.then = (
    onFulfilled: (value: { data: unknown; error: unknown }) => void,
    onRejected: (reason: unknown) => void,
  ) => {
    if ('reject' in outcome) {
      onRejected(outcome.reject);
      return;
    }
    onFulfilled({ data: outcome.data, error: outcome.error });
  };
  return { from: () => chain };
}

describe('fetchActiveFindings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps snake_case rows into camelCase findings', async () => {
    const row = {
      id: 'row-1',
      user_id: 'u-1',
      source: 'nutrigendx',
      source_ref_id: 'panel-1',
      category: 'vitamin',
      item_name: 'Vitamin D',
      item_slug: 'vitamin-d',
      direction: 'need',
      strength: 'strong',
      confidence: 'high',
      estimated: false,
      rationale: 'VDR variant',
      created_at: '2026-06-01T00:00:00.000Z',
      superseded_at: null,
    };
    const out = await fetchActiveFindings(stubClient({ data: [row], error: null }), 'u-1');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: 'row-1',
      userId: 'u-1',
      source: 'nutrigendx',
      sourceRefId: 'panel-1',
      itemName: 'Vitamin D',
      itemSlug: 'vitamin-d',
      estimated: false,
      rationale: 'VDR variant',
      supersededAt: null,
    });
  });

  it('fails open to [] with one warn when the read throws', async () => {
    // safeLog.warn emits via console.error per lib/utils/safe-log.
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await fetchActiveFindings(stubClient({ reject: new Error('network down') }), 'u-1');
    expect(out).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('fails open to [] with one warn on a supabase error response', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await fetchActiveFindings(
      stubClient({ data: null, error: { message: 'permission denied' } }),
      'u-1',
    );
    expect(out).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
