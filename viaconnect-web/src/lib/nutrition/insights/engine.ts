// Prompt 192 Task 2: the insight engine.
//
// Pure given its inputs: detectors -> gates/dedup/caps -> composition
// (injected composer with template fallback) -> compliance gate ->
// persistable rows shaped for public.nutrition_insights. The clock comes
// exclusively from input.now; nothing here touches the network or the
// database. Compliance failures are dropped with reasons, never displayed
// and never silently rewritten.

import { templateComposer } from './compose';
import { lintInsightCopy } from './compliance';
import { detectConsistencyStreak } from './detectors/consistency-streak';
import { detectHydrationCorrelation } from './detectors/hydration-correlation';
import { detectMacroGap } from './detectors/macro-gap';
import { detectMealTimingPattern } from './detectors/meal-timing-pattern';
import { detectMicronutrientGap } from './detectors/micronutrient-gap';
import { detectQualityTrend } from './detectors/quality-trend';
import { detectScoreMover } from './detectors/score-mover';
import { detectSupplementMealAlignment } from './detectors/supplement-meal-alignment';
import { selectInsights } from './rank';
import { addHoursIso } from './time';
import type {
  ComposedCopy,
  DetectorInput,
  DroppedInsight,
  InsightComposer,
  InsightFact,
  PersistableInsight,
} from './types';

// Expiry per spec: daily insights live 36 hours, weekly 192 hours, both
// from the injected now. The unused 'meal' horizon would expire as daily.
const DAILY_EXPIRY_HOURS = 36;
const WEEKLY_EXPIRY_HOURS = 192;

export interface InsightEngineResult {
  insights: PersistableInsight[];
  dropped: DroppedInsight[];
}

function detectAll(input: DetectorInput): InsightFact[] {
  const facts: InsightFact[] = [
    ...detectMacroGap(input),
    ...detectMicronutrientGap(input),
    ...detectMealTimingPattern(input),
    ...detectHydrationCorrelation(input),
    ...detectSupplementMealAlignment(input),
    ...detectQualityTrend(input),
    ...detectConsistencyStreak(input),
  ];
  return [...facts, ...detectScoreMover(input, facts)];
}

async function composeWithFallback(
  fact: InsightFact,
  composer: InsightComposer,
): Promise<ComposedCopy> {
  let copy: ComposedCopy | null = null;
  try {
    copy = await composer.compose(fact);
  } catch {
    copy = null;
  }
  if (copy) return copy;
  // The template composer is total: it always returns copy.
  return (await templateComposer.compose(fact)) as ComposedCopy;
}

export async function runInsightEngine(
  input: DetectorInput,
  composer: InsightComposer,
): Promise<InsightEngineResult> {
  const selected = selectInsights(detectAll(input), input);

  const insights: PersistableInsight[] = [];
  const dropped: DroppedInsight[] = [];

  for (const fact of selected) {
    const copy = await composeWithFallback(fact, composer);
    const lint = lintInsightCopy(copy.title, copy.body, fact);
    if (!lint.ok) {
      dropped.push({ fact, title: copy.title, body: copy.body, reasons: lint.failures });
      continue;
    }
    const expiryHours = fact.horizon === 'weekly' ? WEEKLY_EXPIRY_HOURS : DAILY_EXPIRY_HOURS;
    insights.push({
      insight_type: fact.type,
      horizon: fact.horizon,
      title: copy.title,
      body: copy.body,
      severity: fact.severity,
      confidence: fact.confidence,
      data_snapshot: { ...fact.snapshot, factFingerprint: fact.factFingerprint },
      product_suggestion: fact.productSuggestion ?? null,
      expires_at: addHoursIso(input.now, expiryHours),
      compliance_passed: true,
    });
  }

  return { insights, dropped };
}
