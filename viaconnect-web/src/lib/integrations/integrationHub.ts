// Integration Hub pipeline (Prompt #62j).
// Orchestrates: receive → normalize → dedupe → route → recalculate.

import type { NormalizedData } from './dataNormalizer';
import { deduplicateData } from './deduplicator';
import { resolveConflicts } from './conflictResolver';
import { getAffectedGauges } from '@/lib/scoring/triggerRecalc';
import type { GaugeId } from '@/lib/scoring/dailyScoreEngine';

export interface ExternalSource {
  appId: string;
  userId: string;
}

const DATA_TYPE_TO_GAUGE: Record<string, GaugeId[]> = {
  meal: ['nutrition'],
  workout: ['exercise'],
  sleep: ['sleep', 'recovery'],
  steps: ['steps'],
  heart_rate: ['recovery'],
  hrv: ['stress', 'recovery'],
  weight: [],
  mindfulness: ['stress'],
  water: ['nutrition'],
};

export async function processIncomingData(
  source: ExternalSource,
  normalizedItems: NormalizedData[],
): Promise<{ processed: number; skipped: number; gaugesAffected: GaugeId[] }> {
  if (normalizedItems.length === 0) {
    return { processed: 0, skipped: 0, gaugesAffected: [] };
  }

  // Step 1: Deduplicate
  const unique = await deduplicateData(normalizedItems, source.userId);
  const skipped = normalizedItems.length - unique.length;

  if (unique.length === 0) {
    return { processed: 0, skipped, gaugesAffected: [] };
  }

  // Step 2: Resolve conflicts (group by dataType + date)
  const resolved = resolveConflicts(unique);

  // Step 3: Determine affected gauges
  const gaugesAffected = new Set<GaugeId>();
  for (const item of resolved) {
    const gauges = DATA_TYPE_TO_GAUGE[item.dataType] ?? [];
    gauges.forEach((g) => gaugesAffected.add(g));
  }

  // Step 4: Store in daily_score_inputs + meal_logs (handled by caller)
  // Step 5: Trigger recalculation (handled by caller)

  return {
    processed: resolved.length,
    skipped,
    gaugesAffected: Array.from(gaugesAffected),
  };
}
