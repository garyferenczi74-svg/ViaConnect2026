// Body Tracker Cross-Reference Engine — typed shapes + confidence tier helper.
//
// Data sources (per Prompt #85c §6, extended #85l):
//  1. body_tracker      — Arnold's own metrics (always present for any logged user)
//  2. user_current_supplements — Supplement Protocol active items
//  3. body_tracker_connections (wearable rows) — Apple Watch, WHOOP, Oura, Garmin, etc.
//  4. body_tracker_connections (plugin rows)   — Apple Health, Google Fit, Strava, etc.
//  5. clinical_assessments     — CAQ Phase 1 demographics + symptoms
//  6. genetic_profiles         — GeneX360 SNP status results
//
// Lab results are intentionally NOT included in Phase D — no standalone lab table exists
// in the live schema. Phase E will add lab plumbing if a dedicated table lands.

export type CrossReferenceSourceId =
  | 'body_tracker'
  | 'supplements'
  | 'wearable'
  | 'app'
  | 'caq'
  | 'genetics';

export const CROSS_REFERENCE_SOURCE_LABELS: Record<CrossReferenceSourceId, string> = {
  body_tracker: 'Body Tracker',
  supplements:  'Supplement Protocol',
  wearable:     'Connect Wearable',
  app:          'Connect App',
  caq:          'Wellness Assessment',
  genetics:     'GeneX360 Genetics',
};

export interface SupplementProtocolSummary {
  count: number;
  topCategories: string[];
}

export interface CAQSummary {
  hasGoals: boolean;
  hasMedications: boolean;
  hasConditions: boolean;
  completed: boolean;
}

export interface GeneticsSummary {
  hasMthfr: boolean;
  hasComt: boolean;
  hasCyp2d6: boolean;
  reportDate: string | null;
}

// Prompt #85l: wearable + app summaries hold the connected device/plugin name
// (e.g., "WHOOP", "Apple Health") so the card subtitle can identify the source.
export interface WearableSummary {
  sourceId: string;
  sourceName: string;
}

export interface AppSummary {
  sourceId: string;
  sourceName: string;
}

export interface CrossReferenceAvailability {
  bodyTracker: boolean;
  supplements: boolean;
  wearable: boolean;
  app: boolean;
  caq: boolean;
  genetics: boolean;
}

export interface CrossReferenceSnapshot {
  availability: CrossReferenceAvailability;
  supplements: SupplementProtocolSummary | null;
  wearable: WearableSummary | null;
  app: AppSummary | null;
  caq: CAQSummary | null;
  genetics: GeneticsSummary | null;
}

// Confidence tier per spec §6.3:
//   Tier 1 (70%): body tracker only
//   Tier 2 (86%): + supplements OR CAQ
//   Tier 3 (96%): + genetics
export interface ConfidenceTier {
  tier: 1 | 2 | 3;
  pct: number;
  label: string;
}

export function calculateConfidenceTier(a: CrossReferenceAvailability): ConfidenceTier {
  if (a.genetics) return { tier: 3, pct: 96, label: 'Tier 3' };
  if (a.supplements || a.caq) return { tier: 2, pct: 86, label: 'Tier 2' };
  return { tier: 1, pct: 70, label: 'Tier 1' };
}

export function presentSourceIds(a: CrossReferenceAvailability): CrossReferenceSourceId[] {
  const out: CrossReferenceSourceId[] = [];
  if (a.bodyTracker) out.push('body_tracker');
  if (a.supplements) out.push('supplements');
  if (a.caq) out.push('caq');
  if (a.genetics) out.push('genetics');
  return out;
}

export function missingSourceIds(a: CrossReferenceAvailability): CrossReferenceSourceId[] {
  const out: CrossReferenceSourceId[] = [];
  if (!a.supplements) out.push('supplements');
  if (!a.caq) out.push('caq');
  if (!a.genetics) out.push('genetics');
  return out;
}
