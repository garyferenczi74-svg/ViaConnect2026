/**
 * Unit tests for src/lib/protocol/medicationReconciliation.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208b, Task 4.9 (2026-06-22): unified medication reconciliation.
 * One source (the user's medications) fans out to four downstream reads:
 *   nutrition (drug-nutrient depletion), genetics (pgx metabolizer),
 *   supplements (interaction notes), labs (biomarkers to monitor).
 *
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the single medication source so we control the user's med list.
// ---------------------------------------------------------------------------
vi.mock('../healthContext', () => ({
  getLatestUserHealthContext: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock safeLog so logging never noises the test output.
// ---------------------------------------------------------------------------
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Mock the admin client factory; tests inject a per-table chainable mock.
// ---------------------------------------------------------------------------
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import {
  MED_PGX_GENE,
  depletionBiomarker,
  reconcileMedications,
} from '../medicationReconciliation';
import { getLatestUserHealthContext } from '../healthContext';
import { createAdminClient } from '@/lib/supabase/admin';

const mockGetHealthContext = getLatestUserHealthContext as unknown as ReturnType<typeof vi.fn>;
const mockCreateAdminClient = createAdminClient as unknown as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Admin client mock: one `from(table)` chain per table.
//
// diplotype_calls read:        from -> select -> eq(user_id) -> eq(gene)
//                               -> order -> limit -> maybeSingle
// user_current_supplements:    from -> select -> eq(user_id) -> eq(is_current) [then-able]
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: unknown };

interface TableConfig {
  /** Result for a maybeSingle() terminal read (diplotype_calls). */
  single?: MockResult;
  /** Result for a then-able terminal read (user_current_supplements). */
  list?: MockResult;
  /** When true, every method on the chain throws (simulates a hard failure). */
  throws?: boolean;
}

function makeAdminClient(configs: Record<string, TableConfig>): { from: ReturnType<typeof vi.fn> } {
  const from = vi.fn().mockImplementation((table: string) => {
    const cfg = configs[table] ?? {};
    if (cfg.throws) {
      throw new Error(`boom: ${table}`);
    }
    const single: MockResult = cfg.single ?? { data: null, error: null };
    const list: MockResult = cfg.list ?? { data: null, error: null };

    const maybeSingle = vi.fn().mockResolvedValue(single);
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });

    // eq() can chain arbitrarily; each level supports the next-needed terminal.
    // Note: eq is lazily built (mockImplementation, not mockReturnValue) so the
    // chain is not eagerly recursed into infinity at construction time.
    function eqNode(): unknown {
      return {
        eq: vi.fn().mockImplementation(() => eqNode()),
        order,
        maybeSingle,
        // then-able for list reads that resolve after the eq chain.
        then: (resolve: (v: MockResult) => unknown) => Promise.resolve(list).then(resolve),
      };
    }

    const select = vi.fn().mockReturnValue(eqNode());
    return { select };
  });

  return { from };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// depletionBiomarker (PURE)
// ===========================================================================

describe('depletionBiomarker', () => {
  it("maps 'vitamin b12' to vitamin_b12 (case-insensitive)", () => {
    expect(depletionBiomarker('vitamin b12')).toBe('vitamin_b12');
    expect(depletionBiomarker('Vitamin B12')).toBe('vitamin_b12');
  });

  it("maps 'magnesium' to magnesium", () => {
    expect(depletionBiomarker('magnesium')).toBe('magnesium');
  });

  it("maps 'potassium' to potassium", () => {
    expect(depletionBiomarker('potassium')).toBe('potassium');
  });

  it("returns null for 'coq10' (no routine lab biomarker)", () => {
    expect(depletionBiomarker('CoQ10')).toBeNull();
    expect(depletionBiomarker('coq10')).toBeNull();
  });

  it('returns null for an unknown nutrient', () => {
    expect(depletionBiomarker('selenium')).toBeNull();
    expect(depletionBiomarker('')).toBeNull();
  });
});

// ===========================================================================
// MED_PGX_GENE (well-established medication -> primary CYP gene)
// ===========================================================================

describe('MED_PGX_GENE', () => {
  it("maps 'clopidogrel' to CYP2C19", () => {
    expect(MED_PGX_GENE['clopidogrel']).toBe('CYP2C19');
  });

  it("maps 'plavix' (brand) to CYP2C19", () => {
    expect(MED_PGX_GENE['plavix']).toBe('CYP2C19');
  });

  it("maps 'codeine' to CYP2D6 and 'warfarin' to CYP2C9", () => {
    expect(MED_PGX_GENE['codeine']).toBe('CYP2D6');
    expect(MED_PGX_GENE['warfarin']).toBe('CYP2C9');
  });

  it('has no entry for an unknown medication', () => {
    expect(MED_PGX_GENE['ibuprofen']).toBeUndefined();
  });

  it('only references genes the diplotype engine can call (CYP2C19, CYP2D6, CYP2C9)', () => {
    const allowed = new Set(['CYP2C19', 'CYP2D6', 'CYP2C9']);
    for (const gene of Object.values(MED_PGX_GENE)) {
      expect(allowed.has(gene)).toBe(true);
    }
  });

  it('uses lowercased keys', () => {
    for (const key of Object.keys(MED_PGX_GENE)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});

// ===========================================================================
// reconcileMedications (the unified reconciliation)
// ===========================================================================

describe('reconcileMedications', () => {
  it('returns [] when the user has no medications', async () => {
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    mockCreateAdminClient.mockReturnValue(makeAdminClient({}));

    const result = await reconcileMedications('user-1');
    expect(result).toEqual([]);
  });

  it('produces a vitamin B12 depletion + monitorBiomarkers ["vitamin_b12"] for metformin', async () => {
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: ['Metformin 500mg'],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    // No diplotype rows, empty stack.
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        diplotype_calls: { single: { data: null, error: null } },
        user_current_supplements: { list: { data: [], error: null } },
      }),
    );

    const result = await reconcileMedications('user-1');
    expect(result).toHaveLength(1);
    const rec = result[0];
    expect(rec.medication).toBe('Metformin 500mg');

    const b12 = rec.depletions.find((d) => /b12/i.test(d.nutrient));
    expect(b12).toBeDefined();
    expect(b12!.mechanism.length).toBeGreaterThan(0);

    expect(rec.monitorBiomarkers).toContain('vitamin_b12');
    // metformin is not in MED_PGX_GENE -> no pgx.
    expect(rec.pgxGene).toBeNull();
    expect(rec.pgxMetabolizer).toBeNull();
    // No callable supplement interactions for an empty stack.
    expect(rec.interactionNotes).toEqual([]);
  });

  it('resolves pgxGene CYP2C19 and pgxMetabolizer from the diplotype_calls row for clopidogrel', async () => {
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: ['clopidogrel'],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        diplotype_calls: {
          single: {
            data: { gene: 'CYP2C19', metabolizer_phenotype: 'poor' },
            error: null,
          },
        },
        user_current_supplements: { list: { data: [], error: null } },
      }),
    );

    const result = await reconcileMedications('user-1');
    expect(result).toHaveLength(1);
    const rec = result[0];
    expect(rec.pgxGene).toBe('CYP2C19');
    expect(rec.pgxMetabolizer).toBe('poor');
    // clopidogrel has no curated drug-nutrient depletion -> none expected.
    expect(rec.monitorBiomarkers).toEqual([]);
  });

  it('degrades pgxMetabolizer to null when no diplotype row exists for the gene', async () => {
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: ['codeine'],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        diplotype_calls: { single: { data: null, error: null } },
        user_current_supplements: { list: { data: [], error: null } },
      }),
    );

    const result = await reconcileMedications('user-1');
    const rec = result[0];
    expect(rec.pgxGene).toBe('CYP2D6');
    expect(rec.pgxMetabolizer).toBeNull();
  });

  it('emits an interaction note when the stack interacts with the medication', async () => {
    // MTHFR+ x methotrexate is a curated critical interaction in the engine.
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: ['methotrexate'],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        diplotype_calls: { single: { data: null, error: null } },
        user_current_supplements: {
          list: { data: [{ supplement_name: 'MTHFR+' }], error: null },
        },
      }),
    );

    const result = await reconcileMedications('user-1');
    const rec = result[0];
    expect(rec.interactionNotes.length).toBeGreaterThan(0);
    expect(rec.interactionNotes.join(' ').toLowerCase()).toContain('mthfr+');
  });

  it('degrades interactionNotes to [] when the supplement-stack read fails (no fabrication)', async () => {
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: ['methotrexate'],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        diplotype_calls: { single: { data: null, error: null } },
        user_current_supplements: { list: { data: null, error: { message: 'rls denied' } } },
      }),
    );

    const result = await reconcileMedications('user-1');
    const rec = result[0];
    expect(rec.interactionNotes).toEqual([]);
  });

  it('fails open with [] when the medication read throws (never propagates)', async () => {
    mockGetHealthContext.mockRejectedValue(new Error('health context exploded'));
    mockCreateAdminClient.mockReturnValue(makeAdminClient({}));

    const result = await reconcileMedications('user-1');
    expect(result).toEqual([]);
  });

  it('fails open with [] when the admin client cannot be created', async () => {
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: ['metformin'],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    mockCreateAdminClient.mockImplementation(() => {
      throw new Error('no service role key');
    });

    // Should not throw; depletions still computable, genetics/interactions degrade.
    const result = await reconcileMedications('user-1');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].pgxMetabolizer).toBeNull();
    expect(result[0].interactionNotes).toEqual([]);
    // The nutrition fan-out is pure and must survive an admin-client failure.
    expect(result[0].monitorBiomarkers).toContain('vitamin_b12');
  });

  it('produces one reconciliation per medication', async () => {
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: ['metformin', 'omeprazole'],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        diplotype_calls: { single: { data: null, error: null } },
        user_current_supplements: { list: { data: [], error: null } },
      }),
    );

    const result = await reconcileMedications('user-1');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.medication)).toEqual(['metformin', 'omeprazole']);
    // omeprazole (a PPI) -> CYP2C19 pgx gene + magnesium/B12 depletions.
    const ome = result.find((r) => r.medication === 'omeprazole')!;
    expect(ome.pgxGene).toBe('CYP2C19');
    expect(ome.monitorBiomarkers).toEqual(
      expect.arrayContaining(['magnesium', 'vitamin_b12']),
    );
  });

  it('dedupes monitorBiomarkers', async () => {
    mockGetHealthContext.mockResolvedValue({
      allergies: [],
      medications: ['omeprazole'],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        diplotype_calls: { single: { data: null, error: null } },
        user_current_supplements: { list: { data: [], error: null } },
      }),
    );

    const result = await reconcileMedications('user-1');
    const biomarkers = result[0].monitorBiomarkers;
    expect(new Set(biomarkers).size).toBe(biomarkers.length);
  });
});
