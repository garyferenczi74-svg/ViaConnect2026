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

vi.mock('@/lib/kb/knowledgeAtoms', () => ({
  getPublishedAtoms: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/genetics/qc/qualifiedVariants', () => ({
  getQualifiedUserVariants: vi.fn(),
}));

// safeLog is real (no side effects in tests, just console output).

import {
  synthesizeForUser,
  canonicalNutrientKey,
  DISCLAIMERS_VERSION,
} from '../synthesis';

import { getPublishedRules, ruleMatchesGenotype } from '@/lib/kb/snpProtocolRules';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';

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
