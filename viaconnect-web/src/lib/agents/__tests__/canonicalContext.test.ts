/**
 * src/lib/agents/__tests__/canonicalContext.test.ts
 *
 * TDD tests for buildCanonicalContext (Prompt 208a Task K2).
 * Mocks admin + read helpers. Verifies assembly + fail-open contract.
 *
 * No em/en-dashes. No emojis. No new dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock helpers before importing the module under test
// ---------------------------------------------------------------------------

// Mock getQualifiedUserVariants
vi.mock('@/lib/genetics/qc/qualifiedVariants', () => ({
  getQualifiedUserVariants: vi.fn(),
}));

// Mock getLatestUserHealthContext
vi.mock('@/lib/protocol/healthContext', () => ({
  getLatestUserHealthContext: vi.fn(),
}));

// Mock getUserAncestry
vi.mock('@/lib/genetics/ancestry/populationMatch', () => ({
  getUserAncestry: vi.fn(),
}));

// Mock createAdminClient so DB calls are controlled
const mockFrom = vi.fn();
const mockAdminClient = { from: mockFrom };

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

// Mock safeLog so tests do not emit noise
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { buildCanonicalContext } from '@/lib/agents/canonicalContext';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { getLatestUserHealthContext } from '@/lib/protocol/healthContext';
import { getUserAncestry } from '@/lib/genetics/ancestry/populationMatch';

// ---------------------------------------------------------------------------
// Helpers to set up fluent Supabase chain mocks
// ---------------------------------------------------------------------------

function makeQueryChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain['maybeSingle'] = vi.fn(() => Promise.resolve(resolveWith));
  chain['insert'] = vi.fn(() => Promise.resolve({ error: null }));
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildCanonicalContext', () => {
  const USER_ID = 'user-k2-test';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('assembles variants, healthContext, ancestry, pathways, concordance and persists', async () => {
    // Arrange: qualified variants
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'CT', panel_key: 'genex-m', status: 'moderate' },
      { rsid: 'rs4680', gene: 'COMT', genotype: 'AA', panel_key: 'genex-m', status: 'typical' },
    ]);

    // Arrange: health context
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: ['peanuts'],
      medications: ['metformin'],
      goals: ['energy'],
      pregnancyStatus: null,
      age: 45,
    });

    // Arrange: ancestry
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue(['european']);

    // Arrange: pathway_scores and concordance DB reads + insert
    const pathwayChain = makeQueryChain({ data: [{ pathway: 'methylation', score: 0.8 }], error: null });
    const concordanceChain = makeQueryChain({ data: [{ rsid: 'rs1801133', concordant: true }], error: null });
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pathway_scores') return pathwayChain;
      if (table === 'genotype_phenotype_concordance') return concordanceChain;
      if (table === 'user_context_canonical') return insertChain;
      return makeQueryChain({ data: null, error: null });
    });

    // Act
    const result = await buildCanonicalContext(USER_ID);

    // Assert structure
    expect(result).toBeDefined();
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0]).toEqual({ rsid: 'rs1801133', gene: 'MTHFR', status: 'moderate' });
    expect(result.variants[1]).toEqual({ rsid: 'rs4680', gene: 'COMT', status: 'typical' });
    expect(result.healthContext.allergies).toEqual(['peanuts']);
    expect(result.healthContext.medications).toEqual(['metformin']);
    expect(result.healthContext.goals).toEqual(['energy']);
    expect(result.ancestry).toEqual(['european']);
    expect(result.pathways).toEqual([{ pathway: 'methylation', score: 0.8 }]);
    expect(result.concordance).toEqual([{ rsid: 'rs1801133', concordant: true }]);

    // Assert persist was attempted
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        version: 1,
        context: expect.any(Object),
      }),
    );
  });

  it('returns a valid empty-ish context when getQualifiedUserVariants throws (fail-open)', async () => {
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db timeout'));
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const pathwayChain = makeQueryChain({ data: [], error: null });
    const concordanceChain = makeQueryChain({ data: [], error: null });
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pathway_scores') return pathwayChain;
      if (table === 'genotype_phenotype_concordance') return concordanceChain;
      if (table === 'user_context_canonical') return insertChain;
      return makeQueryChain({ data: null, error: null });
    });

    const result = await buildCanonicalContext(USER_ID);

    expect(result).toBeDefined();
    expect(result.variants).toEqual([]);
    expect(result.healthContext.allergies).toEqual([]);
    expect(result.ancestry).toEqual([]);
  });

  it('does not throw when pathway_scores read returns an error (fail-open)', async () => {
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const pathwayChain = makeQueryChain({ data: null, error: { message: 'table not found' } });
    const concordanceChain = makeQueryChain({ data: [], error: null });
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pathway_scores') return pathwayChain;
      if (table === 'genotype_phenotype_concordance') return concordanceChain;
      if (table === 'user_context_canonical') return insertChain;
      return makeQueryChain({ data: null, error: null });
    });

    await expect(buildCanonicalContext(USER_ID)).resolves.toBeDefined();

    const result = await buildCanonicalContext(USER_ID);
    expect(result.pathways).toEqual([]);
  });

  it('does not throw when persist fails (fail-open)', async () => {
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const pathwayChain = makeQueryChain({ data: [], error: null });
    const concordanceChain = makeQueryChain({ data: [], error: null });
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: { message: 'insert failed' } }) };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pathway_scores') return pathwayChain;
      if (table === 'genotype_phenotype_concordance') return concordanceChain;
      if (table === 'user_context_canonical') return insertChain;
      return makeQueryChain({ data: null, error: null });
    });

    await expect(buildCanonicalContext(USER_ID)).resolves.toBeDefined();
  });

  it('does not throw on a completely unexpected internal error (fail-open top-level)', async () => {
    // Make createAdminClient throw
    const { createAdminClient } = await import('@/lib/supabase/admin');
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('env missing');
    });

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(buildCanonicalContext(USER_ID)).resolves.toBeDefined();
  });
});
