// Prompt #105 §3 — consolidated forbidden-token scanner used by the
// test suite to enforce Helix isolation, PHI/PII isolation, privileged
// legal communication isolation, and practitioner-tax-row isolation.

/** Tokens that must NEVER appear in any executive-reporting source file
 *  (except guardrails.ts itself) or rendered board artifact. */
export const FORBIDDEN_EXEC_TOKENS: readonly string[] = [
  // §3.1 Helix isolation (individual-user level)
  'helix_challenges',
  'helix_achievements',
  'helix_leaderboard',
  'helix_token_balance',
  'helix_tier_multiplier',
  // §3.4 privileged legal communications
  'legal_privileged_communications',
  // §3.4 tax documents at row level
  'practitioner_tax_documents.',
  // §3.4 PHI tables
  'caq_submissions',
  'lab_uploads',
  'genetic_uploads',
  'symptom_logs',
  // Brand compliance words forbidden elsewhere
  'Vitality Score',
  'Genetic Optimization',
];

export interface ExecGuardrailScanResult {
  ok: boolean;
  hits: Array<{ token: string; offset: number }>;
}

export function scanForForbiddenExecTokens(source: string): ExecGuardrailScanResult {
  const hits: ExecGuardrailScanResult['hits'] = [];
  for (const token of FORBIDDEN_EXEC_TOKENS) {
    const offset = source.indexOf(token);
    if (offset !== -1) hits.push({ token, offset });
  }
  return { ok: hits.length === 0, hits };
}

/** Pure: aggregate-only Helix is permitted (total tokens outstanding,
 *  redemption rate, gamification engagement %) per §3.1. This helper
 *  distinguishes the aggregate shape from individual-user tokens. */
export const PERMITTED_AGGREGATE_HELIX_KPIS: readonly string[] = [
  'helix-tokens-outstanding-aggregate',
  'helix-redemption-rate-aggregate',
  'helix-gamification-engagement-aggregate',
];

export function isPermittedAggregateHelixKpi(kpiId: string): boolean {
  return (PERMITTED_AGGREGATE_HELIX_KPIS as readonly string[]).includes(kpiId);
}
