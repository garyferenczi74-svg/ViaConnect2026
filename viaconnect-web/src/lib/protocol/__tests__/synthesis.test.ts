/**
 * Unit tests for synthesis.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208, Phase 4, Task 12 (2026-06-21).
 * Updated for 208a Task A3: getQualifiedUserVariants is now the variant source.
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock modules that hit the DB or external APIs.
// runInterlocks is NOT mocked -- it is the real implementation.
// getQualifiedUserVariants is mocked so synthesis tests stay isolated from QC.
// ---------------------------------------------------------------------------

vi.mock('@/lib/kb/snpProtocolRules', () => ({
  getPublishedRules: vi.fn(),
  ruleMatchesGenotype: vi.fn(),
}));

// === PROMPT 208a I3 EXTENSION START ===
// Mock ruleKillswitch so synthesis tests control the active rule set directly.
// getActivePublishedRules defaults to returning whatever getPublishedRules returns
// (killswitch transparent). Tests can override per-case to simulate killed rules.
vi.mock('@/lib/kb/ruleKillswitch', () => ({
  getActivePublishedRules: vi.fn(),
}));
// === PROMPT 208a I3 EXTENSION END ===

vi.mock('@/lib/kb/knowledgeAtoms', () => ({
  getPublishedAtoms: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/genetics/qc/qualifiedVariants', () => ({
  getQualifiedUserVariants: vi.fn(),
}));

// Mock getLatestUserHealthContext so synthesis F4 tests can control health context.
// Default: empty context (fail-open). Tests override per-case.
vi.mock('@/lib/protocol/healthContext', () => ({
  getLatestUserHealthContext: vi.fn().mockResolvedValue({
    allergies: [],
    medications: [],
    goals: [],
  }),
}));

// === PROMPT 208a C2 EXTENSION START ===
// Mock getUserAncestry so synthesis C2 tests can control ancestry without DB.
// Default: empty ancestry (unknown -> no caveats surfaced; no unfair penalization).
vi.mock('@/lib/genetics/ancestry/populationMatch', () => ({
  getUserAncestry: vi.fn().mockResolvedValue([]),
  populationCaveatFor: vi.fn().mockReturnValue(null),
  populationMatches: vi.fn().mockReturnValue(true),
}));
// === PROMPT 208a C2 EXTENSION END ===

// === PROMPT 208a J2 EXTENSION START ===
// Mock recommendationAudit so synthesis J2 tests can assert the audit insert
// without touching the real DB. Default: recordRecommendationAudit returns true.
vi.mock('@/lib/protocol/recommendationAudit', () => ({
  stableInputsHash: vi.fn().mockReturnValue('mock-hash-001'),
  recordRecommendationAudit: vi.fn().mockResolvedValue(true),
  snapshotCorpus: vi.fn().mockResolvedValue(null),
  getActiveEmbeddingVersion: vi.fn().mockResolvedValue(null),
}));
// === PROMPT 208a J2 EXTENSION END ===

// === PROMPT 208b 4.1 EXTENSION START ===
// Mock intakeReconciliation so synthesis 4.1 tests control the food
// contributions appended to the UL gate input and assert the ledger side-record.
// Defaults are the no-food / fail-open shape: getFoodContributions returns an
// empty incomplete result (degrades to today's supplement-only behavior), and
// buildNutrientIntakeLedger resolves to [] without throwing.
vi.mock('@/lib/nutrition/intakeReconciliation', () => ({
  getFoodContributions: vi.fn().mockResolvedValue({ contributions: [], complete: false }),
  buildNutrientIntakeLedger: vi.fn().mockResolvedValue([]),
}));
// === PROMPT 208b 4.1 EXTENSION END ===

// === PROMPT 208b 4.2 EXTENSION START ===
// Mock labEfficacyFlags so synthesis 4.2 tests control the SECOND (lab-efficacy)
// supplement-flag source without wiring the lab loader through the admin mock.
// Default: no lab-efficacy flags (fail-open empty) -> supplement_flags is exactly
// today's genetic-only behavior. Tests override buildLabEfficacyFlags per-case.
vi.mock('@/lib/protocol/labEfficacyFlags', () => ({
  buildLabEfficacyFlags: vi.fn().mockResolvedValue([]),
}));
// === PROMPT 208b 4.2 EXTENSION END ===

// === PROMPT 208b 5.2 EXTENSION START ===
// Mock persistConcordance so 5.2 completeness tests can control the cheap labs
// signal (synthesis derives hasLabs from output.concordance_context). Default is
// [] (no labs) -- this matches the UNMOCKED behavior under the admin mock (the
// fallback returns no lab rows), so every existing synthesis test is unaffected.
// The completeness tests below override computeAndPersistConcordance per-case.
vi.mock('@/lib/labs/persistConcordance', () => ({
  computeAndPersistConcordance: vi.fn().mockResolvedValue([]),
}));
// === PROMPT 208b 5.2 EXTENSION END ===

// safeLog is real (no side effects in tests, just console output).

import {
  synthesizeForUser,
  canonicalNutrientKey,
  DISCLAIMERS_VERSION,
} from '../synthesis';

import { getPublishedRules, ruleMatchesGenotype } from '@/lib/kb/snpProtocolRules';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { getLatestUserHealthContext } from '@/lib/protocol/healthContext';
// === PROMPT 208a I3 EXTENSION START ===
import { getActivePublishedRules } from '@/lib/kb/ruleKillswitch';
// === PROMPT 208a I3 EXTENSION END ===
// === PROMPT 208a C2 EXTENSION START ===
import { getUserAncestry, populationCaveatFor } from '@/lib/genetics/ancestry/populationMatch';
// === PROMPT 208a C2 EXTENSION END ===
// === PROMPT 208a J2 EXTENSION START ===
import { recordRecommendationAudit } from '@/lib/protocol/recommendationAudit';
// === PROMPT 208a J2 EXTENSION END ===
// === PROMPT 208b 4.1 EXTENSION START ===
import { getFoodContributions, buildNutrientIntakeLedger } from '@/lib/nutrition/intakeReconciliation';
import { runInterlocks, type InterlockContext } from '@/lib/protocol/safetyInterlocks';
// === PROMPT 208b 4.1 EXTENSION END ===
// === PROMPT 208b 4.2 EXTENSION START ===
import { buildLabEfficacyFlags } from '@/lib/protocol/labEfficacyFlags';
// === PROMPT 208b 4.2 EXTENSION END ===
// === PROMPT 208b 5.2 EXTENSION START ===
import { computeAndPersistConcordance } from '@/lib/labs/persistConcordance';
// === PROMPT 208b 5.2 EXTENSION END ===

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal published prefer_form rule. */
function preferFormRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-001',
    rsid: 'rs1801133',
    gene: 'MTHFR',
    genotype_match: 'TT',
    effect: 'Homozygous C677T reduces MTHFR enzyme activity.',
    action_type: 'prefer_form',
    recommended_form: 'L-methylfolate',
    flagged_form: 'folic acid',
    avoid_list: ['folic-acid-fortified grains'],
    evidence_tier: 2,
    sensitive: false,
    review_status: 'published',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a minimal published contraindicate rule. */
function contraindicateRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-hfe-contra',
    rsid: 'rs1800562',
    gene: 'HFE',
    genotype_match: 'AA',
    effect: 'HFE C282Y homozygous: hereditary hemochromatosis risk.',
    action_type: 'contraindicate',
    flagged_form: 'iron',
    avoid_list: ['iron supplements'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'published',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a mock Supabase chain: .from().select().eq().eq() etc. resolves to data. */
function makeSupabaseMock(responses: Record<string, { data: unknown[]; error: null | object }>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  };

  // Track which table was queried
  let currentTable = '';
  const fromMock = vi.fn().mockImplementation((table: string) => {
    currentTable = table;

    // Each time a terminal method is called, resolve based on current table
    const terminalChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Make .eq() chainable and when called twice (as .eq().eq()) still work
    // Use a proxy approach: override select to return a thenable
    const makeThenable = (table: string) => {
      const resp = responses[table] ?? { data: [], error: null };
      const obj = {
        data: resp.data,
        error: resp.error,
        then: undefined as unknown,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
      };
      // Make it a real thenable
      obj.then = (resolve: (v: unknown) => void) => resolve({ data: resp.data, error: resp.error });
      return obj;
    };

    return {
      select: vi.fn().mockImplementation(() => makeThenable(table)),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
    };
  });

  return { from: fromMock };
}

/**
 * Build a simple admin mock that handles:
 *   - user_current_supplements select (returns supplementRows)
 *   - user_protocol_synthesis insert (returns success)
 *
 * Note: user_variants is no longer queried by synthesis directly.
 * getQualifiedUserVariants is mocked separately to supply variant data.
 */
function buildAdminMock(
  _variantRows: unknown[],
  supplementRows: unknown[],
) {
  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'user_current_supplements') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockResolvedValue({ data: supplementRows, error: null }),
          })),
        };
      }
      if (table === 'user_protocol_synthesis') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      };
    }),
  };
  return supabase;
}

// ---------------------------------------------------------------------------
// Test A: canonicalNutrientKey
// ---------------------------------------------------------------------------

describe('canonicalNutrientKey', () => {
  it('maps iron variants to iron', () => {
    expect(canonicalNutrientKey('iron')).toBe('iron');
    expect(canonicalNutrientKey('ferrous sulfate')).toBe('iron');
    expect(canonicalNutrientKey('ferrous bisglycinate')).toBe('iron');
    expect(canonicalNutrientKey('Iron Supplement')).toBe('iron');
    expect(canonicalNutrientKey('Ferrous Gluconate')).toBe('iron');
  });

  it('maps folic acid to folic_acid', () => {
    expect(canonicalNutrientKey('folic acid')).toBe('folic_acid');
    expect(canonicalNutrientKey('Folic Acid')).toBe('folic_acid');
  });

  it('maps vitamin D forms to vitamin_d', () => {
    expect(canonicalNutrientKey('vitamin d')).toBe('vitamin_d');
    expect(canonicalNutrientKey('cholecalciferol')).toBe('vitamin_d');
    expect(canonicalNutrientKey('Vitamin D3')).toBe('vitamin_d');
  });

  it('returns undefined for unknown forms', () => {
    expect(canonicalNutrientKey('L-methylfolate')).toBeUndefined();
    expect(canonicalNutrientKey('magnesium glycinate')).toBeUndefined();
    expect(canonicalNutrientKey('')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Setup shared mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // ruleMatchesGenotype: use real logic (TT === TT -> true; anything else -> false)
  (ruleMatchesGenotype as ReturnType<typeof vi.fn>).mockImplementation(
    (rule: { genotype_match: string }, genotype: string) => {
      const m = rule.genotype_match.trim();
      if (m === '' || m === '*') return true;
      return m.toUpperCase() === genotype.toUpperCase();
    },
  );

  // Default: getQualifiedUserVariants returns empty (tests override per-case)
  (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);

  // === PROMPT 208a I3 EXTENSION START ===
  // Default: getActivePublishedRules delegates to getPublishedRules so existing
  // tests that set (getPublishedRules as mock).mockResolvedValue(...) continue to
  // work transparently. Tests that need to simulate killed rules override this.
  (getActivePublishedRules as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    return (getPublishedRules as ReturnType<typeof vi.fn>)();
  });
  // === PROMPT 208a I3 EXTENSION END ===

  // === PROMPT 208b 4.1 EXTENSION START ===
  // Default: no food (fail-open empty/incomplete) -> the UL gate input degrades to
  // exactly today's supplement-only behavior. Ledger persist resolves to [].
  // Tests that exercise the food path override getFoodContributions per-case.
  (getFoodContributions as ReturnType<typeof vi.fn>).mockResolvedValue({
    contributions: [],
    complete: false,
  });
  (buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  // === PROMPT 208b 4.1 EXTENSION END ===

  // === PROMPT 208b 4.2 EXTENSION START ===
  // Default: no lab-efficacy flags -> supplement_flags is exactly today's
  // genetic-only behavior. Tests that exercise the lab path override per-case.
  (buildLabEfficacyFlags as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  // === PROMPT 208b 4.2 EXTENSION END ===

  // === PROMPT 208b 5.2 EXTENSION START ===
  // Default: no concordance records -> hasLabs derives false (conservative).
  // This matches the prior unmocked behavior, so existing tests are unaffected.
  (computeAndPersistConcordance as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  // === PROMPT 208b 5.2 EXTENSION END ===
});

// ---------------------------------------------------------------------------
// Test 1: MTHFR user
// ---------------------------------------------------------------------------

describe('Test 1: MTHFR user (prefer_form)', () => {
  it('recommends L-methylfolate, flags folic acid, adds avoidance guidance', async () => {
    const userId = 'user-mthfr';

    // Published rules: one prefer_form rule for MTHFR TT
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);

    // user_variants: MTHFR TT (supplied via the QC reader)
    // user_current_supplements: includes 'folic acid'
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [],
        [{ supplement_name: 'folic acid', product_name: 'Generic Folic Acid', is_current: true, is_ai_recommended: false }],
      ),
    );

    const output = await synthesizeForUser(userId);

    // Recommended: L-methylfolate
    expect(output.recommended_vitamins_minerals.length).toBeGreaterThan(0);
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
    expect(rec?.ruleRsid).toBe('rs1801133');
    expect(rec?.evidenceTier).toBe(2);

    // Supplement flag: folic acid flagged with alternativeForm
    const flag = output.supplement_flags.find((f) => f.current.toLowerCase() === 'folic acid');
    expect(flag).toBeDefined();
    expect(flag?.alternativeForm).toBe('L-methylfolate');
    expect(flag?.ruleRsid).toBe('rs1801133');

    // Nutrition guidance avoidance
    expect(output.nutrition_guidance.avoid).toContain('folic-acid-fortified grains');

    // Disclaimers
    expect(output.disclaimers_version).toBe(DISCLAIMERS_VERSION);
  });
});

// ---------------------------------------------------------------------------
// Test 2: HFE user - iron NEVER recommended (interlock 1 drops it)
// ---------------------------------------------------------------------------

describe('Test 2: HFE user (iron contraindicated by interlock)', () => {
  it('never includes iron in recommended_vitamins_minerals even if a prefer_form rule exists', async () => {
    const userId = 'user-hfe';

    // Published rules: contraindicate iron + a prefer_form iron rule
    const ironPreferRule = {
      id: 'rule-hfe-prefer',
      rsid: 'rs1800562',
      gene: 'HFE',
      genotype_match: 'AA',
      effect: 'HFE iron prefer (SHOULD be dropped by interlock).',
      action_type: 'prefer_form',
      recommended_form: 'iron',
      flagged_form: undefined,
      avoid_list: [],
      evidence_tier: 1,
      sensitive: false,
      review_status: 'published',
      created_at: '2026-01-01T00:00:00Z',
    };

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([
      contraindicateRule(),
      ironPreferRule,
    ]);

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1800562', gene: 'HFE', genotype: 'AA', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );

    const output = await synthesizeForUser(userId);

    // Iron must NOT appear in recommendations
    const ironRec = output.recommended_vitamins_minerals.find(
      (r) => r.form.toLowerCase().includes('iron'),
    );
    expect(ironRec).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test 3: No genetic upload - valid empty synthesis, no crash
// ---------------------------------------------------------------------------

describe('Test 3: No genetic upload (empty user_variants)', () => {
  it('returns a valid SynthesisOutput without crashing', async () => {
    const userId = 'user-no-upload';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);

    // getQualifiedUserVariants returns [] by default (set in beforeEach)
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );

    const output = await synthesizeForUser(userId);

    // Must not throw; output is a valid SynthesisOutput
    expect(output).toBeDefined();
    expect(Array.isArray(output.recommended_vitamins_minerals)).toBe(true);
    expect(Array.isArray(output.supplement_flags)).toBe(true);
    expect(output.nutrition_guidance).toBeDefined();
    expect(Array.isArray(output.nutrition_guidance.avoid)).toBe(true);
    expect(Array.isArray(output.nutrition_guidance.prefer)).toBe(true);
    expect(output.arnold_context).toBeDefined();
    expect(Array.isArray(output.arnold_context.activeTopics)).toBe(true);
    // With no variants, no applicable rules -> empty genetic-derived lists
    expect(output.recommended_vitamins_minerals).toHaveLength(0);
    expect(output.supplement_flags).toHaveLength(0);
    expect(output.disclaimers_version).toBe(DISCLAIMERS_VERSION);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Tier 3 prefer rule - excluded from recommendations
// ---------------------------------------------------------------------------

describe('Test 4: Tier 3 prefer rule excluded from recommendations', () => {
  it('does not recommend a form with evidence_tier 3 even if interlocks pass', async () => {
    const userId = 'user-tier3';

    const tier3Rule = preferFormRule({
      id: 'rule-tier3',
      evidence_tier: 3,
      recommended_form: 'Exotic-Methylfolate-Tier3',
    });

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([tier3Rule]);

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );

    const output = await synthesizeForUser(userId);

    const tier3Rec = output.recommended_vitamins_minerals.find(
      (r) => r.form === 'Exotic-Methylfolate-Tier3',
    );
    expect(tier3Rec).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test 5: QC-excluded variant - its rule is NOT applied (208a Task A3)
// ---------------------------------------------------------------------------

describe('Test 5: QC-excluded variant does not drive rule application', () => {
  it('does not apply MTHFR rule when the variant is QC-excluded (not returned by reader)', async () => {
    const userId = 'user-qc-excluded';

    // Published rule that would apply to rs1801133 TT
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);

    // QC reader excludes the MTHFR variant (e.g. orientation unresolved)
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );

    const output = await synthesizeForUser(userId);

    // No variants -> no applicable rules -> nothing recommended
    expect(output.recommended_vitamins_minerals).toHaveLength(0);
    expect(output.supplement_flags).toHaveLength(0);
    expect(output.arnold_context.activeTopics).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// F4 Test 6: Allergen screen removes a matching form (208a Module F Task F4)
// ---------------------------------------------------------------------------

describe('F4 Test 6: Allergen screen removes allergen-matching form from output', () => {
  it('excludes a recommended form that matches the user allergen', async () => {
    const userId = 'user-allergen';

    // A rule that recommends "shellfish CoQ10" (would normally pass interlocks)
    const coq10Rule = preferFormRule({
      id: 'rule-coq10',
      rsid: 'rs1801133',
      gene: 'MTHFR',
      genotype_match: 'TT',
      recommended_form: 'shellfish CoQ10',
      flagged_form: undefined,
      avoid_list: [],
      evidence_tier: 2,
      effect: 'some effect',
    });

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([coq10Rule]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    // User has shellfish allergy
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: ['shellfish'],
      medications: [],
      goals: [],
    });

    const output = await synthesizeForUser(userId);

    // The shellfish CoQ10 form must be absent
    const shellfishRec = output.recommended_vitamins_minerals.find(
      (r) => r.form.toLowerCase().includes('shellfish'),
    );
    expect(shellfishRec).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F4 Test 7: Metformin depletes B12 -> repletion appears in output (208a F4)
// ---------------------------------------------------------------------------

describe('F4 Test 7: Metformin B12 repletion added to recommended items', () => {
  it('adds vitamin B12 repletion when user is on metformin (and B12 not contraindicated)', async () => {
    const userId = 'user-metformin';

    // No genetic rules for this user (no variants)
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: ['metformin'],
      goals: [],
    });

    const output = await synthesizeForUser(userId);

    const b12Repletion = output.recommended_vitamins_minerals.find(
      (r) => r.form.toLowerCase().includes('b12') || r.form.toLowerCase().includes('vitamin b12'),
    );
    expect(b12Repletion).toBeDefined();
    expect(b12Repletion?.ruleRsid).toMatch(/^depletion:/);
    expect(b12Repletion?.rationale).toContain('metformin');
  });
});

// ---------------------------------------------------------------------------
// F4 Test 8: HFE carrier + iron-depleting medication -> no iron recommended
// ---------------------------------------------------------------------------

describe('F4 Test 8: HFE carrier on iron-depleting med -> no iron (interlocks drop repletion)', () => {
  it('drops iron repletion for an HFE carrier even if medication depletes iron', async () => {
    const userId = 'user-hfe-iron-dep';

    // An iron-depleting medication (hypothetical; we simulate it by adding iron to depletions
    // via a custom rule path -- we test the invariant by using HFE contraindicate + a
    // synthesized scenario where the DEPLETIONS table would try to add iron).
    // The real DEPLETIONS table does not include iron, so we use a medications list that
    // triggers an existing depletion that IS contraindicated via the HFE rule.
    // The critical invariant: HFE contraindicate + runInterlocks = iron never passes.
    // We validate: even if we have metformin (B12 depletion), no iron appears.

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([contraindicateRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1800562', gene: 'HFE', genotype: 'AA', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: ['metformin'],  // depletes B12, not iron
      goals: [],
    });

    const output = await synthesizeForUser(userId);

    // Iron must not appear regardless of any depletion path
    const ironRec = output.recommended_vitamins_minerals.find(
      (r) => r.form.toLowerCase().includes('iron') || r.form.toLowerCase().includes('ferrous'),
    );
    expect(ironRec).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// I2 Test 9: Pregnant user - pregnancy-contraindicated item is absent
// (Prompt 208a Module I Task I2)
// ---------------------------------------------------------------------------

describe('I2 Test 9: Pregnant user - contraindicated item excluded', () => {
  it('excludes a retinol-containing recommendation for a pregnant user', async () => {
    const userId = 'user-pregnant';

    // A rule that would normally recommend "retinol" (vitamin A)
    const retinolRule = preferFormRule({
      id: 'rule-retinol',
      rsid: 'rs1801133',
      gene: 'MTHFR',
      genotype_match: 'TT',
      recommended_form: 'retinol',
      flagged_form: undefined,
      avoid_list: [],
      evidence_tier: 2,
      effect: 'some effect',
    });

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([retinolRule]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    // User is pregnant
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: 'pregnant',
      age: 28,
    });

    const output = await synthesizeForUser(userId);

    // Retinol must be absent from recommendations for a pregnant user
    const retinolRec = output.recommended_vitamins_minerals.find(
      (r) => r.form.toLowerCase().includes('retinol'),
    );
    expect(retinolRec).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// I2 Test 10: BRCA1 variant - does NOT drive any recommendation
// AND secondary_findings_routing lists BRCA1 -> genetic_counseling
// (Prompt 208a Module I Task I2)
// ---------------------------------------------------------------------------

describe('I2 Test 10: BRCA1 variant excluded via secondary-findings filter', () => {
  it('does not drive any recommendation and routes to genetic_counseling', async () => {
    const userId = 'user-brca1';

    // A rule attached to BRCA1 that would normally recommend something
    const brca1Rule = preferFormRule({
      id: 'rule-brca1',
      rsid: 'rs80357906',
      gene: 'BRCA1',
      genotype_match: 'CT',
      recommended_form: 'some-supplement',
      flagged_form: undefined,
      avoid_list: [],
      evidence_tier: 2,
      effect: 'BRCA1 variant effect',
    });

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([brca1Rule]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs80357906', gene: 'BRCA1', genotype: 'CT', panel_key: 'methylation', status: 'confirmed' },
    ]);

    // The admin mock must return BRCA1 from secondary_findings_exclusions
    const baseAdmin = buildAdminMock([], []);
    const adminWithSf = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'secondary_findings_exclusions') {
          const resp = { data: [{ gene: 'BRCA1' }], error: null };
          return {
            select: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve(resp),
            }),
          };
        }
        return baseAdmin.from(table);
      }),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminWithSf);

    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: 40,
    });

    const output = await synthesizeForUser(userId);

    // BRCA1 must NOT drive any recommendation
    const brca1Rec = output.recommended_vitamins_minerals.find(
      (r) => r.form === 'some-supplement',
    );
    expect(brca1Rec).toBeUndefined();

    // secondary_findings_routing must list BRCA1 -> genetic_counseling
    expect(output.secondary_findings_routing).toBeDefined();
    const brca1Route = output.secondary_findings_routing?.find((r) => r.gene === 'BRCA1');
    expect(brca1Route).toBeDefined();
    expect(brca1Route?.routing).toBe('genetic_counseling');
  });
});

// ---------------------------------------------------------------------------
// I2 Test 11: Minor user (age < 18) - no recommendations (pediatric gate)
// (Prompt 208a Module I Task I2)
// ---------------------------------------------------------------------------

describe('I2 Test 11: Minor user (age < 18) gets no recommendations (pediatric gate)', () => {
  it('drops all candidates for a minor user and returns empty recommendations', async () => {
    const userId = 'user-minor';

    // A rule that would normally recommend L-methylfolate
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    // User is 15 years old (minor)
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: 15,
    });

    const output = await synthesizeForUser(userId);

    // No recommendations for a minor
    expect(output.recommended_vitamins_minerals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// I3 Test 12: A killed rule does NOT appear in recommendations
// (Prompt 208a Module I Task I3 -- per-rule killswitch)
// ---------------------------------------------------------------------------

describe('I3 Test 12: Killed rule does not appear in recommendations', () => {
  it('excludes a rule that is in the killswitch (killed=true) from synthesis output', async () => {
    const userId = 'user-killswitch';

    // Two rules: one live (MTHFR prefer_form), one killed (HFE contraindicate).
    const liveRule = preferFormRule({ id: 'rule-live' });
    const killedRule = preferFormRule({
      id: 'rule-killed',
      rsid: 'rs9999999',
      gene: 'TEST',
      genotype_match: 'AA',
      recommended_form: 'killed-supplement',
      flagged_form: undefined,
      avoid_list: [],
      evidence_tier: 2,
      effect: 'This rule is killed and must not appear.',
    });

    // getPublishedRules returns both rules.
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([liveRule, killedRule]);

    // Override getActivePublishedRules to simulate the killswitch removing rule-killed.
    (getActivePublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([liveRule]);

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
      { rsid: 'rs9999999', gene: 'TEST', genotype: 'AA', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: 35,
    });

    const output = await synthesizeForUser(userId);

    // The live rule's form must appear.
    const liveRec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(liveRec).toBeDefined();

    // The killed rule's form must NOT appear.
    const killedRec = output.recommended_vitamins_minerals.find(
      (r) => r.form === 'killed-supplement',
    );
    expect(killedRec).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// === PROMPT 208a C2 EXTENSION START ===
// C2 Test 13: EUR-only rule + AFR user -> population_caveats includes that rsid
// C2 Test 14: MTHFR + HFE rules without validated_populations -> no caveat
// (Prompt 208a Module C Task C2)
// ---------------------------------------------------------------------------

describe('C2 Test 13: EUR-only rule + AFR user produces a population caveat', () => {
  it('includes a population_caveats entry for the mismatched rsid when ancestry is known and different', async () => {
    const userId = 'user-afr-eur-mismatch';

    // A prefer_form rule that has validated_populations: ['european']
    const eurRule = preferFormRule({
      id: 'rule-eur-only',
      rsid: 'rs1801133',
      gene: 'MTHFR',
      genotype_match: 'TT',
      recommended_form: 'L-methylfolate',
      validated_populations: ['european'],
      cross_population_caveat: 'Validated primarily in European populations; cross-ancestry applicability is uncertain.',
      evidence_tier: 2,
    });

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([eurRule]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: 35,
    });

    // User has AFR ancestry (does not match EUR rule)
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue(['african']);
    // Real populationCaveatFor: returns caveat when non-matching known ancestry
    (populationCaveatFor as ReturnType<typeof vi.fn>).mockImplementation(
      (rule: { rsid: string; validated_populations?: string[] | null; cross_population_caveat?: string | null }, userPops: string[]) => {
        if (!rule.validated_populations || rule.validated_populations.length === 0) return null;
        if (userPops.length === 0) return null;
        const userLower = userPops.map((p: string) => p.toLowerCase());
        const matches = rule.validated_populations.some((rp: string) => userLower.includes(rp.toLowerCase()));
        if (matches) return null;
        if (!rule.cross_population_caveat || rule.cross_population_caveat.trim().length === 0) return null;
        return { rsid: rule.rsid, caveat: rule.cross_population_caveat };
      },
    );

    const output = await synthesizeForUser(userId);

    // The rule STILL applies (it is still recommended).
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();

    // population_caveats must include the caveat for rs1801133.
    expect(output.population_caveats).toBeDefined();
    expect(Array.isArray(output.population_caveats)).toBe(true);
    const caveat = output.population_caveats?.find((c) => c.rsid === 'rs1801133');
    expect(caveat).toBeDefined();
    expect(caveat?.caveat).toContain('European');
  });
});

describe('C2 Test 14: MTHFR + HFE rules without validated_populations -> no population caveats', () => {
  it('produces no population_caveats when rules have no validated_populations', async () => {
    const userId = 'user-no-pop-caveats';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule(), contraindicateRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
      { rsid: 'rs1800562', gene: 'HFE', genotype: 'AA', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: 35,
    });

    // Reset to default: getUserAncestry returns [] (unknown), populationCaveatFor returns null
    (getUserAncestry as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (populationCaveatFor as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const output = await synthesizeForUser(userId);

    // No population caveats: rules have no validated_populations.
    expect(!output.population_caveats || output.population_caveats.length === 0).toBe(true);

    // Existing behavior unchanged: MTHFR still recommends L-methylfolate.
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
  });
});
// === PROMPT 208a C2 EXTENSION END ===

// ---------------------------------------------------------------------------
// === PROMPT 208a J2 EXTENSION START ===
// J2 Test 15: synthesizeForUser writes one recommendation_audit row
// Asserts: audit insert called once with non-empty inputs_hash + rule ids + DISCLAIMERS_VERSION.
// Recommendations are unchanged (audit is a fail-open side-record).
// (Prompt 208a Module J Task J2)
// ---------------------------------------------------------------------------

describe('J2 Test 15: synthesizeForUser writes one recommendation_audit row', () => {
  it('calls recordRecommendationAudit once with correct inputs_hash, rule ids, and disclaimer_version', async () => {
    const userId = 'user-j2-audit';

    // One applicable MTHFR rule
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: 35,
    });

    const output = await synthesizeForUser(userId);

    // Audit must have been called exactly once
    expect(recordRecommendationAudit).toHaveBeenCalledOnce();

    const [calledUserId, auditInput] = (recordRecommendationAudit as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledUserId).toBe(userId);

    // inputs_hash is a non-empty string
    expect(typeof auditInput.inputsHash).toBe('string');
    expect(auditInput.inputsHash.length).toBeGreaterThan(0);

    // ruleIds contains the applicable rule id
    expect(Array.isArray(auditInput.ruleIds)).toBe(true);
    expect(auditInput.ruleIds).toContain('rule-001');

    // disclaimer_version matches DISCLAIMERS_VERSION
    expect(auditInput.disclaimerVersion).toBe(DISCLAIMERS_VERSION);

    // Recommendations are unchanged (the audit is purely additive)
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
  });

  it('synthesis output is unchanged when audit fails (fail-open)', async () => {
    const userId = 'user-j2-audit-fail';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock([], []),
    );
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: 35,
    });

    // Simulate audit failure (returns false = DB error)
    (recordRecommendationAudit as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const output = await synthesizeForUser(userId);

    // Output must still be complete and correct despite audit failure
    expect(output).toBeDefined();
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
    expect(output.disclaimers_version).toBe(DISCLAIMERS_VERSION);
  });
});
// === PROMPT 208a J2 EXTENSION END ===

// ---------------------------------------------------------------------------
// === PROMPT 208b 4.1 EXTENSION START ===
// 4.1 Tests 16-19: food contributions are APPENDED to the UL gate input.
//
// Monotonic + fail-open invariant. The interlock code (safetyInterlocks.ts) and
// upperLimits.ts are UNCHANGED; synthesis only enriches ctx.currentStack with
// getFoodContributions before the gate runs.
//
// NOTE on the chosen lock path: rule candidates built inside synthesizeForUser do
// NOT carry candidate.amount (only label/nutrient/supplementName), so the UL
// interlock (interlock 2) never fires through full synthesis today. We therefore
// lock the food-inclusive UL verdict with a DIRECT interlock-level test that
// constructs the InterlockContext EXACTLY as synthesis builds it (food appended
// to currentStack) and calls the real runInterlocks. Tests 18-19 lock the actual
// synthesis wiring (ledger side-record + fail-open) through synthesizeForUser.
// ---------------------------------------------------------------------------

describe('4.1 Test 16: food appended to currentStack flips the UL verdict (direct interlock lock)', () => {
  it('drops a folic_acid candidate when food (700) + supplement (400) > UL 1000, but passes it with no food', () => {
    // A folic_acid candidate at 400 mcg. Supplement alone (400) is < UL (1000).
    const candidate = {
      label: 'folic acid',
      nutrient: 'folic_acid',
      amount: 400,
      supplementName: 'folic acid',
    };

    // Base context built exactly like synthesis.ts builds ctx (supplement-only stack).
    const baseCtx: InterlockContext = {
      userRiskRsids: [],
      rules: [],
      currentStack: [],
      currentSupplements: [],
      medications: [],
      cypStatusMap: {},
      consentedSensitiveTopics: [],
      disclaimerVersion: DISCLAIMERS_VERSION,
    };

    // No food appended -> degrades to today: 400 < 1000 -> candidate PASSES.
    const noFood = runInterlocks(candidate, baseCtx);
    expect(noFood.passed).toBe(true);

    // Food contributions appended (exactly what synthesis does:
    //   ctx.currentStack = [...ctx.currentStack, ...food.contributions]).
    // 700 (food) + 400 (candidate) = 1100 > 1000 -> candidate DROPPED for upper_limit.
    const foodInclusiveCtx: InterlockContext = {
      ...baseCtx,
      currentStack: [...baseCtx.currentStack, { nutrient: 'folic_acid', amount: 700 }],
    };
    const withFood = runInterlocks(candidate, foodInclusiveCtx);
    expect(withFood.passed).toBe(false);
    if (!withFood.passed) {
      expect(withFood.droppedReason).toBe('upper_limit');
    }
  });
});

describe('4.1 Test 17: food contributions are monotonic (cannot relax the gate)', () => {
  it('a candidate already at the UL is unaffected by zero food, and only ever blocked harder by positive food', () => {
    // folic_acid candidate AT the UL boundary (1000). Supplement alone == UL is not > UL -> passes.
    const candidate = {
      label: 'folic acid',
      nutrient: 'folic_acid',
      amount: 1000,
      supplementName: 'folic acid',
    };
    const baseCtx: InterlockContext = {
      userRiskRsids: [],
      rules: [],
      currentStack: [],
      currentSupplements: [],
      medications: [],
      cypStatusMap: {},
      consentedSensitiveTopics: [],
      disclaimerVersion: DISCLAIMERS_VERSION,
    };

    // Zero food (empty contributions) -> identical to today: 1000 is not > 1000 -> passes.
    const zeroFood = runInterlocks(candidate, {
      ...baseCtx,
      currentStack: [...baseCtx.currentStack],
    });
    expect(zeroFood.passed).toBe(true);

    // Any positive food contribution can only push the total OVER the UL -> dropped.
    const positiveFood = runInterlocks(candidate, {
      ...baseCtx,
      currentStack: [...baseCtx.currentStack, { nutrient: 'folic_acid', amount: 1 }],
    });
    expect(positiveFood.passed).toBe(false);
  });
});

describe('4.1 Test 18: synthesizeForUser persists the nutrient intake ledger (additive side-record)', () => {
  it('invokes buildNutrientIntakeLedger exactly once for the user and still returns recommendations', async () => {
    const userId = 'user-4-1-ledger';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(buildAdminMock([], []));

    // Food returns a real contribution for this user (folic_acid 700 mcg).
    (getFoodContributions as ReturnType<typeof vi.fn>).mockResolvedValue({
      contributions: [{ nutrient: 'folic_acid', amount: 700 }],
      complete: true,
    });

    const output = await synthesizeForUser(userId);

    // Ledger side-record persisted exactly once for this user.
    expect(buildNutrientIntakeLedger).toHaveBeenCalledOnce();
    expect((buildNutrientIntakeLedger as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(userId);

    // Recommendations are unchanged by the additive food/ledger wiring
    // (L-methylfolate carries no UL key, so food folic_acid does not touch it).
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
  });
});

describe('4.1 Test 19: a thrown getFoodContributions does NOT break synthesis (fail-open to today)', () => {
  it('still produces recommendations when getFoodContributions rejects', async () => {
    const userId = 'user-4-1-food-throws';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(buildAdminMock([], []));

    // getFoodContributions rejects. Synthesis must not throw and must still
    // recommend (degrades to today's supplement-only behavior).
    (getFoodContributions as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('food read exploded'),
    );

    const output = await synthesizeForUser(userId);

    expect(output).toBeDefined();
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
    expect(output.disclaimers_version).toBe(DISCLAIMERS_VERSION);
  });
});
// === PROMPT 208b 4.1 EXTENSION END ===

// ---------------------------------------------------------------------------
// === PROMPT 208b 4.2 EXTENSION START ===
// 4.2 Tests 20-23: lab-efficacy is a SECOND, independent supplement-flag source.
//
// A user supplementing a nutrient whose biomarker is still out-of-range gets a
// lab_efficacy flag appended to supplement_flags. It is ADDITIVE: it never removes
// a recommendation and never gates an interlock. flagSource distinguishes it from
// the genetic source. Fail-open (buildLabEfficacyFlags cannot throw -> []).
//
// buildLabEfficacyFlags is mocked (see top-of-file mock) so these tests drive the
// lab-efficacy output directly and assert the synthesis wiring only.
// ---------------------------------------------------------------------------

describe('4.2 Test 20: a lab-efficacy flag is appended to supplement_flags with flagSource + linkedBiomarker', () => {
  it('adds a lab_efficacy flag (vitamin_d still low) alongside the genetic flag', async () => {
    const userId = 'user-4-2-vitd-low';

    // One applicable MTHFR prefer_form rule -> a GENETIC flag for folic acid.
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [],
        [{ supplement_name: 'folic acid', product_name: 'Generic Folic Acid', is_current: true, is_ai_recommended: false }],
      ),
    );

    // The lab-efficacy source returns one flag: vitamin D supplement, vitamin_d still low.
    (buildLabEfficacyFlags as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        current: 'Vitamin D3 5000 IU',
        reason: 'Supplementing Vitamin D3 5000 IU but vitamin_d remains below range; review dose, form, absorption, or cofactors.',
        flagSource: 'lab_efficacy',
        linkedBiomarker: 'vitamin_d',
      },
    ]);

    const output = await synthesizeForUser(userId);

    // The genetic flag (folic acid) is still present.
    const geneticFlag = output.supplement_flags.find((f) => f.current.toLowerCase() === 'folic acid');
    expect(geneticFlag).toBeDefined();
    expect(geneticFlag?.ruleRsid).toBe('rs1801133');

    // The lab-efficacy flag is appended with flagSource + linkedBiomarker.
    const labFlag = output.supplement_flags.find((f) => f.flagSource === 'lab_efficacy');
    expect(labFlag).toBeDefined();
    expect(labFlag?.linkedBiomarker).toBe('vitamin_d');
    expect(labFlag?.current).toBe('Vitamin D3 5000 IU');
    expect(labFlag?.ruleRsid).toBe('lab_efficacy');

    // Genetic recommendation is UNCHANGED (lab-efficacy flags never gate/remove).
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
  });
});

describe('4.2 Test 21: lab-efficacy flags do NOT remove a recommendation or change recommendations', () => {
  it('the recommendation set is identical whether or not a lab-efficacy flag is present', async () => {
    const userId = 'user-4-2-additive';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(buildAdminMock([], []));

    // First: WITH a lab-efficacy flag.
    (buildLabEfficacyFlags as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        current: 'Vitamin D3',
        reason: 'Supplementing Vitamin D3 but vitamin_d remains below range; review dose, form, absorption, or cofactors.',
        flagSource: 'lab_efficacy',
        linkedBiomarker: 'vitamin_d',
      },
    ]);
    const withFlag = await synthesizeForUser(userId);

    // Second: WITHOUT (empty lab-efficacy source).
    (buildLabEfficacyFlags as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const withoutFlag = await synthesizeForUser(userId);

    // Recommendations are byte-for-byte identical (flags are informational only).
    expect(withFlag.recommended_vitamins_minerals).toEqual(withoutFlag.recommended_vitamins_minerals);
    expect(withFlag.nutrition_guidance).toEqual(withoutFlag.nutrition_guidance);

    // Only the flags differ: the flagged run has exactly one MORE flag.
    expect(withFlag.supplement_flags.length).toBe(withoutFlag.supplement_flags.length + 1);
  });
});

describe('4.2 Test 22: synthesis is fail-open when buildLabEfficacyFlags rejects', () => {
  it('still produces genetic flags + recommendations when the lab-efficacy source throws', async () => {
    const userId = 'user-4-2-throws';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [],
        [{ supplement_name: 'folic acid', product_name: 'Generic Folic Acid', is_current: true, is_ai_recommended: false }],
      ),
    );

    // The lab-efficacy source rejects. Synthesis must not throw.
    (buildLabEfficacyFlags as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('lab efficacy exploded'),
    );

    const output = await synthesizeForUser(userId);

    expect(output).toBeDefined();
    // Genetic flag still present; no lab_efficacy flag (the source failed).
    const geneticFlag = output.supplement_flags.find((f) => f.current.toLowerCase() === 'folic acid');
    expect(geneticFlag).toBeDefined();
    const labFlag = output.supplement_flags.find((f) => f.flagSource === 'lab_efficacy');
    expect(labFlag).toBeUndefined();
    // Recommendation unchanged.
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
    expect(output.disclaimers_version).toBe(DISCLAIMERS_VERSION);
  });
});

describe('4.2 Test 23: lab-efficacy flag is passed the current supplement names', () => {
  it('invokes buildLabEfficacyFlags once with the user id and the current supplement list', async () => {
    const userId = 'user-4-2-args';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [],
        [
          { supplement_name: 'Vitamin D3', product_name: 'D3', is_current: true, is_ai_recommended: false },
          { supplement_name: 'Magnesium glycinate', product_name: 'Mag', is_current: true, is_ai_recommended: false },
        ],
      ),
    );

    await synthesizeForUser(userId);

    expect(buildLabEfficacyFlags).toHaveBeenCalledOnce();
    const [calledUserId, supplementNames] = (buildLabEfficacyFlags as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledUserId).toBe(userId);
    expect(supplementNames).toEqual(['Vitamin D3', 'Magnesium glycinate']);
  });
});
// === PROMPT 208b 4.2 EXTENSION END ===

// ---------------------------------------------------------------------------
// === PROMPT 208b 5.2 EXTENSION START ===
// 5.2 Tests 24-28: contract-completeness LABEL.
//
// Before synthesis finalizes, it assesses whether the required cross-reference
// inputs (genetics, labs, health context) are present. When any is missing, it
// attaches output.completeness with a degraded confidence floor so the surface
// can show the recommendations at lower confidence. This LABELS only: it never
// removes a recommendation and never gates/weakens a safety interlock. The
// existing MTHFR/HFE behavior above is UNAFFECTED.
// ---------------------------------------------------------------------------

describe('5.2 Test 24: variants + health context but NO labs -> completeness reduced', () => {
  it('labels the output reduced with missing ["labs"] and still recommends', async () => {
    const userId = 'user-5-2-no-labs';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(buildAdminMock([], []));
    // Health context present (a goal is set).
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: ['energy'],
      pregnancyStatus: null,
      age: 35,
    });
    // No labs: concordance is empty -> hasLabs derives false.
    (computeAndPersistConcordance as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const output = await synthesizeForUser(userId);

    expect(output.completeness).toBeDefined();
    expect(output.completeness?.degraded).toBe(true);
    expect(output.completeness?.confidenceFloor).toBe('reduced');
    expect(output.completeness?.missing).toContain('labs');
    expect(output.completeness?.missing).not.toContain('genetics');
    expect(output.completeness?.missing).not.toContain('health_context');
    expect(output.completeness?.note.length).toBeGreaterThan(0);

    // The recommendation is UNCHANGED (the label never removes anything).
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();
  });
});

describe('5.2 Test 25: fully-populated user -> completeness full, not degraded', () => {
  it('labels the output full when genetics, labs, and health context are all present', async () => {
    const userId = 'user-5-2-full';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(buildAdminMock([], []));
    // Health context present.
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: ['shellfish'],
      medications: ['metformin'],
      goals: ['energy'],
      pregnancyStatus: null,
      age: 35,
    });
    // Labs present: concordance returns at least one record -> hasLabs true.
    (computeAndPersistConcordance as ReturnType<typeof vi.fn>).mockResolvedValue([
      { gene: 'MTHFR', biomarker: 'homocysteine', state: 'concordant', confidence: 0.8 },
    ]);

    const output = await synthesizeForUser(userId);

    expect(output.completeness).toBeDefined();
    expect(output.completeness?.degraded).toBe(false);
    expect(output.completeness?.confidenceFloor).toBe('full');
    expect(output.completeness?.missing).toEqual([]);
    expect(output.completeness?.note).toBe('');
  });
});

describe('5.2 Test 26: no variants + no labs + no health context -> minimal', () => {
  it('labels minimal when all three required inputs are absent', async () => {
    const userId = 'user-5-2-minimal';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // No variants.
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(buildAdminMock([], []));
    // No health context (all empty).
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    // No labs.
    (computeAndPersistConcordance as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const output = await synthesizeForUser(userId);

    expect(output.completeness).toBeDefined();
    expect(output.completeness?.degraded).toBe(true);
    expect(output.completeness?.confidenceFloor).toBe('minimal');
    expect(output.completeness?.missing).toEqual(['genetics', 'labs', 'health_context']);
  });
});

describe('5.2 Test 27: completeness label NEVER changes the HFE iron interlock', () => {
  it('drops iron AND labels the degraded output (label and interlock are orthogonal)', async () => {
    const userId = 'user-5-2-hfe-label';

    const ironPreferRule = {
      id: 'rule-hfe-prefer',
      rsid: 'rs1800562',
      gene: 'HFE',
      genotype_match: 'AA',
      effect: 'HFE iron prefer (SHOULD be dropped by interlock).',
      action_type: 'prefer_form',
      recommended_form: 'iron',
      flagged_form: undefined,
      avoid_list: [],
      evidence_tier: 1,
      sensitive: false,
      review_status: 'published',
      created_at: '2026-01-01T00:00:00Z',
    };

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([
      contraindicateRule(),
      ironPreferRule,
    ]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1800562', gene: 'HFE', genotype: 'AA', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(buildAdminMock([], []));
    // No labs and no health context -> the output is degraded.
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: [],
      pregnancyStatus: null,
      age: null,
    });
    (computeAndPersistConcordance as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const output = await synthesizeForUser(userId);

    // The interlock STILL blocks iron regardless of the completeness label.
    const ironRec = output.recommended_vitamins_minerals.find((r) =>
      r.form.toLowerCase().includes('iron'),
    );
    expect(ironRec).toBeUndefined();

    // And the output is labeled degraded (missing labs + health_context).
    expect(output.completeness?.degraded).toBe(true);
    expect(output.completeness?.missing).toContain('labs');
    expect(output.completeness?.missing).toContain('health_context');
  });
});

describe('5.2 Test 28: completeness is CONSERVATIVE on unknown labs (absent concordance -> missing)', () => {
  it('treats an unknown/absent labs signal as missing (lower confidence), never over-stated', async () => {
    const userId = 'user-5-2-labs-unknown';

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([preferFormRule()]);
    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
    ]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(buildAdminMock([], []));
    (getLatestUserHealthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      allergies: [],
      medications: [],
      goals: ['energy'],
      pregnancyStatus: null,
      age: 35,
    });
    // Concordance returns an empty/unknown labs signal. The conservative rule:
    // unknown -> treated as missing (lower confidence), so labs is listed missing
    // and confidence is never over-stated to "full".
    (computeAndPersistConcordance as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const output = await synthesizeForUser(userId);

    // Recommendation still produced (label never removes anything).
    const rec = output.recommended_vitamins_minerals.find((r) => r.form === 'L-methylfolate');
    expect(rec).toBeDefined();

    // Conservative: labs unknown is treated as missing -> degraded, labs listed,
    // floor is NOT 'full'.
    expect(output.completeness).toBeDefined();
    expect(output.completeness?.degraded).toBe(true);
    expect(output.completeness?.missing).toContain('labs');
    expect(output.completeness?.confidenceFloor).not.toBe('full');
  });
});
// === PROMPT 208b 5.2 EXTENSION END ===
