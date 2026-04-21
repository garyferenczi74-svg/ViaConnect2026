// Prompt #105 §3.6 — post-generation validator.
// Catches Claude output that slipped past system prompts: investment
// advice, unbounded forecasts, individual attributions.

const INVESTMENT_ADVICE_PATTERNS: readonly string[] = [
  'buy the stock',
  'sell the stock',
  'investors should',
  'we recommend investors',
  'investment recommendation',
  'not investment advice', // even this phrase is suspicious — it means AI tried to caveat
];

const UNBOUNDED_FORECAST_PATTERNS: readonly string[] = [
  'will definitely',
  'guaranteed to',
  'we will achieve',
  'certain to reach',
  'will undoubtedly',
];

const INDIVIDUAL_ATTRIBUTION_PATTERNS: readonly RegExp[] = [
  // "thanks to X" / "driven by X" pointing at a named individual
  /\b(?:thanks|credit|driven) (?:to|by) (?:[A-Z][a-z]+ [A-Z][a-z]+)/,
  // "X's leadership"
  /\b[A-Z][a-z]+ [A-Z][a-z]+'s leadership\b/,
];

export type PostGenerationFinding =
  | 'INVESTMENT_ADVICE'
  | 'UNBOUNDED_FORECAST'
  | 'INDIVIDUAL_ATTRIBUTION';

export interface PostGenerationValidationResult {
  ok: boolean;
  findings: Array<{ finding: PostGenerationFinding; matchedText: string }>;
}

/** Pure: scan AI-drafted commentary for prohibited content shapes.
 *  §3.6 says violations get "flagged for human rewrite" — the
 *  returned findings drive that flagging. */
export function validateGeneratedMDNA(commentary: string): PostGenerationValidationResult {
  const findings: PostGenerationValidationResult['findings'] = [];
  const lower = commentary.toLowerCase();
  for (const p of INVESTMENT_ADVICE_PATTERNS) {
    if (lower.includes(p)) {
      findings.push({ finding: 'INVESTMENT_ADVICE', matchedText: p });
    }
  }
  for (const p of UNBOUNDED_FORECAST_PATTERNS) {
    if (lower.includes(p)) {
      findings.push({ finding: 'UNBOUNDED_FORECAST', matchedText: p });
    }
  }
  for (const re of INDIVIDUAL_ATTRIBUTION_PATTERNS) {
    const m = commentary.match(re);
    if (m && m[0]) findings.push({ finding: 'INDIVIDUAL_ATTRIBUTION', matchedText: m[0] });
  }
  return { ok: findings.length === 0, findings };
}

/** Pure: acceptable forecast hedge phrases that a bounded forward-looking
 *  section CAN use (as long as it's in the dedicated section and wrapped
 *  with the standard safe-harbor disclaimer). Used for CFO guidance. */
export const ACCEPTABLE_FORECAST_HEDGES: readonly string[] = [
  'may',
  'could',
  'we expect',
  'we anticipate',
  'based on current trends',
  'subject to risks and uncertainties',
];
