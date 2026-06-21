/**
 * Pure-TS evidence tier data - no JSX dependency.
 * Imported by EvidenceTierBadge.tsx and directly by tests.
 */

export type EvidenceTier = 1 | 2 | 3;

export interface EvidenceTierMeta {
  label: string;
  tone: 'strong' | 'moderate' | 'emerging';
}

const TIER_META: Record<EvidenceTier, EvidenceTierMeta> = {
  1: { label: 'Tier 1', tone: 'strong' },
  2: { label: 'Tier 2', tone: 'moderate' },
  3: { label: 'Tier 3', tone: 'emerging' },
};

/** Pure function - testable without DOM or JSX. */
export function evidenceTierMeta(tier: EvidenceTier): EvidenceTierMeta {
  return TIER_META[tier];
}
