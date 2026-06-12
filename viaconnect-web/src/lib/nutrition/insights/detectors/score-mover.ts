// Prompt 192 Task 2: score_mover detector (weekly).
//
// Takes the other detectors' facts as candidates and deterministically
// ranks them by severity, then magnitude, then confidence, then a fixed
// type priority, then fingerprint. Emits the single winner as the one
// factor with the most room to move the user's nutrition score this week.
// consistency_streak is excluded from candidacy (it is reinforcement, not
// a mover), as is any prior score_mover fact.

import { makeFingerprint } from '../fingerprint';
import type { DetectorInput, InsightFact } from '../types';

const SEVERITY_RANK: Record<InsightFact['severity'], number> = {
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
  'macro_gap',
  'micronutrient_gap',
  'supplement_meal_alignment',
  'quality_trend',
  'hydration_correlation',
  'meal_timing_pattern',
];

function magnitudeOf(fact: InsightFact): number {
  const value = fact.snapshot.magnitudePct;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function compareCandidates(a: InsightFact, b: InsightFact): number {
  return (
    SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
    magnitudeOf(b) - magnitudeOf(a) ||
    CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence] ||
    TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type) ||
    a.factFingerprint.localeCompare(b.factFingerprint)
  );
}

export function detectScoreMover(
  _input: DetectorInput,
  candidates: ReadonlyArray<InsightFact>,
): InsightFact[] {
  const eligible = candidates.filter(
    (f) => f.type !== 'consistency_streak' && f.type !== 'score_mover',
  );
  if (eligible.length < 2) return [];

  const winner = [...eligible].sort(compareCandidates)[0];

  return [
    {
      type: 'score_mover',
      horizon: 'weekly',
      severity: winner.severity,
      confidence: winner.confidence,
      factFingerprint: makeFingerprint('score_mover', 'weekly', {
        winnerType: winner.type,
        winnerFingerprint: winner.factFingerprint,
      }),
      snapshot: {
        winnerType: winner.type,
        winnerFingerprint: winner.factFingerprint,
        winnerSnapshot: winner.snapshot,
        candidatesConsidered: eligible.length,
        magnitudePct: magnitudeOf(winner),
      },
      productSuggestion: null,
    },
  ];
}
