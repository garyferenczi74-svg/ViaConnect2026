// Prompt #100 MAP Enforcement — pure compliance score + tier derivation.

import type { MAPComplianceTier } from './types';

export interface ScoringInput {
  yellowViolations90d: number;
  orangeViolations90d: number;
  redViolations90d: number;
  blackViolations90d: number;
  daysSinceLastViolation: number;
  selfReportedRemediations: number;
}

export interface ScoringResult {
  score: number;
  tier: MAPComplianceTier;
}

/** Pure: compute the 0 to 100 MAP Compliance Score per Prompt #100 §4.3.
 *  Clamped to [0, 100]. Mirrors the DB implementation in
 *  calculate_map_compliance_scores(). */
export function computeMAPComplianceScore(input: ScoringInput): number {
  const base =
    100
    - input.yellowViolations90d * 1
    - input.orangeViolations90d * 3
    - input.redViolations90d * 8
    - input.blackViolations90d * 20
    + Math.min(Math.floor(input.daysSinceLastViolation * 0.1), 10)
    + Math.min(input.selfReportedRemediations * 2, 10);
  return Math.max(0, Math.min(100, base));
}

/** Pure: map the raw score to a compliance tier. Platinum requires
 *  zero red + black violations in the 90-day window (not just a high
 *  score) — the clean-record check. Gold also requires 0 red/black. */
export function deriveMAPComplianceTier(
  score: number,
  input: Pick<ScoringInput, 'redViolations90d' | 'blackViolations90d'>,
): MAPComplianceTier {
  if (score < 50) return 'Probation';
  if (score < 70) return 'Bronze';
  if (score < 85) return 'Silver';
  if (score < 95 || input.redViolations90d > 0 || input.blackViolations90d > 0) {
    return 'Gold';
  }
  return 'Platinum';
}

/** Convenience: compute score + tier in one call. */
export function computeMAPCompliance(input: ScoringInput): ScoringResult {
  const score = computeMAPComplianceScore(input);
  const tier = deriveMAPComplianceTier(score, input);
  return { score, tier };
}

/** Tone tokens for rendering the MAP compliance tier pill. */
export const TIER_TONE: Record<MAPComplianceTier, string> = {
  Platinum: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  Gold: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Silver: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
  Bronze: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Probation: 'bg-red-500/15 text-red-300 border-red-500/30',
};
