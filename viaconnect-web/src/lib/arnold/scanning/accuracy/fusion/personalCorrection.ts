// Task 211b-W3a - Per-user calibration fusion: personal correction fit.
//
// Fits a per-user linear residual correction (OLS slope + intercept) ON TOP OF the
// global shape-correction factors in calibrationConfig.ts. This module NEVER imports
// or mutates calibrationConfig.ts - predictedCm inputs are assumed to already carry
// the global correction factor (same convention as LabeledSample.predictedCm in
// validationHarness.ts). The caller supplies calibrationVersion purely as an audit
// pass-through so a stored fit can be checked for staleness if the global config
// is later re-fitted.
//
// HONESTY (the point of this module - each rule has a dedicated test):
//   1. Never manufacture agreement. Anchors that mutually disagree beyond the
//      supplied global band, or a region whose residual error is no better than
//      the global band, make the WHOLE result 'unreliable' with the offending
//      readings flagged - never silently averaged into a tighter number.
//   2. A displayed personal band is never tighter than the evidence supports.
//      tightenedBandCm widens the raw residual standard error by a t-quantile
//      appropriate to the sample size (small n means a wider multiplier) and is
//      floored at PERSONAL_BAND_FLOOR_CM.
//   3. Gated on named minimum-data constants, not a judgment call at call time.
//   4. Pure, deterministic, no IO, no clock. FUSION_VERSION is a fixed string,
//      not derived from the system clock (unlike validationHarness's own
//      bumpVersion, which serves a different, intentionally date-stamped purpose).
//
// No em or en dashes, no emojis, zero any, TS strict.

import type { Region } from '../../types';
import type { AnchorSource, StatedReliability } from './anchorTypes';

/** Version identifier for the fusion math itself. Distinct from CALIBRATION_VERSION,
 *  which belongs to calibrationConfig.ts and is never read or written here. */
export const FUSION_VERSION = 'fusion-v1-2026-07' as const;

/**
 * Minimum total anchor pairs (across all regions) before attempting any fit.
 * Below this, the user has essentially no anchor data yet.
 */
export const MIN_TOTAL_ANCHOR_PAIRS = 3;

/**
 * Minimum paired (predicted, anchor-truth) observations a single region needs
 * before a personal OLS fit for that region is attempted. Chosen so the fit's
 * degrees of freedom (nPairs - 2) land exactly on the smallest row of the
 * t-quantile lookup below (df = 5), so every fitted region gets a real,
 * table-backed widening rather than an extrapolated one.
 */
export const MIN_ANCHOR_PAIRS_PER_REGION = 7;

/**
 * Floor for a displayed personal band in cm. No fit, however good, may claim a
 * tighter band than this.
 */
export const PERSONAL_BAND_FLOOR_CM = 0.5;

/**
 * One matched observation: a scan-pipeline prediction paired with a ground-truth
 * anchor reading taken at (approximately) the same time, for the same region.
 */
export interface PersonalPair {
  region: Region;
  /** Pipeline-predicted circumference, cm. Already carries the global correction
   *  factor (same convention as LabeledSample.predictedCm in validationHarness.ts). */
  predictedCm: number;
  /** Ground-truth anchor value, cm. */
  anchorTruthCm: number;
  anchorSource: AnchorSource;
  statedReliability: StatedReliability;
  /** ISO 8601 timestamp of the anchor reading, supplied by the caller. */
  takenAt: string;
}

export interface PersonalCorrectionInput {
  pairsByRegion: Partial<Record<Region, PersonalPair[]>>;
  /**
   * Current global error band in cm per region (e.g. the region tolerance or the
   * harness's own error band). The personal fit's residual SE is measured against
   * this - a fit that is not demonstrably better than the global band is never
   * shown as tighter (see HONESTY rule 1). Supplied by the caller; this module
   * never invents a band.
   */
  globalBandCm: Partial<Record<Region, number>>;
  /** CALIBRATION_VERSION this fit was computed against. Pass-through only. */
  calibrationVersion: string;
}

export interface PersonalRegionFit {
  slope: number;
  intercept: number;
  nPairs: number;
  /** Residual standard error (cm) of the fit on its own training pairs. */
  residualSE: number;
  /** Never smaller than the t-widened residual band or PERSONAL_BAND_FLOOR_CM. */
  tightenedBandCm: number;
}

export interface FlaggedAnchor {
  region: Region;
  source: AnchorSource;
  takenAt: string;
  value: number;
  reason: 'conflicts-with-other-source' | 'residual-worse-than-global-band';
}

export type PersonalCorrectionResult =
  | {
      status: 'fitted';
      version: typeof FUSION_VERSION;
      calibrationVersion: string;
      perRegion: Partial<Record<Region, PersonalRegionFit>>;
    }
  | { status: 'insufficient'; reason: 'too-few-anchors' | 'too-few-scans' }
  | { status: 'unreliable'; flaggedAnchors: FlaggedAnchor[] };

// ---- Internal helpers (pure, no IO) ----

/** 95 percent two-tailed t-quantile lookup, df 5/10/20/30/inf (211b baseline Section 7). */
const T_QUANTILE_95: ReadonlyArray<{ df: number; t: number }> = [
  { df: 5, t: 2.571 },
  { df: 10, t: 2.228 },
  { df: 20, t: 2.086 },
  { df: 30, t: 2.042 },
  { df: Infinity, t: 1.960 },
];

/**
 * Looks up the 95 percent t-quantile for the given degrees of freedom, rounding
 * DOWN to the nearest table row so the multiplier used is always at least as
 * large as the true value - conservative, per HONESTY rule 2.
 */
function tQuantile95(df: number): number {
  let chosen = T_QUANTILE_95[0].t;
  for (const row of T_QUANTILE_95) {
    if (df >= row.df) chosen = row.t;
  }
  return chosen;
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Ordinary least squares fit of anchorTruthCm on predictedCm.
 * Degenerate case (all predictedCm identical): slope is 0 and intercept is the
 * mean anchor truth - a pure mean-shift correction, still honest.
 */
function ols(pairs: PersonalPair[]): { slope: number; intercept: number; sse: number } {
  const xs = pairs.map(p => p.predictedCm);
  const ys = pairs.map(p => p.anchorTruthCm);
  const xbar = mean(xs);
  const ybar = mean(ys);

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < pairs.length; i++) {
    sxy += (xs[i] - xbar) * (ys[i] - ybar);
    sxx += (xs[i] - xbar) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = ybar - slope * xbar;

  let sse = 0;
  for (let i = 0; i < pairs.length; i++) {
    const fitted = slope * xs[i] + intercept;
    sse += (ys[i] - fitted) ** 2;
  }
  return { slope, intercept, sse };
}

/**
 * Flags anchor readings that mutually disagree: two or more distinct readings
 * for the same region taken at the exact same timestamp, whose values spread
 * beyond the supplied global band. Regions without a supplied band are skipped
 * (no band to judge disagreement against - never fabricate one).
 */
function detectConflicts(
  pairsByRegion: Partial<Record<Region, PersonalPair[]>>,
  globalBandCm: Partial<Record<Region, number>>,
): FlaggedAnchor[] {
  const flagged: FlaggedAnchor[] = [];

  for (const region of Object.keys(pairsByRegion) as Region[]) {
    const pairs = pairsByRegion[region];
    if (!pairs || pairs.length === 0) continue;
    const band = globalBandCm[region];
    if (band === undefined) continue;

    const byTime = new Map<string, PersonalPair[]>();
    for (const p of pairs) {
      const bucket = byTime.get(p.takenAt) ?? [];
      bucket.push(p);
      byTime.set(p.takenAt, bucket);
    }

    for (const group of byTime.values()) {
      if (group.length < 2) continue;
      const values = group.map(g => g.anchorTruthCm);
      const spread = Math.max(...values) - Math.min(...values);
      if (spread > band) {
        for (const g of group) {
          flagged.push({
            region,
            source: g.anchorSource,
            takenAt: g.takenAt,
            value: g.anchorTruthCm,
            reason: 'conflicts-with-other-source',
          });
        }
      }
    }
  }

  return flagged;
}

// ---- Public entry point ----

/**
 * Fits a per-user residual correction on top of the global calibration.
 * See the module header for the honesty invariants this function enforces.
 */
export function fitPersonalCorrection(input: PersonalCorrectionInput): PersonalCorrectionResult {
  const regions = Object.keys(input.pairsByRegion) as Region[];
  const totalPairs = regions.reduce((s, r) => s + (input.pairsByRegion[r]?.length ?? 0), 0);

  if (totalPairs < MIN_TOTAL_ANCHOR_PAIRS) {
    return { status: 'insufficient', reason: 'too-few-anchors' };
  }

  const conflicts = detectConflicts(input.pairsByRegion, input.globalBandCm);
  if (conflicts.length > 0) {
    return { status: 'unreliable', flaggedAnchors: conflicts };
  }

  const eligibleRegions = regions.filter(
    r => (input.pairsByRegion[r]?.length ?? 0) >= MIN_ANCHOR_PAIRS_PER_REGION,
  );
  if (eligibleRegions.length === 0) {
    return { status: 'insufficient', reason: 'too-few-scans' };
  }

  const perRegion: Partial<Record<Region, PersonalRegionFit>> = {};
  const worseThanGlobal: FlaggedAnchor[] = [];

  for (const region of eligibleRegions) {
    const pairs = input.pairsByRegion[region]!;
    const globalBand = input.globalBandCm[region];
    if (globalBand === undefined) continue; // no comparison band supplied - cannot judge improvement

    const { slope, intercept, sse } = ols(pairs);
    const n = pairs.length;
    const df = n - 2;
    const residualSE = Math.sqrt(sse / df);

    if (residualSE >= globalBand) {
      for (const p of pairs) {
        worseThanGlobal.push({
          region,
          source: p.anchorSource,
          takenAt: p.takenAt,
          value: p.anchorTruthCm,
          reason: 'residual-worse-than-global-band',
        });
      }
      continue;
    }

    const tightenedBandCm = Math.max(tQuantile95(df) * residualSE, PERSONAL_BAND_FLOOR_CM);
    perRegion[region] = { slope, intercept, nPairs: n, residualSE, tightenedBandCm };
  }

  if (worseThanGlobal.length > 0) {
    return { status: 'unreliable', flaggedAnchors: worseThanGlobal };
  }

  if (Object.keys(perRegion).length === 0) {
    return { status: 'insufficient', reason: 'too-few-scans' };
  }

  return {
    status: 'fitted',
    version: FUSION_VERSION,
    calibrationVersion: input.calibrationVersion,
    perRegion,
  };
}
