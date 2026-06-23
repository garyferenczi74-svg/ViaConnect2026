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

// --- PROMPT 208b 5.1 EXTENSION: mock the composed engines (all fail-open) ---
vi.mock('@/lib/nutrition/intakeReconciliation', () => ({
  buildNutrientIntakeLedger: vi.fn(),
}));
vi.mock('@/lib/wellness/energyBalance', () => ({
  computeAndPersistEnergyBalance: vi.fn(),
}));
vi.mock('@/lib/wellness/compoundLoad', () => ({
  computeAndPersistCompoundLoad: vi.fn(),
}));
vi.mock('@/lib/wellness/hydrationReconciliation', () => ({
  computeAndPersistHydrationReconciliation: vi.fn(),
}));
// stableInputsHash MUST stay real (deterministic) so contractVersion is meaningful;
// only snapshotCorpus is mocked.
vi.mock('@/lib/protocol/recommendationAudit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/protocol/recommendationAudit')>(
    '@/lib/protocol/recommendationAudit',
  );
  return {
    ...actual,
    snapshotCorpus: vi.fn(),
  };
});

import { buildCanonicalContext } from '@/lib/agents/canonicalContext';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { getLatestUserHealthContext } from '@/lib/protocol/healthContext';
import { getUserAncestry } from '@/lib/genetics/ancestry/populationMatch';
import { buildNutrientIntakeLedger } from '@/lib/nutrition/intakeReconciliation';
import { computeAndPersistEnergyBalance } from '@/lib/wellness/energyBalance';
import { computeAndPersistCompoundLoad } from '@/lib/wellness/compoundLoad';
import { computeAndPersistHydrationReconciliation } from '@/lib/wellness/hydrationReconciliation';
import { snapshotCorpus } from '@/lib/protocol/recommendationAudit';

// ---------------------------------------------------------------------------
// Helpers to set up fluent Supabase chain mocks
// ---------------------------------------------------------------------------

function makeQueryChain(resolveWith: { data: unknown; error: unknown }) {
  // The chain must be thenable so `await chain` resolves directly from limit().
  // select/eq/order return the chain; limit() returns a Promise that resolves
  // with resolveWith, matching the real multi-row select behavior (no maybeSingle).
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain['limit'] = vi.fn(() => Promise.resolve(resolveWith));
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

  it('carries all pathway rows when multiple rows are returned (not just one)', async () => {
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const twoPathways = [
      { pathway: 'methylation', score: 0.8 },
      { pathway: 'detox', score: 0.5 },
    ];
    const pathwayChain = makeQueryChain({ data: twoPathways, error: null });
    const concordanceChain = makeQueryChain({ data: [], error: null });
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pathway_scores') return pathwayChain;
      if (table === 'genotype_phenotype_concordance') return concordanceChain;
      if (table === 'user_context_canonical') return insertChain;
      return makeQueryChain({ data: null, error: null });
    });

    const result = await buildCanonicalContext(USER_ID);

    expect(result.pathways).toHaveLength(2);
    expect(result.pathways[0]).toEqual({ pathway: 'methylation', score: 0.8 });
    expect(result.pathways[1]).toEqual({ pathway: 'detox', score: 0.5 });
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

    const result = await buildCanonicalContext(USER_ID);
    expect(result).toBeDefined();
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

// ===========================================================================
// PROMPT 208b 5.1 EXTENSION tests - the full Section 5 contract additions.
// ===========================================================================

describe('buildCanonicalContext - Section 5 contract extension (208b)', () => {
  const USER_ID = 'user-208b-test';

  // Reset the base mocks to a benign empty baseline, then layer per-test.
  function primeBaseMocks() {
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'CT', panel_key: 'genex-m', status: 'moderate' },
    ]);
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: ['peanuts'],
      medications: [],
      goals: ['energy'],
      pregnancyStatus: null,
      age: 40,
    });
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue(['european']);

    // Supplement read (user_current_supplements) ends on limit(); pathways/
    // concordance use the standard chain; persist is a no-op insert.
    const pathwayChain = makeQueryChain({ data: [], error: null });
    const concordanceChain = makeQueryChain({ data: [], error: null });
    const supplementChain = makeQueryChain({
      data: [{ supplement_name: 'Magnesium Glycinate' }, { supplement_name: 'Vitamin D3' }],
      error: null,
    });
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pathway_scores') return pathwayChain;
      if (table === 'genotype_phenotype_concordance') return concordanceChain;
      if (table === 'user_current_supplements') return supplementChain;
      if (table === 'user_context_canonical') return insertChain;
      return makeQueryChain({ data: null, error: null });
    });

    return { insertChain, supplementChain };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('populates nutrition.ledger, supplements.stack, connected (all-null), derived, and provenance', async () => {
    primeBaseMocks();

    const ledgerRows = [
      { nutrient: 'iron', food_contribution: 5, supplement_contribution: 10, total: 15, unit: 'mg', ul_status: 'within' },
    ];
    (buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mockResolvedValue(ledgerRows);

    const energy = { intakeEstimate: 2000, expenditureEstimate: null, compositionTrend: 'flat', balanceState: 'maintenance' };
    const compound = { compound: 'caffeine', foodSourceTotal: 120, supplementSourceTotal: 0, total: 120, metabolizerContext: 'rapid' };
    const hydration = { baseTargetMl: 2400, activityAdjustedTargetMl: 2400, electrolyteContext: 'unknown', bodyWaterContext: 'unknown' };
    (computeAndPersistEnergyBalance as ReturnType<typeof vi.fn>).mockResolvedValue(energy);
    (computeAndPersistCompoundLoad as ReturnType<typeof vi.fn>).mockResolvedValue(compound);
    (computeAndPersistHydrationReconciliation as ReturnType<typeof vi.fn>).mockResolvedValue(hydration);

    (snapshotCorpus as ReturnType<typeof vi.fn>).mockResolvedValue({ atom_count: 42, rule_count: 7, snapshot_hash: 'abc' });

    const result = await buildCanonicalContext(USER_ID);

    // nutrition ledger flows through
    expect(result.nutrition).toBeDefined();
    expect(result.nutrition?.ledger).toEqual(ledgerRows);

    // supplements stack = current supplement names
    expect(result.supplements).toBeDefined();
    expect(result.supplements?.stack).toEqual(['Magnesium Glycinate', 'Vitamin D3']);

    // connected is FLAG-OFF: every channel null (degraded, never fabricated)
    expect(result.connected).toEqual({
      sleep: null,
      activity: null,
      hrv: null,
      heartRate: null,
      glucose: null,
    });

    // derived composes the three engines
    expect(result.derived?.energyBalance).toEqual(energy);
    expect(result.derived?.compoundLoad).toEqual(compound);
    expect(result.derived?.hydration).toEqual(hydration);

    // provenance: deterministic non-empty contractVersion + snapshotRef counts
    expect(result.provenance).toBeDefined();
    expect(typeof result.provenance?.contractVersion).toBe('string');
    expect(result.provenance?.contractVersion.length).toBeGreaterThan(0);
    expect(result.provenance?.snapshotRef).toEqual({ atom_count: 42, rule_count: 7 });
  });

  it('contractVersion is deterministic: same inputs produce the same version', async () => {
    primeBaseMocks();
    (buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (computeAndPersistEnergyBalance as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistCompoundLoad as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistHydrationReconciliation as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (snapshotCorpus as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const a = await buildCanonicalContext(USER_ID);

    primeBaseMocks();
    (buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (computeAndPersistEnergyBalance as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistCompoundLoad as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistHydrationReconciliation as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (snapshotCorpus as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const b = await buildCanonicalContext(USER_ID);

    expect(a.provenance?.contractVersion).toBe(b.provenance?.contractVersion);
    expect(a.provenance?.contractVersion.length).toBeGreaterThan(0);
  });

  it('a single failing engine leaves only its field null and the build still returns a valid context (fail-open, no throw)', async () => {
    primeBaseMocks();

    (buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mockResolvedValue([
      { nutrient: 'zinc', food_contribution: 0, supplement_contribution: 15, total: 15, unit: 'mg', ul_status: 'within' },
    ]);
    // energyBalance THROWS; the other two succeed.
    (computeAndPersistEnergyBalance as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('energy engine boom'));
    const hydration = { baseTargetMl: 2000, activityAdjustedTargetMl: 2000, electrolyteContext: 'unknown', bodyWaterContext: 'unknown' };
    (computeAndPersistCompoundLoad as ReturnType<typeof vi.fn>).mockResolvedValue({ compound: 'caffeine', foodSourceTotal: 0, supplementSourceTotal: 0, total: 0, metabolizerContext: 'unknown' });
    (computeAndPersistHydrationReconciliation as ReturnType<typeof vi.fn>).mockResolvedValue(hydration);
    (snapshotCorpus as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await buildCanonicalContext(USER_ID);

    expect(result).toBeDefined();
    // failing engine -> null
    expect(result.derived?.energyBalance).toBeNull();
    // siblings unaffected
    expect(result.derived?.hydration).toEqual(hydration);
    expect(result.derived?.compoundLoad).toEqual({ compound: 'caffeine', foodSourceTotal: 0, supplementSourceTotal: 0, total: 0, metabolizerContext: 'unknown' });
    // existing fields still present
    expect(result.variants).toHaveLength(1);
    // contract still versioned
    expect(result.provenance?.contractVersion.length).toBeGreaterThan(0);
  });

  it('ledger engine failure leaves nutrition.ledger empty and snapshotCorpus null leaves snapshotRef null', async () => {
    primeBaseMocks();
    (buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ledger boom'));
    (computeAndPersistEnergyBalance as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistCompoundLoad as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistHydrationReconciliation as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (snapshotCorpus as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await buildCanonicalContext(USER_ID);

    expect(result.nutrition?.ledger).toEqual([]);
    expect(result.provenance?.snapshotRef).toBeNull();
    // build did not throw and stays valid
    expect(result.variants).toBeDefined();
  });

  it('supplement read failure leaves supplements.stack empty (fail-open)', async () => {
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [], medications: [], goals: [], pregnancyStatus: null, age: null,
    });
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (computeAndPersistEnergyBalance as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistCompoundLoad as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistHydrationReconciliation as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (snapshotCorpus as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const pathwayChain = makeQueryChain({ data: [], error: null });
    const concordanceChain = makeQueryChain({ data: [], error: null });
    const supplementChain = makeQueryChain({ data: null, error: { message: 'supplement read failed' } });
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pathway_scores') return pathwayChain;
      if (table === 'genotype_phenotype_concordance') return concordanceChain;
      if (table === 'user_current_supplements') return supplementChain;
      if (table === 'user_context_canonical') return insertChain;
      return makeQueryChain({ data: null, error: null });
    });

    const result = await buildCanonicalContext(USER_ID);
    expect(result.supplements?.stack).toEqual([]);
  });

  it('persisted user_context_canonical context includes the new Section 5 fields (additive)', async () => {
    const { insertChain } = primeBaseMocks();
    (buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (computeAndPersistEnergyBalance as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistCompoundLoad as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (computeAndPersistHydrationReconciliation as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (snapshotCorpus as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await buildCanonicalContext(USER_ID);

    expect(insertChain.insert).toHaveBeenCalledTimes(1);
    const arg = insertChain.insert.mock.calls[0][0] as { context: Record<string, unknown> };
    // existing fields retained
    expect(arg.context).toHaveProperty('variants');
    expect(arg.context).toHaveProperty('pathways');
    expect(arg.context).toHaveProperty('healthContext');
    // new fields present
    expect(arg.context).toHaveProperty('nutrition');
    expect(arg.context).toHaveProperty('supplements');
    expect(arg.context).toHaveProperty('connected');
    expect(arg.context).toHaveProperty('derived');
    expect(arg.context).toHaveProperty('provenance');
  });
});
