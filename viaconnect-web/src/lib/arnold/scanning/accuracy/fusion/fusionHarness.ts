// Task 211b-W3a - Fusion-mode harness eval.
//
// Re-runs the SAME runValidation machinery (Task 11 / 210c) with a user's fitted
// personal correction applied to each prediction first, so the personal correction
// is VALIDATED on held-out pairs rather than merely asserted. Does not fork or
// reimplement runValidation's MAPE/ICC/within-tolerance math.

import { runValidation, type LabeledSample, type ValidationReport } from '../validationHarness';
import type { GirthRegion } from '../accuracyTargets';
import type { Region } from '../../types';
import type { PersonalCorrectionResult, PersonalRegionFit } from './personalCorrection';

/**
 * Maps the 8-region accuracy taxonomy (GirthRegion, used by LabeledSample) to the
 * 11-region pipeline taxonomy (Region, used by fitPersonalCorrection's perRegion
 * keys). Mirrors validationHarness.ts's private GIRTH_TO_REGION table (not exported
 * there); duplicated here rather than editing that file, per this task's
 * additive-only constraint on existing files. waist maps to waist_natural as the
 * primary waist plane, matching validationHarness.ts's own convention.
 */
const GIRTH_TO_REGION: Readonly<Record<GirthRegion, Region>> = Object.freeze({
  neck:     'neck',
  upperArm: 'bicep',
  forearm:  'forearm',
  upperLeg: 'thigh',
  lowerLeg: 'calf',
  chest:    'chest',
  waist:    'waist_natural',
  hip:      'hip',
});

/**
 * Applies a fitted per-user residual correction to one labeled sample's prediction.
 * correctedCm = slope * predictedCm + intercept, the same linear form produced by
 * fitPersonalCorrection. Samples whose region has no fit pass through unchanged.
 */
function applyFit(sample: LabeledSample, fit: PersonalRegionFit | undefined): LabeledSample {
  if (!fit) return sample;
  return { ...sample, predictedCm: fit.slope * sample.predictedCm + fit.intercept };
}

/**
 * Runs the accuracy validation harness in fusion mode: each sample's prediction is
 * adjusted by the user's fitted personal correction (when one exists for that
 * sample's region) before the SAME runValidation machinery scores it.
 *
 * When personalCorrections.status is not 'fitted' (insufficient or unreliable),
 * this is IDENTICAL to calling runValidation directly on the uncalibrated set -
 * honestly reflecting that no personal tightening is available or trustworthy yet.
 *
 * @param labeledSet - the same LabeledSample[] shape runValidation accepts.
 * @param personalCorrections - output of fitPersonalCorrection for this user.
 * @returns a ValidationReport, in fusion mode when a fit is available.
 */
export function runFusionValidation(
  labeledSet: LabeledSample[],
  personalCorrections: PersonalCorrectionResult,
): ValidationReport {
  if (personalCorrections.status !== 'fitted') {
    return runValidation(labeledSet);
  }

  const corrected = labeledSet.map(sample =>
    applyFit(sample, personalCorrections.perRegion[GIRTH_TO_REGION[sample.region]]),
  );

  return runValidation(corrected);
}
