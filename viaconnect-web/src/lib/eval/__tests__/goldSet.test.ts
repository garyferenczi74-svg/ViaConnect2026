/**
 * src/lib/eval/__tests__/goldSet.test.ts
 *
 * Gold-set regression gate -- Prompt 208a Module L Task L2 (2026-06-21).
 *
 * This is the deploy gate. Each scenario in GOLD_SET exercises the REAL
 * synthesizeForUser with a controlled DB mock. If synthesis ever stops
 * blocking HFE iron or stops recommending methylfolate, this file fails CI.
 *
 * Mocking pattern mirrors src/lib/protocol/__tests__/synthesis.test.ts:
 *   - getPublishedRules mocked to return scenario.inputs.publishedRules
 *   - ruleMatchesGenotype mocked with real-logic (exact or wildcard match)
 *   - getQualifiedUserVariants mocked to return scenario.inputs.variants
 *   - createAdminClient mocked to serve scenario.inputs.currentSupplements
 *     + accept user_protocol_synthesis inserts (eval_runs inserts too)
 *   - getPublishedAtoms mocked (not used by synthesis; included to prevent
 *     import-resolution failures from knowledgeAtoms module)
 *
 * No em/en-dashes. No emojis. No package.json changes. No live DB writes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks - must be declared before any imports that pull the mocked
// modules, and must mirror the synthesis.test.ts pattern exactly.
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

// ---------------------------------------------------------------------------
// Imports (after vi.mock declarations)
// ---------------------------------------------------------------------------

import { synthesizeForUser } from '@/lib/protocol/synthesis';
import { getPublishedRules, ruleMatchesGenotype } from '@/lib/kb/snpProtocolRules';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';

import {
  GOLD_SET,
  evaluateGoldOutputs,
  persistEvalRun,
  type GoldScenario,
  type GoldRunResult,
} from '../goldSet';

import type { SynthesisOutput } from '@/lib/protocol/synthesis';

// ---------------------------------------------------------------------------
// Mock factory helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal admin mock that:
 *   - returns supplementRows on user_current_supplements select
 *   - accepts inserts on user_protocol_synthesis and eval_runs
 *   - handles all other tables gracefully (empty data, no error)
 */
function buildAdminMock(supplementRows: { supplement_name: string }[]) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'user_current_supplements') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockResolvedValue({ data: supplementRows, error: null }),
          })),
        };
      }
      if (table === 'user_protocol_synthesis' || table === 'eval_runs') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      // Fallback for any other table
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Shared beforeEach: reset mocks and set sensible defaults
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Real-logic ruleMatchesGenotype approximation:
  //   - empty or '*' -> wildcard match
  //   - otherwise case-insensitive exact match (ignoring strand order for now;
  //     the gold scenarios use simple homozygous/canonical genotypes)
  (ruleMatchesGenotype as ReturnType<typeof vi.fn>).mockImplementation(
    (rule: { genotype_match: string }, genotype: string) => {
      const m = rule.genotype_match.trim();
      if (m === '' || m === '*') return true;
      return m.toUpperCase() === genotype.toUpperCase();
    },
  );

  // Default: getQualifiedUserVariants returns [] (overridden per scenario)
  (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([]);

  // Default: getPublishedRules returns [] (overridden per scenario)
  (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([]);

  // Default: empty admin mock
  (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
    buildAdminMock([]),
  );
});

// ---------------------------------------------------------------------------
// Helper: run a single gold scenario through the REAL synthesizeForUser
// ---------------------------------------------------------------------------

async function runScenario(scenario: GoldScenario) {
  // Wire mocks from scenario.inputs
  (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue(
    scenario.inputs.publishedRules,
  );
  (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue(
    scenario.inputs.variants,
  );
  (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
    buildAdminMock(
      scenario.inputs.currentSupplements.map((s) => ({ supplement_name: s })),
    ),
  );

  const output = await synthesizeForUser('gold-user');
  return output;
}

// ---------------------------------------------------------------------------
// Gate tests: each GOLD_SET scenario must pass against the REAL synthesizeForUser
// ---------------------------------------------------------------------------

describe('Gold set regression gate', () => {
  for (const scenario of GOLD_SET) {
    it(`${scenario.id}: ${scenario.description}`, async () => {
      const output = await runScenario(scenario);
      const result = evaluateGoldOutputs([{ scenario, output }]);
      expect(result.failed, result.failures.map((f) => f.detail).join('; ')).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Meta-test: prove the harness catches a regression (gate is not vacuous)
//
// We build a fake SynthesisOutput that VIOLATES hfe-never-iron (iron appears
// in recommended_vitamins_minerals) and assert evaluateGoldOutputs reports it
// as failed. This proves the gate would catch a real regression in synthesis.
// ---------------------------------------------------------------------------

describe('Meta-test: harness catches regressions', () => {
  it('reports failed >= 1 when hfe-never-iron invariant is violated', () => {
    const hfeScenario = GOLD_SET.find((s) => s.id === 'hfe-never-iron');
    expect(hfeScenario).toBeDefined();

    // Build a violating output: iron sneaked into recommendations
    const violatingOutput: SynthesisOutput = {
      recommended_vitamins_minerals: [
        {
          form: 'iron',
          rationale: 'Regression: iron was not blocked',
          evidenceTier: 1,
          ruleRsid: 'rs1800562',
        },
      ],
      supplement_flags: [],
      nutrition_guidance: { avoid: [], prefer: [] },
      arnold_context: { activeTopics: [] },
      disclaimers_version: 'dshea-2026-06',
    };

    const result = evaluateGoldOutputs([{ scenario: hfeScenario!, output: violatingOutput }]);

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.failures.some((f) => f.id === 'hfe-never-iron')).toBe(true);
    expect(result.passed).toBe(0);
  });

  it('reports passed = 1 for a passing output (meta-test self-check)', () => {
    const noUploadScenario = GOLD_SET.find((s) => s.id === 'no-upload-safe');
    expect(noUploadScenario).toBeDefined();

    // A valid empty output that satisfies no-upload-safe
    const validOutput: SynthesisOutput = {
      recommended_vitamins_minerals: [],
      supplement_flags: [],
      nutrition_guidance: { avoid: [], prefer: [] },
      arnold_context: { activeTopics: [] },
      disclaimers_version: 'dshea-2026-06',
    };

    const result = evaluateGoldOutputs([{ scenario: noUploadScenario!, output: validOutput }]);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// persistEvalRun tests
// ---------------------------------------------------------------------------

describe('persistEvalRun', () => {
  it('inserts an eval_runs row on success', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'eval_runs') {
          return { insert: mockInsert };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });

    const result: GoldRunResult = { passed: 3, failed: 0, failures: [] };
    await persistEvalRun(result);

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsert).toHaveBeenCalledWith([
      { passed: 3, failed: 0, failures: [] },
    ]);
  });

  it('fails open on DB error (does not throw)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
      })),
    });

    const result: GoldRunResult = {
      passed: 0,
      failed: 1,
      failures: [{ id: 'test', detail: 'test failure' }],
    };

    // Must not throw
    await expect(persistEvalRun(result)).resolves.toBeUndefined();
  });

  it('fails open when createAdminClient throws (does not throw)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('no DB credentials');
    });

    const result: GoldRunResult = { passed: 0, failed: 0, failures: [] };
    await expect(persistEvalRun(result)).resolves.toBeUndefined();
  });
});
