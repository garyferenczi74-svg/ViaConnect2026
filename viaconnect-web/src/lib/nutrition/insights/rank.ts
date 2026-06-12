// Prompt 192 Task 2: eligibility gates, dedup, ranking, and caps.
//
// Cold start gates (spec section 3):
//   under 3 scored meals total: no generation at all.
//   3 to 10 scored meals: only consistency_streak and daily macro_gap.
//   weekly horizon facts additionally need at least 3 scored days in the
//   prior 7 day window.
//
// Dedup: a fact whose fingerprint matches a still active prior insight of
// the same type is suppressed unless its severity increased.
//
// Caps: 3 daily insights + 5 weekly insights per run. The 'meal' horizon
// (in the DB enum, unused by the current detectors) counts against the
// daily cap.

import type { DetectorInput, InsightFact, InsightSeverity } from './types';

export const DAILY_CAP = 3;
export const WEEKLY_CAP = 5;

const COLD_START_MIN_MEALS = 3;
const COLD_START_RESTRICTED_MAX_MEALS = 10;
const WEEKLY_MIN_SCORED_DAYS = 3;

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  attention: 2,
  positive: 1,
  info: 0,
};

const CONFIDENCE_RANK: Record<InsightFact['confidence'], number> = {
  high: 2,
  medium: 1,
  low: 0,
};

const TYPE_PRIORITY: ReadonlyArray<InsightFact['type']> = [
  'score_mover',
  'macro_gap',
  'micronutrient_gap',
  'supplement_meal_alignment',
  'quality_trend',
  'hydration_correlation',
  'meal_timing_pattern',
  'consistency_streak',
];

export function severityRank(severity: InsightSeverity): number {
  return SEVERITY_RANK[severity];
}

function magnitudeOf(fact: InsightFact): number {
  const value = fact.snapshot.magnitudePct;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function rankCompare(a: InsightFact, b: InsightFact): number {
  return (
    SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
    CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence] ||
    magnitudeOf(b) - magnitudeOf(a) ||
    TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type) ||
    a.factFingerprint.localeCompare(b.factFingerprint)
  );
}

function applyGates(facts: InsightFact[], input: DetectorInput): InsightFact[] {
  const scored = input.scoredMeals.filter((m) => m.qualityScore !== null);
  if (scored.length < COLD_START_MIN_MEALS) return [];

  let gated = facts;
  if (scored.length <= COLD_START_RESTRICTED_MAX_MEALS) {
    gated = gated.filter(
      (f) =>
        (f.type === 'consistency_streak' && f.horizon === 'daily') ||
        (f.type === 'macro_gap' && f.horizon === 'daily'),
    );
  }

  const scoredDays = new Set(scored.map((m) => m.date)).size;
  if (scoredDays < WEEKLY_MIN_SCORED_DAYS) {
    gated = gated.filter((f) => f.horizon !== 'weekly');
  }

  return gated;
}

function dedupe(facts: InsightFact[], input: DetectorInput): InsightFact[] {
  return facts.filter((fact) => {
    const prior = input.priorActiveInsights.find(
      (p) => p.type === fact.type && p.factFingerprint === fact.factFingerprint,
    );
    if (!prior) return true;
    return SEVERITY_RANK[fact.severity] > SEVERITY_RANK[prior.severity];
  });
}

function applyCaps(facts: InsightFact[]): InsightFact[] {
  const ranked = [...facts].sort(rankCompare);
  const selected: InsightFact[] = [];
  let dailyCount = 0;
  let weeklyCount = 0;
  for (const fact of ranked) {
    if (fact.horizon === 'weekly') {
      if (weeklyCount >= WEEKLY_CAP) continue;
      weeklyCount += 1;
    } else {
      if (dailyCount >= DAILY_CAP) continue;
      dailyCount += 1;
    }
    selected.push(fact);
  }
  return selected;
}

/** Gates, dedup, and caps in order. Pure. */
export function selectInsights(facts: InsightFact[], input: DetectorInput): InsightFact[] {
  return applyCaps(dedupe(applyGates(facts, input), input));
}
