/**
 * src/lib/eval/goldSet.ts
 *
 * Gold-set eval harness for the synthesis + safety-interlock pipeline.
 * Prompt 208a Module L Task L2 (2026-06-21).
 *
 * Locks canonical safety invariants as continuously-runnable gold scenarios.
 * Tests must call the REAL synthesizeForUser (mock only the DB layer); these
 * types and the evaluateGoldOutputs function are pure -- no DB access, no
 * external calls.
 *
 * No em/en-dashes. No emojis. No package.json changes. No DB writes in pure
 * functions. persistEvalRun is fail-open (never throws).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import type { SynthesisOutput } from '@/lib/protocol/synthesis';
import type { SnpProtocolRule } from '@/lib/kb/snpProtocolRules';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GoldInputs {
  variants: {
    rsid: string;
    gene?: string;
    genotype: string;
    panel_key?: string;
    status?: string;
  }[];
  publishedRules: SnpProtocolRule[];
  currentSupplements: string[];
}

export interface GoldScenario {
  id: string;
  description: string;
  inputs: GoldInputs;
  assert: (o: SynthesisOutput) => boolean;
  failDetail: (o: SynthesisOutput) => string;
}

export interface GoldRunResult {
  passed: number;
  failed: number;
  failures: { id: string; detail: string }[];
}

// ---------------------------------------------------------------------------
// GOLD_SET - canonical safety invariants
// ---------------------------------------------------------------------------

/**
 * Minimal SnpProtocolRule skeleton used in test inputs.
 * Only fields that synthesis.ts and safetyInterlocks.ts read are set.
 */
function makeRule(overrides: Partial<SnpProtocolRule>): SnpProtocolRule {
  return {
    id: 'gold-rule',
    rsid: '',
    gene: '',
    genotype_match: '',
    effect: '',
    action_type: 'prefer_form',
    recommended_form: undefined,
    flagged_form: undefined,
    avoid_list: [],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'published',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as SnpProtocolRule;
}

export const GOLD_SET: GoldScenario[] = [
  // ---------------------------------------------------------------------------
  // Scenario 1: HFE carrier - iron NEVER recommended regardless of input
  //
  // Even if a prefer_form rule for iron exists alongside the contraindicate
  // rule, the safety interlock (interlock 1) must block iron from reaching
  // recommended_vitamins_minerals. This is the hardest safety invariant.
  // ---------------------------------------------------------------------------
  {
    id: 'hfe-never-iron',
    description:
      'HFE C282Y homozygous (rs1800562 AA): iron is NEVER recommended even when a prefer_form iron rule is also present.',
    inputs: {
      variants: [
        { rsid: 'rs1800562', gene: 'HFE', genotype: 'AA', panel_key: 'methylation', status: 'confirmed' },
      ],
      publishedRules: [
        // Contraindicate rule: iron is blocked
        makeRule({
          id: 'gold-hfe-contra',
          rsid: 'rs1800562',
          gene: 'HFE',
          genotype_match: 'AA',
          effect: 'HFE C282Y homozygous: hereditary hemochromatosis risk.',
          action_type: 'contraindicate',
          flagged_form: 'iron',
          avoid_list: ['iron supplements'],
          evidence_tier: 1,
        }),
        // Adversarial prefer_form rule: also requests iron -- interlock must drop it
        makeRule({
          id: 'gold-hfe-prefer',
          rsid: 'rs1800562',
          gene: 'HFE',
          genotype_match: 'AA',
          effect: 'HFE iron prefer (MUST be dropped by interlock).',
          action_type: 'prefer_form',
          recommended_form: 'iron',
          flagged_form: undefined,
          avoid_list: [],
          evidence_tier: 1,
        }),
      ],
      currentSupplements: [],
    },
    assert: (o: SynthesisOutput): boolean => {
      return !o.recommended_vitamins_minerals.some(
        (r) => r.form.toLowerCase().includes('iron'),
      );
    },
    failDetail: (o: SynthesisOutput): string => {
      const ironRecs = o.recommended_vitamins_minerals.filter(
        (r) => r.form.toLowerCase().includes('iron'),
      );
      return (
        'hfe-never-iron FAILED: iron appeared in recommended_vitamins_minerals: ' +
        JSON.stringify(ironRecs)
      );
    },
  },

  // ---------------------------------------------------------------------------
  // Scenario 2: MTHFR C677T homozygous - methylfolate recommended, folic acid flagged
  //
  // The prefer_form rule must produce: L-methylfolate in recommended,
  // a folic-acid supplement_flag with alternativeForm L-methylfolate,
  // and 'folic-acid-fortified grains' in nutrition_guidance.avoid.
  // ---------------------------------------------------------------------------
  {
    id: 'mthfr-methylfolate',
    description:
      'MTHFR C677T homozygous (rs1801133 TT): L-methylfolate recommended, folic acid flagged, grains avoidance set.',
    inputs: {
      variants: [
        { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' },
      ],
      publishedRules: [
        makeRule({
          id: 'gold-mthfr-prefer',
          rsid: 'rs1801133',
          gene: 'MTHFR',
          genotype_match: 'TT',
          effect: 'Homozygous C677T reduces MTHFR enzyme activity ~70%; folic acid cannot be converted efficiently.',
          action_type: 'prefer_form',
          recommended_form: 'L-methylfolate',
          flagged_form: 'folic acid',
          avoid_list: ['folic-acid-fortified grains'],
          evidence_tier: 2,
        }),
      ],
      currentSupplements: ['folic acid'],
    },
    assert: (o: SynthesisOutput): boolean => {
      // 1. recommended includes L-methylfolate
      const hasRec = o.recommended_vitamins_minerals.some(
        (r) => r.form === 'L-methylfolate',
      );
      // 2. supplement_flags has a folic acid flag with alternativeForm L-methylfolate
      const hasFlag = o.supplement_flags.some(
        (f) =>
          f.current.toLowerCase() === 'folic acid' &&
          f.alternativeForm === 'L-methylfolate',
      );
      // 3. nutrition_guidance.avoid contains the grains item
      const hasAvoid = o.nutrition_guidance.avoid.includes('folic-acid-fortified grains');
      return hasRec && hasFlag && hasAvoid;
    },
    failDetail: (o: SynthesisOutput): string => {
      const hasRec = o.recommended_vitamins_minerals.some((r) => r.form === 'L-methylfolate');
      const hasFlag = o.supplement_flags.some(
        (f) => f.current.toLowerCase() === 'folic acid' && f.alternativeForm === 'L-methylfolate',
      );
      const hasAvoid = o.nutrition_guidance.avoid.includes('folic-acid-fortified grains');
      return (
        'mthfr-methylfolate FAILED:' +
        (!hasRec ? ' L-methylfolate not in recommended;' : '') +
        (!hasFlag ? ' folic-acid flag with alternativeForm missing;' : '') +
        (!hasAvoid ? ' folic-acid-fortified grains not in avoid;' : '') +
        ' recommended=' +
        JSON.stringify(o.recommended_vitamins_minerals) +
        ' flags=' +
        JSON.stringify(o.supplement_flags) +
        ' avoid=' +
        JSON.stringify(o.nutrition_guidance.avoid)
      );
    },
  },

  // ---------------------------------------------------------------------------
  // Scenario 3: No genetic upload - safe empty output, no crash
  //
  // When a user has uploaded no genetic data, synthesizeForUser must return a
  // structurally valid SynthesisOutput with empty recommended_vitamins_minerals.
  // No rule can fire against a user with no variants.
  // ---------------------------------------------------------------------------
  {
    id: 'no-upload-safe',
    description:
      'No genetic upload: synthesizeForUser returns a valid SynthesisOutput with empty recommended list and does not crash.',
    inputs: {
      variants: [],
      publishedRules: [],
      currentSupplements: [],
    },
    assert: (o: SynthesisOutput): boolean => {
      return (
        o !== null &&
        o !== undefined &&
        Array.isArray(o.recommended_vitamins_minerals) &&
        o.recommended_vitamins_minerals.length === 0
      );
    },
    failDetail: (o: SynthesisOutput): string => {
      return (
        'no-upload-safe FAILED: expected empty recommended_vitamins_minerals, got ' +
        JSON.stringify(o?.recommended_vitamins_minerals)
      );
    },
  },
];

// ---------------------------------------------------------------------------
// evaluateGoldOutputs
//
// Pure function. Applies each scenario.assert to its paired output. Collects
// failDetail for any assertion that returns false. Returns a GoldRunResult.
// Never throws; never accesses the DB.
// ---------------------------------------------------------------------------
export function evaluateGoldOutputs(
  pairs: { scenario: GoldScenario; output: SynthesisOutput }[],
): GoldRunResult {
  let passed = 0;
  let failed = 0;
  const failures: { id: string; detail: string }[] = [];

  for (const { scenario, output } of pairs) {
    let assertPassed: boolean;
    try {
      assertPassed = scenario.assert(output);
    } catch (err) {
      // If assert itself throws, count as failure.
      assertPassed = false;
      failures.push({
        id: scenario.id,
        detail: `Assert threw: ${String(err)}`,
      });
      failed++;
      continue;
    }

    if (assertPassed) {
      passed++;
    } else {
      failed++;
      failures.push({
        id: scenario.id,
        detail: scenario.failDetail(output),
      });
    }
  }

  return { passed, failed, failures };
}

// ---------------------------------------------------------------------------
// persistEvalRun
//
// Inserts a row into eval_runs. Fail-open: catches all errors and logs via
// safeLog. Never throws. This is an optional audit trail; a failure here
// must never block the gate test.
// ---------------------------------------------------------------------------
export async function persistEvalRun(result: GoldRunResult): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('eval_runs').insert([
      {
        passed: result.passed,
        failed: result.failed,
        failures: result.failures,
      },
    ]);
    if (error) {
      safeLog.warn('eval', 'persistEvalRun: insert returned error', { error });
    }
  } catch (err) {
    safeLog.error('eval', 'persistEvalRun: threw unexpectedly - failing open', { err });
  }
}
