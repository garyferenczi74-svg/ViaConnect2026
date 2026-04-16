// Prompt #86 — Confidence tier detection + score ceiling enforcement

import type { DataLayer, ConfidenceTier, ConfidenceTierName } from './types';

export const TIER_DEFINITIONS: Record<ConfidenceTierName, ConfidenceTier> = {
  baseline:   { name: 'baseline',   label: 'Assessment Based',       percentage: 72, scoreCeiling: 85 },
  engaged:    { name: 'engaged',    label: 'Actively Tracking',      percentage: 82, scoreCeiling: 92 },
  clinical:   { name: 'clinical',   label: 'Lab Validated',          percentage: 86, scoreCeiling: 97 },
  precision:  { name: 'precision',  label: 'Genetically Optimized',  percentage: 96, scoreCeiling: 100 },
  full_stack: { name: 'full_stack', label: 'Complete Intelligence',   percentage: 99, scoreCeiling: 100 },
};

const LAYER_CONFIDENCE: Record<DataLayer, number> = {
  L1_CAQ:       72,
  L2_SYMPTOMS:  0, // included in L1 base
  L3_DAILY:     4,
  L4_BODY:      3,
  L5_NUTRITION:  3,
  L6_PROTOCOL:   2,
  L7_LABS:      14,
  L8_GENETICS:  10,
};

export function detectConfidenceTier(activeLayers: Set<DataLayer>): ConfidenceTier {
  if (!activeLayers.has('L1_CAQ')) {
    return { name: 'baseline', label: 'No Assessment', percentage: 0, scoreCeiling: 40 };
  }

  const hasLabs = activeLayers.has('L7_LABS');
  const hasGenetics = activeLayers.has('L8_GENETICS');
  const hasBehavioral =
    activeLayers.has('L3_DAILY') ||
    activeLayers.has('L4_BODY') ||
    activeLayers.has('L5_NUTRITION') ||
    activeLayers.has('L6_PROTOCOL');

  // All 8 active
  const allActive = Array.from(activeLayers).length >= 7; // L2 is bundled with L1
  if (allActive && hasLabs && hasGenetics) return TIER_DEFINITIONS.full_stack;
  if (hasLabs && hasGenetics) return TIER_DEFINITIONS.precision;
  if (hasLabs) return TIER_DEFINITIONS.clinical;
  if (hasBehavioral) return TIER_DEFINITIONS.engaged;
  return TIER_DEFINITIONS.baseline;
}

export function calculateConfidencePercentage(activeLayers: Set<DataLayer>): number {
  let total = 0;
  for (const layer of activeLayers) {
    total += LAYER_CONFIDENCE[layer] ?? 0;
  }
  return Math.min(99, total);
}

export function enforceScoreCeiling(rawScore: number, tier: ConfidenceTier): number {
  return Math.round(Math.min(tier.scoreCeiling, Math.max(0, rawScore)));
}
