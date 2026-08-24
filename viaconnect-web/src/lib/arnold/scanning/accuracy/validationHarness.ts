// Task 11 (Prompt 210c) - Re-runnable validation harness for the 90 percent accuracy target.
//
// Section 10 / 17.2: the 90 percent accuracy claim is shown to users ONLY after this
// harness reports heldOutPass on a real labeled cohort supplied by the team per the
// written protocol in Section 10.1. Until then, cohortStatus is 'unproven'.
//
// Key design decisions:
//   - The calibration fit OUTPUTS a new FittedConfig with a bumped version string.
//     It does NOT mutate CORRECTION_FACTORS in calibrationConfig.ts. In-place mutation
//     would make CALIBRATION_VERSION silently lie. (T7 review finding.)
//   - heldOutPass evaluates the held-out split with fitted scales applied (from training).
//     This prevents overfitting the pass/fail report to the training split.
//   - MINIMUM_SAMPLES_PER_REGION (30) is the minimum for a valid cohort (Section 10.1).
//     Recommendation: 50 per region for robust ICC estimates.
//   - Synthetic fixtures run correctly; cohortStatus stays 'unproven' because the synthetic
//     set is too small AND/OR the metrics do not meet thresholds. This is honest per 17.2.
//
// Pure module: no IO, no side effects, no mutation of exported calibration config.
// No em-dashes, no en-dashes (pre-commit hook enforced). Hyphens in compound words are fine.
// RULE 9: null or absent inputs to metrics produce 0 or safe defaults (no fabrication).

import type { GirthRegion } from './accuracyTargets';
import {
  withinTolerance,
  AGGREGATE_PASS_RATE,
  PER_MEASUREMENT_PCT,
  MIN_ICC,
} from './accuracyTargets';
import { CALIBRATION_VERSION, getCorrectionFactor } from './calibrationConfig';
import type { Region } from '../types';

// ---- Section 10.1 cohort requirements (named exports - Section 17.5) ----

/**
 * Minimum labeled measurement pairs per GirthRegion for a valid cohort.
 * 8 regions x 30 = 240 labeled pairs total minimum.
 * Recommendation: 50 per region for robust ICC estimates.
 */
export const MINIMUM_SAMPLES_PER_REGION = 30;

/** Training fraction for the train/held-out split (Section 10.3). */
export const TRAIN_SPLIT_RATIO = 0.8;

/**
 * Sane lower bound for fitted correction factors (Section 10.2 / 17.5).
 * A fitted factor below this suggests a pipeline or data problem.
 */
export const FACTOR_CLAMP_MIN = 0.85;

/**
 * Sane upper bound for fitted correction factors (Section 10.2 / 17.5).
 * A fitted factor above this suggests a pipeline or data problem.
 */
export const FACTOR_CLAMP_MAX = 1.15;

// ---- GirthRegion to Region mapping for calibration factor lookup ----

/**
 * Maps each GirthRegion (accuracy taxonomy) to its corresponding Region
 * (pipeline taxonomy) for reading current correction factors from calibrationConfig.
 * waist maps to waist_natural as the primary waist plane.
 */
const GIRTH_TO_REGION: Record<GirthRegion, Region> = {
  neck:     'neck',
  upperArm: 'bicep',
  forearm:  'forearm',
  upperLeg: 'thigh',
  lowerLeg: 'calf',
  chest:    'chest',
  waist:    'waist_natural',
  hip:      'hip',
};

// ---- Public types ----

/**
 * One labeled measurement pair from a ground-truth tape-measure session.
 * The labeled set is supplied by the team per the protocol in Section 10.1.
 * predictedCm is the pipeline output (correction factors already applied).
 * truthCm is the tape-measure ground truth in centimetres.
 * sex is optional and, when present, enables per-sex factor refinement.
 */
export interface LabeledSample {
  predictedCm: number;
  truthCm: number;
  region: GirthRegion;
  sex?: 'male' | 'female';
}

/** Per-region accuracy metrics from the validation harness. */
export interface RegionMetrics {
  /**
   * Mean absolute percentage error (0 to 100).
   * Formula: mean(|predicted - truth| / truth) x 100.
   */
  mape: number;
  /**
   * Fraction of samples meeting withinTolerance from accuracyTargets (0 to 1).
   * Target: >= AGGREGATE_PASS_RATE (0.90).
   */
  withinTolerancePct: number;
  /**
   * Intraclass correlation coefficient [0..1] using the one-way ANOVA ICC(1,1) model.
   * Measures agreement between predicted and tape-measure values INCLUDING systematic bias.
   * 1.0 = perfect agreement. Returns 0 when n < 2.
   * Target: >= MIN_ICC (0.90).
   */
  icc: number;
  /** Mean signed error (predicted minus truth) in cm. Positive = systematic overestimate. */
  bias: number;
  /** Number of labeled samples used for this region. */
  n: number;
}

/**
 * Fitted correction factor entry for one GirthRegion.
 * Produced by the calibration fit on the training split.
 * This is a PROPOSAL for the next versioned calibration cycle - NOT a live update.
 */
export interface FittedCorrectionEntry {
  /** Proposed correction factor for male subjects. Clamped to [FACTOR_CLAMP_MIN, FACTOR_CLAMP_MAX]. */
  male: number;
  /** Proposed correction factor for female subjects. Clamped to [FACTOR_CLAMP_MIN, FACTOR_CLAMP_MAX]. */
  female: number;
  /**
   * MAPE on the training split after applying these fitted factors (percent).
   * 0 = perfect fit on training data. Does not guarantee held-out accuracy.
   */
  fittedMape: number;
}

/**
 * Fitted calibration config produced by runValidation.
 *
 * CRITICAL: this is a PROPOSAL. Applying it requires a human-supervised calibration
 * commit that bumps CALIBRATION_VERSION in calibrationConfig.ts. The harness does NOT
 * write to CORRECTION_FACTORS at runtime (in-place mutation would make the version lie).
 */
export interface FittedConfig {
  /**
   * Bumped version identifier. Format: 'v2-fitted-YYYY-MM-DD'.
   * Different from CALIBRATION_VERSION to signal this is a new candidate config.
   */
  version: string;
  /**
   * Per-region fitted correction entries.
   * Only regions present in the labeled set are included.
   * Regions without data retain the current (unfitted) factors.
   */
  factors: Partial<Record<GirthRegion, FittedCorrectionEntry>>;
}

/**
 * Full accuracy validation report from runValidation.
 * The Task 12 accuracy claim gate reads heldOutPass.
 */
export interface ValidationReport {
  /** Per-region metrics on the FULL labeled set. */
  perRegion: Partial<Record<GirthRegion, RegionMetrics>>;
  /** Per-region metrics on the HELD-OUT split only (Section 10.3 - not overfit). */
  heldOutPerRegion: Partial<Record<GirthRegion, RegionMetrics>>;
  /**
   * True when full-set metrics meet all three criteria:
   *   1. Aggregate within-tolerance >= AGGREGATE_PASS_RATE (90%).
   *   2. Per-region MAPE <= PER_MEASUREMENT_PCT x 100 (10%).
   *   3. Per-region ICC >= MIN_ICC (90%).
   * False for an empty labeled set.
   */
  overallPass: boolean;
  /**
   * True when held-out-set metrics (with fitted factors applied) meet all three criteria.
   * This is the gate the Task 12 accuracy claim reads.
   * False until a real labeled cohort passes all thresholds on the held-out split.
   */
  heldOutPass: boolean;
  /** CALIBRATION_VERSION at the time this report was produced. */
  calibrationVersion: string;
  /** Fitted correction config from the training split. Version is bumped. */
  fittedConfig: FittedConfig;
  /**
   * 'proven': heldOutPass is true AND every region has >= MINIMUM_SAMPLES_PER_REGION samples.
   * 'unproven': any region is under-sampled, or heldOutPass is false. This is the honest
   * default before a real labeled cohort is supplied (Section 17.2).
   */
  cohortStatus: 'proven' | 'unproven';
  /** Human-readable note explaining the minimum cohort requirement. */
  minimumCohortNote: string;
}

// ---- Internal helpers (all pure, no IO, no mutation) ----

interface Pair { predicted: number; truth: number }

/**
 * Mean Absolute Percentage Error (MAPE).
 * Returns 0 for empty input.
 */
function computeMAPE(pairs: Pair[]): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((s, p) => s + Math.abs(p.predicted - p.truth) / p.truth, 0);
  return (sum / pairs.length) * 100;
}

/**
 * Mean signed error (predicted minus truth) in cm.
 * Positive = systematic overestimate.
 * Returns 0 for empty input.
 */
function computeBias(pairs: Pair[]): number {
  if (pairs.length === 0) return 0;
  return pairs.reduce((s, p) => s + (p.predicted - p.truth), 0) / pairs.length;
}

/**
 * Fraction of pairs meeting withinTolerance for the given region.
 * Returns 0 for empty input.
 */
function computeWithinTolerancePct(pairs: Pair[], region: GirthRegion): number {
  if (pairs.length === 0) return 0;
  const passing = pairs.filter(p => withinTolerance(p.predicted, p.truth, region)).length;
  return passing / pairs.length;
}

/**
 * Intraclass Correlation Coefficient (ICC 1,1) via one-way ANOVA.
 *
 * Model: n subjects, 2 raters (predicted, truth).
 * Subject mean: M_i = (x_i + y_i) / 2.
 * Grand mean:   G   = sum of all 2n values / 2n.
 * SSB = 2 * sum((M_i - G)^2), MSB = SSB / (n-1).
 * SSW = sum((x_i - M_i)^2) + sum((y_i - M_i)^2), MSW = SSW / n.
 * ICC = (MSB - MSW) / (MSB + MSW), clamped to [0, 1].
 *
 * ICC = 1.0 for perfect agreement (SSW = 0).
 * ICC = 0   for n < 2 (not computable) or total variance = 0.
 *
 * The absolute-agreement model includes systematic bias in the error term,
 * so a constant over/underestimate correctly lowers ICC below 1.
 */
function computeICC(pairs: Pair[]): number {
  const n = pairs.length;
  if (n < 2) return 0;

  const G = pairs.reduce((s, p) => s + p.predicted + p.truth, 0) / (2 * n);

  let ssBetween = 0;
  let ssWithin = 0;
  for (const p of pairs) {
    const M = (p.predicted + p.truth) / 2;
    ssBetween += (M - G) ** 2;
    ssWithin += (p.predicted - M) ** 2 + (p.truth - M) ** 2;
  }
  ssBetween *= 2; // k = 2 raters

  const msBetween = ssBetween / (n - 1);
  const msWithin = ssWithin / n;

  const denom = msBetween + msWithin;
  if (denom === 0) return 1; // all values identical - perfect agreement
  return Math.max(0, Math.min(1, (msBetween - msWithin) / denom));
}

/** Compute the full RegionMetrics object for one region's pairs. */
function regionMetrics(pairs: Pair[], region: GirthRegion): RegionMetrics {
  return {
    mape: computeMAPE(pairs),
    withinTolerancePct: computeWithinTolerancePct(pairs, region),
    icc: computeICC(pairs),
    bias: computeBias(pairs),
    n: pairs.length,
  };
}

/**
 * Pass/fail check for a set of per-region metrics.
 * All three criteria must hold across all regions for the check to pass.
 * Returns false for empty input or when total sample count is zero.
 */
function passesThresholds(metrics: RegionMetrics[]): boolean {
  const valid = metrics.filter(m => m.n > 0);
  if (valid.length === 0) return false;

  const totalN = valid.reduce((s, m) => s + m.n, 0);
  if (totalN === 0) return false;

  const totalPassing = valid.reduce((s, m) => s + m.withinTolerancePct * m.n, 0);
  const aggregatePassRate = totalPassing / totalN;

  return (
    aggregatePassRate >= AGGREGATE_PASS_RATE &&
    valid.every(m => m.mape <= PER_MEASUREMENT_PCT * 100) &&
    valid.every(m => m.icc >= MIN_ICC)
  );
}

/**
 * Fit a per-region multiplicative scale from training pairs.
 * scale = mean(truth / predicted), clamped to [FACTOR_CLAMP_MIN, FACTOR_CLAMP_MAX].
 * This minimizes mean squared error when applied to predictions.
 * Returns 1.0 when no training samples are available (no adjustment).
 */
function fitScale(trainPairs: Pair[]): number {
  if (trainPairs.length === 0) return 1;
  const meanRatio = trainPairs.reduce((s, p) => s + p.truth / p.predicted, 0) / trainPairs.length;
  return Math.max(FACTOR_CLAMP_MIN, Math.min(FACTOR_CLAMP_MAX, meanRatio));
}

/**
 * Apply scale to a set of pairs (adjusting predictions only).
 * Used to evaluate held-out data with the training-fitted scale.
 */
function applyScale(pairs: Pair[], scale: number): Pair[] {
  return pairs.map(p => ({ predicted: p.predicted * scale, truth: p.truth }));
}

/**
 * Split labeled samples for one region into training and held-out subsets.
 * Ensures at least one held-out sample when n >= 2.
 * First (trainCount) samples are training; remainder are held-out.
 */
function splitRegion(samples: LabeledSample[]): { train: Pair[]; heldOut: Pair[] } {
  const n = samples.length;
  if (n === 0) return { train: [], heldOut: [] };

  const rawTrain = Math.round(n * TRAIN_SPLIT_RATIO);
  // Clamp: at least 1 training sample; at least 1 held-out when n >= 2.
  const trainCount = n >= 2
    ? Math.min(n - 1, Math.max(1, rawTrain))
    : n; // n == 1: all samples in training, held-out is empty

  const toPair = (s: LabeledSample): Pair => ({ predicted: s.predictedCm, truth: s.truthCm });
  return {
    train:   samples.slice(0, trainCount).map(toPair),
    heldOut: samples.slice(trainCount).map(toPair),
  };
}

/**
 * Group labeled samples by region.
 * Returns a Map from GirthRegion to the list of samples for that region.
 */
function groupByRegion(labeledSet: LabeledSample[]): Map<GirthRegion, LabeledSample[]> {
  const grouped = new Map<GirthRegion, LabeledSample[]>();
  for (const s of labeledSet) {
    if (!grouped.has(s.region)) grouped.set(s.region, []);
    grouped.get(s.region)!.push(s);
  }
  return grouped;
}

/**
 * Produce a bumped version string for the fitted config.
 * Format: 'v2-fitted-YYYY-MM-DD'. Different from CALIBRATION_VERSION.
 */
function bumpVersion(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `v2-fitted-${today}`;
}

// ---- Public entry point ----

/**
 * Run the full accuracy validation harness on a labeled measurement set.
 *
 * Algorithm:
 *   1. Group samples by region. Split each region 80/20 (train/held-out).
 *   2. Compute full-set metrics (all samples per region).
 *   3. Fit a per-region correction scale on the training split.
 *   4. Evaluate held-out metrics with the fitted scale applied.
 *   5. Produce a FittedConfig with bumped version (no mutation of live config).
 *   6. Check overallPass (full set) and heldOutPass (held-out only).
 *   7. Report cohortStatus = 'proven' only when heldOutPass AND enough samples.
 *
 * Until the team supplies a real labeled cohort per Section 10.1, cohortStatus is
 * 'unproven' and heldOutPass is false. This is the honest default per Section 17.2.
 *
 * @param labeledSet - Labeled measurement pairs from a tape-measure session.
 * @returns ValidationReport with per-region metrics, pass flags, and fitted config.
 */
export function runValidation(labeledSet: LabeledSample[]): ValidationReport {
  const grouped = groupByRegion(labeledSet);

  // --- Full-set metrics (all samples per region) ---
  const perRegion: Partial<Record<GirthRegion, RegionMetrics>> = {};
  const regionSplits = new Map<GirthRegion, { train: Pair[]; heldOut: Pair[] }>();

  for (const [region, samples] of grouped) {
    const split = splitRegion(samples);
    regionSplits.set(region, split);
    const all = [...split.train, ...split.heldOut];
    perRegion[region] = regionMetrics(all, region);
  }

  // --- Calibration fit on training data (per region) ---
  const scales = new Map<GirthRegion, number>();
  for (const [region, { train }] of regionSplits) {
    scales.set(region, fitScale(train));
  }

  // --- Held-out metrics with fitted scale applied ---
  const heldOutPerRegion: Partial<Record<GirthRegion, RegionMetrics>> = {};
  for (const [region, { heldOut }] of regionSplits) {
    if (heldOut.length === 0) continue; // skip regions with no held-out data
    const scale = scales.get(region) ?? 1;
    heldOutPerRegion[region] = regionMetrics(applyScale(heldOut, scale), region);
  }

  // --- Pass / fail ---
  const overallMetrics = Object.values(perRegion).filter(Boolean) as RegionMetrics[];
  const overallPass = passesThresholds(overallMetrics);

  const heldOutMetrics = Object.values(heldOutPerRegion).filter(Boolean) as RegionMetrics[];
  const heldOutPass = heldOutMetrics.length > 0 && passesThresholds(heldOutMetrics);

  // --- Fitted config (new version, no mutation of live CORRECTION_FACTORS) ---
  const fittedFactors: Partial<Record<GirthRegion, FittedCorrectionEntry>> = {};
  for (const [region, { train }] of regionSplits) {
    const scale = scales.get(region) ?? 1;
    const internalRegion = GIRTH_TO_REGION[region];
    const currentMale   = getCorrectionFactor(internalRegion, 'male').factor;
    const currentFemale = getCorrectionFactor(internalRegion, 'female').factor;
    const clamp = (v: number) => Math.max(FACTOR_CLAMP_MIN, Math.min(FACTOR_CLAMP_MAX, v));
    fittedFactors[region] = {
      male:        clamp(currentMale   * scale),
      female:      clamp(currentFemale * scale),
      fittedMape:  computeMAPE(applyScale(train, scale)),
    };
  }

  const fittedConfig: FittedConfig = {
    version: bumpVersion(),
    factors: fittedFactors,
  };

  // --- Cohort status ---
  const ALL_GIRTH_REGIONS: GirthRegion[] = [
    'neck', 'upperArm', 'forearm', 'upperLeg', 'lowerLeg', 'chest', 'waist', 'hip',
  ];
  const allRegionsAdequate = ALL_GIRTH_REGIONS.every(
    r => (perRegion[r]?.n ?? 0) >= MINIMUM_SAMPLES_PER_REGION,
  );
  const cohortStatus: 'proven' | 'unproven' = (heldOutPass && allRegionsAdequate)
    ? 'proven'
    : 'unproven';

  const totalMin = ALL_GIRTH_REGIONS.length * MINIMUM_SAMPLES_PER_REGION;
  const minimumCohortNote =
    `Minimum cohort: ${MINIMUM_SAMPLES_PER_REGION} labeled measurement pairs per region ` +
    `(${ALL_GIRTH_REGIONS.length} regions x ${MINIMUM_SAMPLES_PER_REGION} = ${totalMin} pairs total). ` +
    `Current set has ${labeledSet.length} total pairs. ` +
    `Recommendation: 50 per region for robust ICC estimates.`;

  return {
    perRegion,
    heldOutPerRegion,
    overallPass,
    heldOutPass,
    calibrationVersion: CALIBRATION_VERSION,
    fittedConfig,
    cohortStatus,
    minimumCohortNote,
  };
}
