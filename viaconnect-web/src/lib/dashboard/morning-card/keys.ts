// Eight marketing chips on the score-first morning card.
// DISPLAY only. These keys do not feed Bio Optimization Score math.
// /api/bos/current remains the SSOT for the numeric score.

export const MARKETING_CHIP_KEYS = [
  'recovery',
  'sleep',
  'strain',
  'regimen',
  'nutrients',
  'symptoms',
  'metabolic',
  'immune',
] as const;

export type MarketingChipKey = (typeof MARKETING_CHIP_KEYS)[number];

export const MARKETING_CHIP_LABELS: Record<MarketingChipKey, string> = {
  recovery: 'Recovery',
  sleep: 'Sleep',
  strain: 'Strain',
  regimen: 'Regimen',
  nutrients: 'Nutrients',
  symptoms: 'Symptoms',
  metabolic: 'Metabolic',
  immune: 'Immune',
};

/** Lucide icon component names. UI maps these; this module stays JSX-free. */
export const MARKETING_CHIP_ICONS: Record<MarketingChipKey, string> = {
  recovery: 'Heart',
  sleep: 'Moon',
  strain: 'Activity',
  regimen: 'Pill',
  nutrients: 'Apple',
  symptoms: 'ClipboardList',
  metabolic: 'Leaf',
  immune: 'Shield',
};

export function isMarketingChipKey(value: string): value is MarketingChipKey {
  return (MARKETING_CHIP_KEYS as readonly string[]).includes(value);
}
