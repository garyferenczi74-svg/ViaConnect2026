/**
 * src/lib/formavision/noise/noiseDeltaClassifier.ts
 *
 * Prompt 211b Workstream 2 -- classify composition deltas through the MDC engine.
 *
 * This is the bridge between the delta layer (compositionDeltas.ts) and the MDC
 * engine (mdcEngine.ts). It takes the CompositionDeltasResult produced by
 * computeCompositionDeltas and classifies each delta as MEANINGFUL or WITHIN_NOISE,
 * using error bands sourced from accuracyTargets.ts (RegionToleranceCm and
 * PER_MEASUREMENT_PCT).
 *
 * IMPORTANT invariants:
 *   - The underlying numbers are NEVER changed. This is a PRESENTATION layer only.
 *   - WITHIN_NOISE is never hidden, never a failure state.
 *   - null classification = UNKNOWN band (honest unknown, not within-noise).
 *   - No fabricated error bands. All bands come from accuracyTargets.ts.
 *   - No em dashes, no en dashes, no emojis, zero any.
 *
 * MeasurementKey -> GirthRegion mapping:
 *   The 13 circumference keys map to the 8 GirthRegion tolerances in
 *   accuracyTargets.ts (limb = 2 cm, torso = 3 cm). Keys that do not map
 *   to a girth region (shoulderWidth is skeletal breadth, not a girth) get
 *   null (UNKNOWN classification, never a fabricated band).
 */

import {
  computeMDC95,
  classifyGirthDelta,
  classifyBodyFatDelta,
  type NoiseClassification,
} from './mdcEngine';
import {
  RegionToleranceCm,
  PER_MEASUREMENT_PCT,
  type GirthRegion,
} from '@/lib/arnold/scanning/accuracy/accuracyTargets';
import type { MeasurementKey } from '@/lib/body-tracker/circumference';
import type {
  CompositionDeltasResult,
  CircumferenceDelta,
  MetricDelta,
} from '@/lib/formavision/deltas/compositionDeltas';

// ---------------------------------------------------------------------------
// MeasurementKey -> GirthRegion tolerance mapping
// ---------------------------------------------------------------------------

/**
 * Maps each circumference MeasurementKey to a GirthRegion whose tolerance is
 * used for MDC95 classification.
 *
 * Bilateral pairs (leftBicep / rightBicep etc.) map to the same GirthRegion
 * since the tolerance is the same for both sides.
 *
 * shoulderWidth is NOT a girth measurement -- it is skeletal breadth -- so it
 * has no GirthRegion. Its classification is always null (UNKNOWN, honest).
 *
 * hip is sourced from body_tracker_weight.hips_in but is still a girth region
 * for tolerance purposes.
 */
const MEASUREMENT_KEY_TO_GIRTH_REGION: Readonly<Partial<Record<MeasurementKey, GirthRegion>>> =
  Object.freeze({
    neck: 'neck',
    rightBicep: 'upperArm',
    leftBicep: 'upperArm',
    rightForearm: 'forearm',
    leftForearm: 'forearm',
    chest: 'chest',
    waist: 'waist',
    hip: 'hip',
    rightQuadriceps: 'upperLeg',
    leftQuadriceps: 'upperLeg',
    rightCalf: 'lowerLeg',
    leftCalf: 'lowerLeg',
    // shoulderWidth: intentionally absent -> null -> UNKNOWN classification
  });

// ---------------------------------------------------------------------------
// Classification result types
// ---------------------------------------------------------------------------

/** Classification of a single body-fat delta. */
export interface BodyFatNoiseResult {
  /** The original delta being classified. */
  delta: MetricDelta;
  /** MEANINGFUL | WITHIN_NOISE | null (UNKNOWN -- band insufficient or delta unknown). */
  classification: NoiseClassification | null;
  /** The MDC95 threshold used (informational, not displayed as an accuracy claim). */
  mdc95: number | null;
}

/** Classification of a single circumference delta. */
export interface CircumferenceNoiseResult {
  /** The original circumference delta being classified. */
  delta: CircumferenceDelta;
  /** MEANINGFUL | WITHIN_NOISE | null (UNKNOWN -- band absent for this key). */
  classification: NoiseClassification | null;
  /** The MDC95 threshold used, in the same unit as the delta. */
  mdc95: number | null;
}

/** The full noise classification of a CompositionDeltasResult. */
export interface CompositionNoiseClassification {
  bodyFat: BodyFatNoiseResult | null;
  circumferences: CircumferenceNoiseResult[];
  /** Count of WITHIN_NOISE classifications across body fat + circumferences. */
  withinNoiseCount: number;
  /** Count of MEANINGFUL classifications across body fat + circumferences. */
  meaningfulCount: number;
  /** Total classified (excludes null / UNKNOWN). */
  totalClassified: number;
}

// ---------------------------------------------------------------------------
// Classification logic
// ---------------------------------------------------------------------------

/**
 * Classifies a body-fat MetricDelta through the MDC engine, using the
 * PER_MEASUREMENT_PCT tolerance fraction and the from-value as the reference.
 *
 * Returns null when the delta itself is null (single-scan / UNKNOWN).
 */
export function classifyBodyFatMetricDelta(
  delta: MetricDelta | null,
): BodyFatNoiseResult | null {
  if (delta === null) return null;

  // Use the 'from' value as the reference for the pct-of-truth band.
  // If 'from' or 'to' is 0 or negative, either the band cannot be computed
  // (from) or 0 is the honest "not measured" sentinel (to) -- either way the
  // classification would be fabricated, so both sides are guarded (UNKNOWN).
  if (delta.from <= 0 || delta.to <= 0) {
    return { delta, classification: null, mdc95: null };
  }

  const mdc95 = computeMDC95({
    tolerancePct: PER_MEASUREMENT_PCT,
    referenceValue: delta.from,
  });

  const classification = classifyBodyFatDelta(delta.delta, delta.from, PER_MEASUREMENT_PCT);

  return { delta, classification, mdc95 };
}

/**
 * Classifies a CircumferenceDelta through the MDC engine.
 *
 * Converts the delta to cm when the unit is inches (the tolerance band is
 * always in cm per accuracyTargets.ts). The MDC95 is then converted back to
 * the display unit so the caller can render it alongside the measurement.
 *
 * Returns classification: null when the MeasurementKey has no GirthRegion
 * mapping (e.g. shoulderWidth).
 */
export function classifyCircumferenceDelta(
  delta: CircumferenceDelta,
): CircumferenceNoiseResult {
  const region = MEASUREMENT_KEY_TO_GIRTH_REGION[delta.key];
  if (region === undefined) {
    // No GirthRegion for this key (e.g. shoulderWidth). Honest UNKNOWN.
    return { delta, classification: null, mdc95: null };
  }

  const toleranceCm = RegionToleranceCm[region];

  // The delta may be in inches. Convert to cm for classification.
  const deltaCm = delta.unit === 'in' ? delta.delta * 2.54 : delta.delta;
  const classification = classifyGirthDelta(deltaCm, toleranceCm);

  // Compute the MDC95 and convert back to the display unit.
  const mdc95Cm = computeMDC95({ toleranceCm });
  const mdc95 =
    mdc95Cm !== null ? (delta.unit === 'in' ? mdc95Cm / 2.54 : mdc95Cm) : null;

  return { delta, classification, mdc95 };
}

/**
 * Classifies all deltas in a CompositionDeltasResult through the MDC engine.
 *
 * This is the primary entry point for the presentation layer. Pass the result
 * of computeCompositionDeltas and get back classifications for every delta.
 *
 * The underlying numbers in deltas are NEVER changed. The classification is a
 * parallel overlay only.
 */
export function classifyCompositionDeltas(
  deltas: CompositionDeltasResult,
): CompositionNoiseClassification {
  const bodyFat = classifyBodyFatMetricDelta(deltas.bodyFat);

  const circumferences: CircumferenceNoiseResult[] = deltas.circumferences.map(
    classifyCircumferenceDelta,
  );

  // Tally for telemetry: only count where classification is known.
  let withinNoiseCount = 0;
  let meaningfulCount = 0;

  if (bodyFat !== null) {
    if (bodyFat.classification === 'WITHIN_NOISE') withinNoiseCount++;
    else if (bodyFat.classification === 'MEANINGFUL') meaningfulCount++;
  }
  for (const c of circumferences) {
    if (c.classification === 'WITHIN_NOISE') withinNoiseCount++;
    else if (c.classification === 'MEANINGFUL') meaningfulCount++;
  }

  const totalClassified = withinNoiseCount + meaningfulCount;

  return { bodyFat, circumferences, withinNoiseCount, meaningfulCount, totalClassified };
}

// ---------------------------------------------------------------------------
// Plateau detection for trend intelligence
// ---------------------------------------------------------------------------

/**
 * A "plateau" is a run of consecutive WITHIN_NOISE deltas in a trend. It is
 * detected when N consecutive scan-over-scan deltas are all WITHIN_NOISE.
 *
 * Context: for trend views that show sequential scan-to-scan deltas (not just
 * first-to-latest), a plateau appears when several sequential changes are all
 * below the MDC threshold. This is NOT bad progress -- it means the metric is
 * genuinely stable at the scan's precision level.
 */
export interface PlateauDetectionResult {
  /** Whether the most recent N deltas are all WITHIN_NOISE. */
  isOnPlateau: boolean;
  /** How many consecutive WITHIN_NOISE deltas formed this plateau. */
  runLength: number;
  /** Kind, honest copy for the plateau state (Hannah tone, no dashes). */
  plateauCopy: string;
}

/** Minimum consecutive WITHIN_NOISE classifications to declare a plateau. */
export const PLATEAU_MIN_RUN = 2;

/**
 * Detects an honest plateau from a sequence of noise classifications.
 *
 * @param classifications A sequence of WITHIN_NOISE | MEANINGFUL | null values,
 *   NEWEST FIRST (most recent at index 0). null entries (UNKNOWN) are skipped.
 * @param metricLabel The metric label for the plateau copy (e.g. "waist").
 * @returns PlateauDetectionResult or null when history is too short.
 */
export function detectPlateau(
  classifications: Array<NoiseClassification | null>,
  metricLabel: string,
): PlateauDetectionResult | null {
  // Filter out UNKNOWN entries to get known classifications, newest first.
  const known = classifications.filter(
    (c): c is NoiseClassification => c !== null,
  );
  if (known.length < PLATEAU_MIN_RUN) return null;

  // Count the run of WITHIN_NOISE from the front (most recent).
  let run = 0;
  for (const c of known) {
    if (c === 'WITHIN_NOISE') {
      run++;
    } else {
      break;
    }
  }

  const isOnPlateau = run >= PLATEAU_MIN_RUN;

  const plateauCopy = isOnPlateau
    ? `Your ${metricLabel} has been stable across your last ${run} scans, within the scan's measurement precision. Staying the course is real progress.`
    : `Your ${metricLabel} has shown meaningful change recently.`;

  return { isOnPlateau, runLength: run, plateauCopy };
}

// ---------------------------------------------------------------------------
// Spike detection: a single-scan change inconsistent with the fingerprint
// ---------------------------------------------------------------------------

/**
 * A single-scan spike is a MEANINGFUL delta on a single scan whose fingerprint
 * is a known outlier (low consistency score from scoreConditionFingerprint).
 *
 * When an outlier fingerprint accompanies a MEANINGFUL classification, the
 * trend display should note the scan conditions without hiding the data point.
 *
 * The data point is ALWAYS shown. Only the copy context changes.
 */
export interface SpikeContext {
  /** Whether this delta is a candidate spike (meaningful + outlier conditions). */
  isSuspectedSpike: boolean;
  /** Honest, kind copy for the spike context (Hannah tone, no dashes). */
  spikeCopy: string;
}

/**
 * Determines the spike context for a single classified delta.
 *
 * @param classification The noise classification of this delta.
 * @param fingerprintIsOutlier Whether the scan's condition fingerprint is an outlier.
 * @param metricLabel The metric label (e.g. "waist").
 * @returns SpikeContext. The data point is never hidden regardless of the result.
 */
export function getSpikeContext(
  classification: NoiseClassification | null,
  fingerprintIsOutlier: boolean,
  metricLabel: string,
): SpikeContext {
  const isSuspectedSpike =
    classification === 'MEANINGFUL' && fingerprintIsOutlier;

  const spikeCopy = isSuspectedSpike
    ? `This ${metricLabel} change is meaningful in magnitude, but this scan was taken in conditions different from your usual setup. It is still shown as a real data point. Your next scan in your normal conditions will tell us more.`
    : '';

  return { isSuspectedSpike, spikeCopy };
}
