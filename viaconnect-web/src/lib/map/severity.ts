// Prompt #100 MAP Enforcement — pure severity classifier.
// Mirrors the DB `classify_map_severity` function so callers can
// preview severity from observations without a round-trip.

import type { MAPSeverity } from './types';

export interface SeverityInput {
  observedPriceCents: number;
  mapPriceCents: number;
  ingredientCostFloorCents: number;
}

/** Pure: classify a price observation into one of the four MAP
 *  severity bands, or null if the observation is at/above MAP (no
 *  violation). Matches Prompt #100 §4.3. */
export function classifyMAPSeverity({
  observedPriceCents,
  mapPriceCents,
  ingredientCostFloorCents,
}: SeverityInput): MAPSeverity | null {
  if (mapPriceCents <= 0) return null;
  if (observedPriceCents < 0) return null;
  if (observedPriceCents < ingredientCostFloorCents) return 'black';
  if (observedPriceCents >= mapPriceCents) return null;
  const discountPct = ((mapPriceCents - observedPriceCents) / mapPriceCents) * 100;
  if (discountPct > 15) return 'red';
  if (discountPct > 5) return 'orange';
  return 'yellow';
}

/** Pure: discount percent below MAP, rounded to 2 decimals. Returns
 *  0 when observed >= MAP. */
export function discountPctBelowMAP(observedCents: number, mapCents: number): number {
  if (mapCents <= 0) return 0;
  if (observedCents >= mapCents) return 0;
  const pct = ((mapCents - observedCents) / mapCents) * 100;
  return Math.round(pct * 100) / 100;
}

/** Severity color tokens for Tailwind pill rendering. Tone stays
 *  consistent across portals. */
export const SEVERITY_TONE: Record<MAPSeverity, string> = {
  yellow: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  orange: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  black: 'bg-red-600/25 text-red-200 border-red-600/40',
};

export const SEVERITY_LABEL: Record<MAPSeverity, string> = {
  yellow: 'Yellow (within 5% of MAP)',
  orange: 'Orange (5% to 15% below MAP)',
  red: 'Red (more than 15% below MAP)',
  black: 'Black (below ingredient cost floor)',
};
