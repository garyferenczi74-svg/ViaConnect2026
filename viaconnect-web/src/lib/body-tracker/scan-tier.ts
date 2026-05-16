// Body Scanner — Scan Tier resolver.
//
// Phase 1 ships Tier 1 only. Tier 2 (depth sensor upgrade path) and
// Tier 3 (GeneX360 panel integration) will be wired in Phase 2 and
// Phase 3 respectively once the device capability APIs and genomics
// data plumbing are in place. Do not add Phase 2/3 logic here until
// that work ships.

export type ScanTier = 1 | 2 | 3;

export interface ScanTierInput {
  hasLidar: boolean;
  hasArCoreDepth: boolean;
  hasTrueDepth: boolean;
  hasCompletedGenex360Panel: boolean;
}

// Phase 1: always returns Tier 1 regardless of input.
// Phase 2 will add Tier 2 when hasLidar, hasArCoreDepth, or hasTrueDepth is true.
// Phase 3 will add Tier 3 when hasCompletedGenex360Panel is also true.
export function resolveScanTier(_input: ScanTierInput): ScanTier {
  return 1;
}

export const TIER_BADGE_META: Record<
  ScanTier,
  { label: string; lucideIconName: 'Award' | 'ScanLine' | 'Dna'; confidenceTarget: number }
> = {
  1: { label: 'Tier 1', lucideIconName: 'Award',    confidenceTarget: 78 },
  2: { label: 'Tier 2', lucideIconName: 'ScanLine', confidenceTarget: 90 },
  3: { label: 'Tier 3', lucideIconName: 'Dna',      confidenceTarget: 96 },
};
