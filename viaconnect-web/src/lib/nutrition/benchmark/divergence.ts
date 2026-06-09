/**
 * Prompt 184 Phase 0: pure divergence math and stage attribution.
 *
 * Given a basket item and the MealTrace one engine produced for it, compute the
 * signed percent error per metric against the consensus target, a best guess at
 * which pipeline stage owns the dominant error, and the agreement between the
 * two engines on dual-logged items. Everything here is pure and deterministic
 * so the report numbers are reproducible and unit tested; the runnable harness
 * wires this to the live engines.
 *
 * Attribution is a transparent heuristic, not ground truth. The report always
 * carries the raw signed errors alongside it so a human can override the call.
 */

import {
  NUTRIENT_KEYS,
  type ItemTotals,
  type MealTrace,
  type NutrientKey,
} from './tracePipeline';
import type { BenchmarkItem } from './basket';

export type DominantStage =
  | 'quantity'
  | 'raw_vs_cooked'
  | 'reference'
  | 'null_handling'
  | 'within_tolerance'
  | 'no_reference';

export interface MetricError {
  metric: NutrientKey;
  engineValue: number | null;
  targetValue: number | null;
  signedPct: number | null;
}

export interface ItemDivergence {
  id: string;
  engine: 'text' | 'photo';
  category: string;
  identifiedLabel: string;
  estimatedGrams: number | null;
  targetGrams: number;
  gramsSignedPct: number | null;
  caloriesSignedPct: number | null;
  metrics: MetricError[];
  dominantStage: DominantStage;
  note: string;
}

export interface MetricAggregate {
  metric: NutrientKey;
  mapePct: number | null;
  meanSignedPct: number | null;
  n: number;
}

export interface EngineAggregate {
  engine: 'text' | 'photo';
  metrics: MetricAggregate[];
  itemsOverTolerance: { id: string; caloriesSignedPct: number }[];
}

export interface DualAgreement {
  id: string;
  caloriesPhotoVsTextPct: number | null;
  agreesWithin3Pct: boolean | null;
}

const TOLERANCE_PCT = 5;
const QUANTITY_DOMINANT_PCT = 10;
const DUAL_AGREEMENT_PCT = 3;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function signedPct(
  engineValue: number | null,
  targetValue: number | null
): number | null {
  if (engineValue === null || targetValue === null) return null;
  // A zero target has no ratio; treat an exact zero match as 0 error, else
  // leave it null so it does not poison the averages.
  if (targetValue === 0) return engineValue === 0 ? 0 : null;
  return ((engineValue - targetValue) / targetValue) * 100;
}

function sumGrams(trace: MealTrace): number | null {
  let seen = false;
  let total = 0;
  for (const item of trace.items) {
    if (item.estimatedGrams !== null) {
      seen = true;
      total += item.estimatedGrams;
    }
  }
  return seen ? Math.round(total * 10) / 10 : null;
}

export function computeItemDivergence(
  item: BenchmarkItem,
  trace: MealTrace
): ItemDivergence {
  const target = item.consensus_target;
  const totals: ItemTotals = trace.mealTotals;

  const metrics: MetricError[] = NUTRIENT_KEYS.map((metric) => {
    const engineValue = totals[metric];
    const targetValue = target.values[metric];
    const pct = signedPct(engineValue, targetValue);
    return {
      metric,
      engineValue,
      targetValue,
      signedPct: pct === null ? null : round2(pct),
    };
  });

  const engineGrams = sumGrams(trace);
  const gramsPct = signedPct(engineGrams, target.portion_g);
  const caloriesMetric = metrics.find((m) => m.metric === 'calories_kcal');
  const caloriesPct = caloriesMetric ? caloriesMetric.signedPct : null;

  const { stage, note } = attributeStage(item, trace, gramsPct, metrics);

  return {
    id: item.id,
    engine: trace.engine,
    category: item.category,
    identifiedLabel: trace.items[0]?.identifiedLabel ?? item.id,
    estimatedGrams: engineGrams,
    targetGrams: target.portion_g,
    gramsSignedPct: gramsPct === null ? null : round2(gramsPct),
    caloriesSignedPct: caloriesPct,
    metrics,
    dominantStage: stage,
    note,
  };
}

function attributeStage(
  item: BenchmarkItem,
  trace: MealTrace,
  gramsPct: number | null,
  metrics: MetricError[]
): { stage: DominantStage; note: string } {
  const calories = metrics.find((m) => m.metric === 'calories_kcal');
  const caloriesPct = calories?.signedPct ?? null;

  const anyReference = trace.items.some(
    (it) =>
      it.referenceSource !== null &&
      it.referenceSource !== 'usda_miss' &&
      it.referenceSource !== 'resolve_miss'
  );
  if (!anyReference) {
    return { stage: 'no_reference', note: 'engine matched no reference for this item' };
  }

  // A nutrient the consensus has but the engine returned null (most often
  // sodium on the text engine) is a NULL-handling gap, not a numeric error.
  const nullGap = metrics.find(
    (m) => m.targetValue !== null && m.engineValue === null
  );
  if (nullGap && (caloriesPct === null || Math.abs(caloriesPct) <= TOLERANCE_PCT)) {
    return {
      stage: 'null_handling',
      note: `${nullGap.metric} present in consensus but not produced by the engine`,
    };
  }

  if (caloriesPct !== null && Math.abs(caloriesPct) <= TOLERANCE_PCT) {
    return { stage: 'within_tolerance', note: 'calories within 5 percent of consensus' };
  }

  if (gramsPct !== null && Math.abs(gramsPct) >= QUANTITY_DOMINANT_PCT) {
    return { stage: 'quantity', note: `grams off by ${round2(gramsPct)} percent` };
  }

  // Grams roughly right but energy off on a cooked-basis item is the signature
  // of a raw reference scored against a cooked portion (the leading hypothesis).
  if (item.consensus_target.basis === 'cooked') {
    return {
      stage: 'raw_vs_cooked',
      note: 'grams roughly correct but energy off on a cooked-basis item; likely a raw reference applied to a cooked portion',
    };
  }

  return {
    stage: 'reference',
    note: 'grams roughly correct; per-100g reference values diverge from consensus',
  };
}

export function aggregateDivergence(items: ItemDivergence[]): EngineAggregate[] {
  const engines: ('text' | 'photo')[] = ['text', 'photo'];
  const out: EngineAggregate[] = [];

  for (const engine of engines) {
    const forEngine = items.filter((i) => i.engine === engine);
    if (forEngine.length === 0) continue;

    const metrics: MetricAggregate[] = NUTRIENT_KEYS.map((metric) => {
      const pcts: number[] = [];
      for (const item of forEngine) {
        const me = item.metrics.find((m) => m.metric === metric);
        if (me && me.signedPct !== null) pcts.push(me.signedPct);
      }
      if (pcts.length === 0) {
        return { metric, mapePct: null, meanSignedPct: null, n: 0 };
      }
      const mape = pcts.reduce((s, p) => s + Math.abs(p), 0) / pcts.length;
      const mean = pcts.reduce((s, p) => s + p, 0) / pcts.length;
      return { metric, mapePct: round2(mape), meanSignedPct: round2(mean), n: pcts.length };
    });

    const itemsOverTolerance = forEngine
      .filter((i) => i.caloriesSignedPct !== null && Math.abs(i.caloriesSignedPct) > TOLERANCE_PCT)
      .map((i) => ({ id: i.id, caloriesSignedPct: i.caloriesSignedPct as number }))
      .sort((a, b) => Math.abs(b.caloriesSignedPct) - Math.abs(a.caloriesSignedPct));

    out.push({ engine, metrics, itemsOverTolerance });
  }

  return out;
}

export function dualAgreement(
  id: string,
  textTotals: ItemTotals,
  photoTotals: ItemTotals
): DualAgreement {
  const pct = signedPct(photoTotals.calories_kcal, textTotals.calories_kcal);
  return {
    id,
    caloriesPhotoVsTextPct: pct === null ? null : round2(pct),
    agreesWithin3Pct: pct === null ? null : Math.abs(pct) <= DUAL_AGREEMENT_PCT,
  };
}
