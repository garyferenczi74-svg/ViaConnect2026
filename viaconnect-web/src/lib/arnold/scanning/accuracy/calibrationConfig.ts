// Shape-correction factor calibration config for circumference prediction.
//
// CALIBRATION_VERSION identifies the current fit status of the factors.
// 'v1-uncalibrated-2026-06' is the pre-fit baseline derived from published
// anthropometric studies (empirical heuristics, not fitted to any population
// dataset). The accuracy harness (Task 11) will replace these with data-fitted
// values and bump the version string when factors change.
//
// Single source of truth for all correction factor reads. No consumer should
// inline numeric correction factors - use getCorrectionFactor() instead.
//
// Factor comments reference why each region deviates from a pure ellipse.
// Errors on individual measurements are typically +/- 3 to 7 percent;
// trend accuracy over repeat scans is much better (systematic bias cancels).

import type { BiologicalSex } from '../../brain/bodyCompositionScience';
import type { Region } from '../types';

/** Version identifier for the current correction-factor set.
 *  Pre-fit baseline: empirical heuristics, not yet fitted against tape measurements.
 *  The calibration harness (Task 11) updates this when factors are re-fitted. */
export const CALIBRATION_VERSION = 'v1-uncalibrated-2026-06' as const;

/** Metadata and values for one region's shape-correction entry.
 *  factor > 1 expands the Ramanujan ellipse estimate; factor < 1 contracts it. */
export interface CorrectionFactorEntry {
  /** Shape-correction multiplier for male subjects. */
  male: number;
  /** Shape-correction multiplier for female subjects. */
  female: number;
  /** Mean Absolute Percentage Error (%) fitted by the calibration harness against
   *  ground-truth tape measurements. null = pre-fit baseline (not yet measured). */
  fittedMape: number | null;
}

/** Per-region correction factors frozen at the pre-fit baseline.
 *  Values were originally inlined in circumferencePredictor.ts and have been
 *  extracted here (behavior-preserving refactor; Task 7). The calibration
 *  harness (Task 11) will re-fit these using real measurement pairs. */
export const CORRECTION_FACTORS: Readonly<Record<Region, CorrectionFactorEntry>> = Object.freeze({
  neck:          { male: 1.02, female: 1.02, fittedMape: null }, // near-circular cross-section
  shoulder:      { male: 0.95, female: 0.96, fittedMape: null }, // shoulder is flatter than an ellipse
  chest:         { male: 1.00, female: 1.04, fittedMape: null }, // female chest tissue adds volume
  under_bust:    { male: 1.00, female: 1.00, fittedMape: null }, // close to a true ellipse
  waist_natural: { male: 1.01, female: 1.02, fittedMape: null }, // slight outward bulge at natural waist
  waist_navel:   { male: 1.02, female: 1.02, fittedMape: null }, // navel-height plane slightly wider
  hip:           { male: 1.03, female: 1.05, fittedMape: null }, // hip cross-section is not truly elliptical
  bicep:         { male: 0.98, female: 0.98, fittedMape: null }, // muscle belly is slightly narrower
  forearm:       { male: 0.97, female: 0.97, fittedMape: null }, // tapered forearm cross-section
  thigh:         { male: 1.02, female: 1.03, fittedMape: null }, // thigh tissue distribution is rounder
  calf:          { male: 0.99, female: 0.99, fittedMape: null }, // calf is close to a true ellipse
});

/** Retrieve the shape-correction factor for a region and sex, with version metadata.
 *
 *  This is the single source of truth for all correction factor reads in the
 *  circumference-prediction pipeline. circumferencePredictor.ts calls this
 *  instead of using inline literals.
 *
 *  @param region - body region identifier
 *  @param sex    - biological sex of the subject
 *  @returns      factor (the multiplier to apply after Ramanujan ellipse math),
 *                fittedMape (null pre-calibration, filled by Task 11 harness),
 *                and version string identifying the factor set. */
export function getCorrectionFactor(
  region: Region,
  sex: BiologicalSex,
): { factor: number; fittedMape: number | null; version: string } {
  const entry = CORRECTION_FACTORS[region];
  return {
    factor: entry[sex],
    fittedMape: entry.fittedMape,
    version: CALIBRATION_VERSION,
  };
}
