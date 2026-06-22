/**
 * Unit tests for compoundLoad.ts (Prompt 208b Task 4.6-T2).
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * cyp1a2Context and assessCaffeineLoad are pure/deterministic.
 * computeAndPersistCompoundLoad is best-effort fail-open.
 * Sleep/heart-rate cross-check is FLAG-OFF and DEGRADED (not tested here; not computed).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock admin client and getQualifiedUserVariants.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/genetics/qc/qualifiedVariants', () => ({
  getQualifiedUserVariants: vi.fn(),
}));

import {
  cyp1a2Context,
  assessCaffeineLoad,
  computeAndPersistCompoundLoad,
} from '../compoundLoad';
import type { CompoundLoad } from '../compoundLoad';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

// Builds a minimal Supabase-like admin client mock.
// - meal_items: resolves with foodRows
// - user_current_supplements: resolves with suppRows
// - active_compound_load: exposes an insertMock
// Pass throwOnTable to make a table's select/from call throw.
function makeAdminMock(opts: {
  foodRows?: Array<Record<string, unknown>> | null;
  foodError?: object | null;
  suppRows?: Array<Record<string, unknown>> | null;
  suppError?: object | null;
  insertMock?: ReturnType<typeof vi.fn>;
  throwOnTable?: string;
}) {
  const insertMock =
    opts.insertMock ?? vi.fn().mockResolvedValue({ data: null, error: null });

  // Build a fluent select chain that resolves at await (the chain is thenable).
  function buildSelectChain(
    rows: Array<Record<string, unknown>> | null,
    error: object | null,
  ) {
    const result = { data: rows ?? null, error: error ?? null };
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(result),
    };
    (chain as { then: unknown }).then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return chain;
  }

  return {
    insertMock,
    client: {
      from: vi.fn().mockImplementation((table: string) => {
        if (opts.throwOnTable === table) {
          return {
            select: vi.fn().mockImplementation(() => {
              throw new Error(`${table} read failed`);
            }),
            insert: vi.fn().mockImplementation(() => {
              throw new Error(`${table} insert failed`);
            }),
          };
        }
        if (table === 'meal_items') {
          return buildSelectChain(opts.foodRows ?? null, opts.foodError ?? null);
        }
        if (table === 'user_current_supplements') {
          return buildSelectChain(opts.suppRows ?? null, opts.suppError ?? null);
        }
        // active_compound_load
        return { insert: insertMock };
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// cyp1a2Context -- PURE
// ===========================================================================

describe('cyp1a2Context', () => {
  it("maps 'AA' to 'rapid'", () => {
    expect(cyp1a2Context('AA')).toBe('rapid');
  });

  it("maps 'aa' (lowercase) to 'rapid' after normalization", () => {
    expect(cyp1a2Context('aa')).toBe('rapid');
  });

  it("maps 'A/C' to 'intermediate'", () => {
    expect(cyp1a2Context('A/C')).toBe('intermediate');
  });

  it("maps 'CA' to 'intermediate'", () => {
    expect(cyp1a2Context('CA')).toBe('intermediate');
  });

  it("maps 'C/A' to 'intermediate'", () => {
    expect(cyp1a2Context('C/A')).toBe('intermediate');
  });

  it("maps 'AC' to 'intermediate'", () => {
    expect(cyp1a2Context('AC')).toBe('intermediate');
  });

  it("maps 'CC' to 'slow'", () => {
    expect(cyp1a2Context('CC')).toBe('slow');
  });

  it("maps null to 'unknown'", () => {
    expect(cyp1a2Context(null)).toBe('unknown');
  });

  it("maps '--' (no-call) to 'unknown'", () => {
    expect(cyp1a2Context('--')).toBe('unknown');
  });

  it("maps empty string to 'unknown'", () => {
    expect(cyp1a2Context('')).toBe('unknown');
  });

  it("maps an unrecognized genotype to 'unknown'", () => {
    expect(cyp1a2Context('GG')).toBe('unknown');
  });

  it('is deterministic for the same input', () => {
    expect(cyp1a2Context('AA')).toBe(cyp1a2Context('AA'));
  });
});

// ===========================================================================
// assessCaffeineLoad -- PURE
// ===========================================================================

describe('assessCaffeineLoad', () => {
  it('returns low for 150 mg (any metabolizer)', () => {
    const result = assessCaffeineLoad(150, 'rapid');
    expect(result.level).toBe('low');
    expect(result.slowMetabolizerCaution).toBe(false);
  });

  it('returns moderate for 300 mg (rapid metabolizer)', () => {
    const result = assessCaffeineLoad(300, 'rapid');
    expect(result.level).toBe('moderate');
    expect(result.slowMetabolizerCaution).toBe(false);
  });

  it('returns high for 500 mg', () => {
    const result = assessCaffeineLoad(500, 'intermediate');
    expect(result.level).toBe('high');
  });

  it('slow metabolizer + 300 mg -> slowMetabolizerCaution true', () => {
    const result = assessCaffeineLoad(300, 'slow');
    expect(result.slowMetabolizerCaution).toBe(true);
  });

  it('rapid metabolizer + 300 mg -> slowMetabolizerCaution false', () => {
    const result = assessCaffeineLoad(300, 'rapid');
    expect(result.slowMetabolizerCaution).toBe(false);
  });

  it('slow metabolizer + 100 mg -> slowMetabolizerCaution false (below 200 threshold)', () => {
    const result = assessCaffeineLoad(100, 'slow');
    expect(result.slowMetabolizerCaution).toBe(false);
  });

  it('boundary: exactly 200 mg -> moderate, not low', () => {
    expect(assessCaffeineLoad(200, 'unknown').level).toBe('moderate');
  });

  it('boundary: exactly 400 mg -> moderate, not high', () => {
    expect(assessCaffeineLoad(400, 'unknown').level).toBe('moderate');
  });

  it('boundary: 401 mg -> high', () => {
    expect(assessCaffeineLoad(401, 'unknown').level).toBe('high');
  });

  it('slow + exactly 200 mg -> slowMetabolizerCaution true', () => {
    expect(assessCaffeineLoad(200, 'slow').slowMetabolizerCaution).toBe(true);
  });

  it('is deterministic for the same input', () => {
    const a = assessCaffeineLoad(300, 'slow');
    const b = assessCaffeineLoad(300, 'slow');
    expect(a.level).toBe(b.level);
    expect(a.slowMetabolizerCaution).toBe(b.slowMetabolizerCaution);
  });
});

// ===========================================================================
// computeAndPersistCompoundLoad -- best-effort, fail-open
// ===========================================================================

describe('computeAndPersistCompoundLoad', () => {
  it('sums food + supplement caffeine and persists one row', async () => {
    const userId = 'user-normal';
    // food: 200 mg (two meal_items)
    const { client, insertMock } = makeAdminMock({
      foodRows: [
        { caffeine_mg: 150, meals: { logged_at: '2026-06-22T08:00:00Z', user_id: userId } },
        { caffeine_mg: 50, meals: { logged_at: '2026-06-22T10:00:00Z', user_id: userId } },
      ],
      // user_current_supplements returns nothing (no slug match in masterFormulations for caffeine)
      suppRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs762551', gene: 'CYP1A2', genotype: 'AA', panel_key: 'methylation', status: null },
    ]);

    const result: CompoundLoad = await computeAndPersistCompoundLoad(userId);

    expect(result.compound).toBe('caffeine');
    expect(result.foodSourceTotal).toBe(200);
    expect(result.supplementSourceTotal).toBe(0);
    expect(result.total).toBe(200);
    expect(result.metabolizerContext).toBe('rapid');

    expect(insertMock).toHaveBeenCalledOnce();
    const inserted = insertMock.mock.calls[0][0];
    expect(inserted).toMatchObject({
      user_id: userId,
      compound: 'caffeine',
      food_source_total: 200,
      supplement_source_total: 0,
      total: 200,
      metabolizer_context: 'rapid',
    });
  });

  it('food read error degrades food to 0, still returns valid object and does not throw', async () => {
    const userId = 'user-food-error';
    const { client } = makeAdminMock({
      throwOnTable: 'meal_items',
      suppRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await computeAndPersistCompoundLoad(userId);

    expect(result.foodSourceTotal).toBe(0);
    expect(result.total).toBe(0);
    expect(result.metabolizerContext).toBe('unknown');
  });

  it('supplement read error degrades supplement to 0, still returns valid object and does not throw', async () => {
    const userId = 'user-supp-error';
    const { client } = makeAdminMock({
      foodRows: [
        { caffeine_mg: 100, meals: { logged_at: '2026-06-22T09:00:00Z', user_id: userId } },
      ],
      throwOnTable: 'user_current_supplements',
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await computeAndPersistCompoundLoad(userId);

    expect(result.foodSourceTotal).toBe(100);
    expect(result.supplementSourceTotal).toBe(0);
    expect(result.total).toBe(100);
  });

  it('no variant row -> metabolizer unknown', async () => {
    const userId = 'user-no-variant';
    const { client } = makeAdminMock({ foodRows: [], suppRows: [] });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await computeAndPersistCompoundLoad(userId);

    expect(result.metabolizerContext).toBe('unknown');
  });

  it('persist insert failure does not prevent return of valid object', async () => {
    const userId = 'user-insert-fail';
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const { client } = makeAdminMock({
      foodRows: [
        { caffeine_mg: 200, meals: { logged_at: '2026-06-22T08:00:00Z', user_id: userId } },
      ],
      suppRows: [],
      insertMock,
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await computeAndPersistCompoundLoad(userId);

    expect(result.foodSourceTotal).toBe(200);
    expect(result.total).toBe(200);
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('never throws when createAdminClient itself throws', async () => {
    const userId = 'user-no-client';
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    });
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await computeAndPersistCompoundLoad(userId);

    expect(result.foodSourceTotal).toBe(0);
    expect(result.supplementSourceTotal).toBe(0);
    expect(result.total).toBe(0);
    expect(result.metabolizerContext).toBe('unknown');
  });

  it('never throws when getQualifiedUserVariants throws', async () => {
    const userId = 'user-variant-throw';
    const { client } = makeAdminMock({ foodRows: [], suppRows: [] });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('variant read failed'),
    );

    const result = await computeAndPersistCompoundLoad(userId);

    expect(result.metabolizerContext).toBe('unknown');
  });

  it('defaults compound to caffeine when not supplied', async () => {
    const userId = 'user-default-compound';
    const { client } = makeAdminMock({ foodRows: [], suppRows: [] });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await computeAndPersistCompoundLoad(userId);

    expect(result.compound).toBe('caffeine');
  });

  it('rs762551 CC genotype -> metabolizer slow', async () => {
    const userId = 'user-slow';
    const { client } = makeAdminMock({ foodRows: [], suppRows: [] });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs762551', gene: 'CYP1A2', genotype: 'CC', panel_key: 'methylation', status: null },
    ]);

    const result = await computeAndPersistCompoundLoad(userId);

    expect(result.metabolizerContext).toBe('slow');
  });
});
