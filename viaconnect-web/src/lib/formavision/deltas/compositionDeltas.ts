// Prompt 210b P3-delta: pure latest-vs-first deltas for FormaVision Section 8
// (the body-fat readout delta + the Notable Changes summary) and the
// measurement ring's "change since first scan".
//
// PURE + deterministic. No React, no IO. This consumes the SHAPES the two
// history hooks already return (CompositionSnapshot from useCompositionHistory,
// CircumferenceMeasurements from useCircumferenceHistory) and computes no new
// data source. It does NOT recompute composition and does NOT redefine those
// types.
//
// Single source of truth for sign meaning + epsilon: the raw-sign classifier
// getChangeDirection and the shared CHANGE_THRESHOLD from heatmap-colors are
// reused so this delta lib stays consistent with the avatar indicators and the
// callout cards. The fat/muscle inversion (fat down = good, muscle up = good)
// is the documented heatmap-colors convention; girth is treated like fat
// (a reduction is progress).
//
// Direction semantics exposed to the UI so it never re-derives sign meaning:
//   improved   - the metric moved in the healthy direction
//                (fat down, girth down, muscle/lean up)
//   worsened   - the metric moved the unhealthy way
//   unchanged  - magnitude below the metric epsilon, or exactly equal
// UNKNOWN (null) on either side -> no delta for that metric (null/omitted),
// never 0, never fabricated.
//
// Epsilon: fat and muscle/lean reuse CHANGE_THRESHOLD (0.2, in percentage
// points / lbs). Circumference uses CIRCUMFERENCE_EPSILON below, a small
// unit-aware girth threshold, because the 0.2 fat-percent threshold is not the
// right scale for inches/cm girth.

import {
  CHANGE_THRESHOLD,
  getChangeDirection,
  type ChangeDirection,
} from '@/lib/body-tracker/heatmap-colors';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import {
  MEASUREMENT_KEYS,
  MEASUREMENT_LABELS,
  type CircumferenceMeasurements,
  type MeasurementKey,
  type MeasurementUnit,
} from '@/lib/body-tracker/circumference';

// improved | worsened | unchanged for the four real progress families
// (bodyFat, girth, muscle, lean). 'neutral' is reserved for informational
// metrics where neither direction is "progress" (e.g. shoulder width, which is
// skeletal/deltoid breadth, not abdominal girth, so losing it is NOT progress).
// Backward-compatible: fat/girth/muscle/lean still only ever emit
// improved/worsened/unchanged; only neutral-polarity metrics emit 'neutral'.
export type DeltaDirection = 'improved' | 'worsened' | 'unchanged' | 'neutral';

// For a "lower is better" metric (fat, girth): a loss is improved, a gain is
// worsened. For a "higher is better" metric (muscle, lean): inverted. For a
// "neutral" metric: the delta is reported but never framed as progress (the
// direction is 'neutral' for any non-trivial change, 'unchanged' below epsilon).
type Polarity = 'lower_is_better' | 'higher_is_better' | 'neutral';

export interface MetricDelta {
  from: number;
  to: number;
  delta: number; // to - from (signed, raw)
  direction: DeltaDirection;
}

export interface CircumferenceDelta extends MetricDelta {
  key: MeasurementKey;
  label: string;
  unit: MeasurementUnit;
}

export interface MuscleDelta extends MetricDelta {
  key: string; // region key or a total label
  label: string;
}

export type BiggestChange =
  | { kind: 'bodyFat'; magnitude: number; detail: MetricDelta }
  | { kind: 'circumference'; magnitude: number; detail: CircumferenceDelta }
  | { kind: 'muscle'; magnitude: number; detail: MuscleDelta };

export interface CompositionDeltasResult {
  bodyFat: MetricDelta | null;
  circumferences: CircumferenceDelta[];
  muscle: MuscleDelta[];
  biggest: BiggestChange | null;
}

export interface ComputeCompositionDeltasInput {
  firstComposition: CompositionSnapshot | null;
  latestComposition: CompositionSnapshot | null;
  firstCircumferences: CircumferenceMeasurements | null;
  latestCircumferences: CircumferenceMeasurements | null;
  unit: MeasurementUnit;
}

// Small girth epsilon. 0.2 in / 0.2 cm both round out logging noise without
// hiding a real change. Documented per-metric epsilon (see header).
// NOTE: CIRCUMFERENCE_EPSILON and CHANGE_THRESHOLD are intentionally INDEPENDENT
// constants. Fat and muscle follow CHANGE_THRESHOLD; girth follows this one. If
// CHANGE_THRESHOLD ever changes, girth does NOT move with it (different scale:
// percentage points / lbs vs inches / cm). Keep them separate on purpose.
export const CIRCUMFERENCE_EPSILON = 0.2;

// Most circumference regions are "lower is better" girth (waist/hip/arm/leg/
// chest/neck reduction = progress). shoulderWidth is the exception: it is
// skeletal/deltoid breadth, not abdominal girth, so a reduction is NOT progress.
// It gets an explicit neutral override so it can never ride the girth default
// and emit a false 'improved' on a shoulder-width loss (honest-scan invariant).
const GIRTH_POLARITY: Polarity = 'lower_is_better';

const CIRCUMFERENCE_POLARITY_OVERRIDE: Partial<Record<MeasurementKey, Polarity>> = {
  shoulderWidth: 'neutral',
};

function isKnown(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// Map a raw signed change + polarity to the semantic direction, reusing the
// shared epsilon-aware sign classifier so "unchanged" stays consistent with the
// avatar/callout neutral band.
function directionFor(
  rawDelta: number,
  polarity: Polarity,
  epsilon: number,
): DeltaDirection {
  // getChangeDirection uses CHANGE_THRESHOLD internally; for metrics that need a
  // different epsilon we apply the threshold here and only borrow its sign rule.
  if (Math.abs(rawDelta) < epsilon) return 'unchanged';
  // Neutral metrics report the change without any progress framing.
  if (polarity === 'neutral') return 'neutral';
  const raw: ChangeDirection = rawDelta > 0 ? 'gain' : 'loss';
  if (polarity === 'lower_is_better') {
    return raw === 'loss' ? 'improved' : 'worsened';
  }
  return raw === 'gain' ? 'improved' : 'worsened';
}

// Body fat + muscle reuse the shared CHANGE_THRESHOLD epsilon. We still route
// through getChangeDirection for the neutral band so this stays locked to the
// heatmap-colors source of truth, then apply polarity.
function directionForSharedEpsilon(
  rawDelta: number,
  polarity: Polarity,
): DeltaDirection {
  const raw = getChangeDirection(rawDelta); // gain | loss | neutral (epsilon = CHANGE_THRESHOLD)
  if (raw === 'neutral') return 'unchanged';
  if (polarity === 'lower_is_better') {
    return raw === 'loss' ? 'improved' : 'worsened';
  }
  return raw === 'gain' ? 'improved' : 'worsened';
}

function buildMetricDelta(
  from: number | null | undefined,
  to: number | null | undefined,
  polarity: Polarity,
): MetricDelta | null {
  if (!isKnown(from) || !isKnown(to)) return null;
  const delta = to - from;
  return {
    from,
    to,
    delta,
    direction: directionForSharedEpsilon(delta, polarity),
  };
}

/**
 * Pure latest-vs-first deltas for Section 8 / Notable Changes.
 *
 * Numbers never lie: deltas are computed strictly from the supplied first and
 * latest values. Intermediate/interpolated states are not inputs. Any metric
 * UNKNOWN on either side is omitted (null), never coerced to a 0 delta.
 */
export function computeCompositionDeltas(
  input: ComputeCompositionDeltasInput,
): CompositionDeltasResult {
  const {
    firstComposition,
    latestComposition,
    firstCircumferences,
    latestCircumferences,
    unit,
  } = input;

  // 1. Body fat: lower is better.
  const bodyFat = buildMetricDelta(
    firstComposition?.totalBodyFatPct ?? null,
    latestComposition?.totalBodyFatPct ?? null,
    'lower_is_better',
  );

  // 2. Circumferences: per region where BOTH sides known, ordered by |delta|.
  const circumferences: CircumferenceDelta[] = [];
  if (firstCircumferences && latestCircumferences) {
    for (const key of MEASUREMENT_KEYS) {
      const from = firstCircumferences[key];
      const to = latestCircumferences[key];
      if (!isKnown(from) || !isKnown(to)) continue; // UNKNOWN side: skip, never fabricate
      const delta = to - from;
      const polarity = CIRCUMFERENCE_POLARITY_OVERRIDE[key] ?? GIRTH_POLARITY;
      circumferences.push({
        key,
        label: MEASUREMENT_LABELS[key],
        from,
        to,
        delta,
        direction: directionFor(delta, polarity, CIRCUMFERENCE_EPSILON),
        unit,
      });
    }
    // Order by magnitude desc; tie-break by key for determinism.
    circumferences.sort((a, b) => {
      const diff = Math.abs(b.delta) - Math.abs(a.delta);
      if (diff !== 0) return diff;
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    });
  }

  // 3. Muscle / lean: higher is better. Total muscle + skeletal + per region.
  const muscle: MuscleDelta[] = [];
  const addMuscle = (key: string, label: string, from: number | null, to: number | null) => {
    if (!isKnown(from) || !isKnown(to)) return;
    const delta = to - from;
    muscle.push({
      key,
      label,
      from,
      to,
      delta,
      direction: directionForSharedEpsilon(delta, 'higher_is_better'),
    });
  };
  addMuscle(
    'totalMuscleMassLbs',
    'Total Muscle Mass',
    firstComposition?.totalMuscleMassLbs ?? null,
    latestComposition?.totalMuscleMassLbs ?? null,
  );
  addMuscle(
    'skeletalMuscleMassLbs',
    'Skeletal Muscle Mass',
    firstComposition?.skeletalMuscleMassLbs ?? null,
    latestComposition?.skeletalMuscleMassLbs ?? null,
  );
  const REGION_LABEL: Record<keyof CompositionSnapshot['regionMuscleLbs'], string> = {
    right_arm: 'Right Arm Muscle',
    left_arm: 'Left Arm Muscle',
    trunk: 'Trunk Muscle',
    right_leg: 'Right Leg Muscle',
    left_leg: 'Left Leg Muscle',
  };
  const firstMuscleRegions = firstComposition?.regionMuscleLbs ?? null;
  const latestMuscleRegions = latestComposition?.regionMuscleLbs ?? null;
  if (firstMuscleRegions && latestMuscleRegions) {
    (Object.keys(REGION_LABEL) as Array<keyof typeof REGION_LABEL>).forEach((region) => {
      addMuscle(
        `regionMuscleLbs.${region}`,
        REGION_LABEL[region],
        firstMuscleRegions[region],
        latestMuscleRegions[region],
      );
    });
  }
  muscle.sort((a, b) => {
    const diff = Math.abs(b.delta) - Math.abs(a.delta);
    if (diff !== 0) return diff;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  // 4. Biggest change for the headline: largest |delta| across all three kinds.
  // Body fat and circumference are different units; magnitude is compared on the
  // raw |delta| of each, with a documented precedence on exact ties:
  // bodyFat > circumference > muscle (the fat readout is the Section 8 hero).
  const candidates: BiggestChange[] = [];
  if (bodyFat) {
    candidates.push({ kind: 'bodyFat', magnitude: Math.abs(bodyFat.delta), detail: bodyFat });
  }
  if (circumferences.length > 0) {
    const top = circumferences[0];
    candidates.push({ kind: 'circumference', magnitude: Math.abs(top.delta), detail: top });
  }
  if (muscle.length > 0) {
    const top = muscle[0];
    candidates.push({ kind: 'muscle', magnitude: Math.abs(top.delta), detail: top });
  }

  const KIND_RANK: Record<BiggestChange['kind'], number> = {
    bodyFat: 0,
    circumference: 1,
    muscle: 2,
  };
  let biggest: BiggestChange | null = null;
  for (const c of candidates) {
    if (
      biggest === null ||
      c.magnitude > biggest.magnitude ||
      (c.magnitude === biggest.magnitude && KIND_RANK[c.kind] < KIND_RANK[biggest.kind])
    ) {
      biggest = c;
    }
  }

  return { bodyFat, circumferences, muscle, biggest };
}
