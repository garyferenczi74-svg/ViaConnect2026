// Task 13a (Prompt 210c) - Capture quality assessment (pure logic, no IO, no side effects).
//
// Section 5.4: assessCaptureQuality inspects a caller-supplied plain-data
// description of a captured frame and returns a score in [0,1], a list of
// human-actionable issue strings, and a pass flag.
//
// RULE 9: this module only reports the assessment. It never fabricates values or
// silently treats a failed capture as good. The caller is responsible for
// flagging affected measurements low-confidence or UNKNOWN when pass is false
// (Section 5.5).
//
// UI wiring + reference-object opt-in toggle are DEFERRED to a later step.

import type { PoseId } from '../types';

// ---- Named threshold constants (single source of truth) ----
// These are exported so callers can document their own normalization logic.

/**
 * Device tilt in degrees above which a soft warning is issued.
 * Below this threshold, tilt is acceptable and does not reduce the score.
 * Rule: TILT_WARN_DEG < TILT_BLOCK_DEG.
 */
export const TILT_WARN_DEG = 10;

/**
 * Device tilt in degrees above which tilt becomes a BLOCKING issue.
 * At this angle, systematic bias makes measurements unreliable regardless
 * of landmark quality. The caller must flag outputs UNKNOWN (RULE 9).
 */
export const TILT_BLOCK_DEG = 25;

/**
 * Contrast score (0-1) below which a soft warning is issued.
 * Marginal contrast degrades silhouette quality but may still yield
 * usable output with reduced confidence.
 */
export const CONTRAST_WARN_MIN = 0.35;

/**
 * Contrast score (0-1) below which contrast becomes a BLOCKING issue.
 * At this level the image is too dark or overexposed for reliable
 * segmentation; the caller must flag outputs UNKNOWN (RULE 9).
 * Rule: CONTRAST_BLOCK_MIN < CONTRAST_WARN_MIN.
 */
export const CONTRAST_BLOCK_MIN = 0.15;

/**
 * Average landmark visibility score (0-1) below which a soft warning is
 * issued for reduced landmark reliability. This is secondary to the
 * per-landmark boolean visible flags; a low average score signals
 * borderline occlusion even when all required anchors are technically
 * present.
 * Landmark visibility is the primary driver of measurement uncertainty
 * (see confidenceModel.ts WEIGHTS).
 */
export const MIN_LANDMARK_VISIBILITY = 0.50;

// ---- Score deduction table (single source, never scatter as magic numbers) ----
// Each constant is the deduction from 1.0 when that condition is present.
// Multiple conditions stack additively; the final score is clamped to [0, 1].

const PENALTY_NO_PERSON = 0.80;
const PENALTY_NOT_FULL_BODY = 0.50;
const PENALTY_WRONG_ORIENTATION = 0.40;
const PENALTY_TILT_BLOCKING = 0.40;
const PENALTY_TILT_SOFT = 0.15;
const PENALTY_CONTRAST_BLOCKING = 0.30;
const PENALTY_CONTRAST_SOFT = 0.10;
const PENALTY_LOW_VISIBILITY = 0.10;

// ---- Input interfaces ----

/**
 * Presence and estimated visibility of key body landmarks used to assess
 * whether the full body is within the captured frame.
 *
 * Each boolean is true when the landmark is present AND above MediaPipe's
 * internal visibility threshold. averageVisibility is the mean visibility
 * score (0-1) across all detected landmarks; the caller computes it from
 * MediaPipe PoseLandmark visibility values.
 *
 * This interface decouples captureQuality.ts from the full LandmarkMap type,
 * keeping the module pure and trivially testable.
 */
export interface BodyLandmarkAssessment {
  noseVisible: boolean;
  leftShoulderVisible: boolean;
  rightShoulderVisible: boolean;
  leftHipVisible: boolean;
  rightHipVisible: boolean;
  leftAnkleVisible: boolean;
  rightAnkleVisible: boolean;
  /** Mean landmark visibility score in [0, 1] across all detected landmarks. */
  averageVisibility: number;
}

/**
 * Caller-supplied plain-data description of a captured frame.
 *
 * No image data or CV outputs are passed directly; the caller performs all
 * computer-vision work (MediaPipe Pose, segmentation, contrast analysis) and
 * summarises the results here. This keeps captureQuality.ts pure and fast to
 * unit-test without mocking image processing pipelines.
 */
export interface CaptureQualityInput {
  /** The pose the user was asked to assume (front | back | left | right). */
  requestedPose: PoseId;
  /**
   * The orientation detected from the image.
   * null means orientation could not be determined (for example, no person
   * detected, or insufficient landmarks to classify the view).
   */
  detectedPose: PoseId | null;
  /** True when exactly one person is clearly detected in the frame. */
  personDetected: boolean;
  /**
   * Presence and visibility of key body landmarks.
   * Caller populates this from MediaPipe Pose landmark output.
   */
  landmarks: BodyLandmarkAssessment;
  /**
   * Estimated device tilt from vertical, in degrees.
   * 0 = perfectly vertical (ideal). 90 = horizontal (unusable).
   * Negative values are treated as their absolute value.
   */
  tiltDeg: number;
  /**
   * Image contrast/brightness quality estimate in [0, 1].
   * 1 = ideal photographic conditions; 0 = completely unusable.
   * The caller derives this from the frame (e.g., RMS contrast, histogram
   * spread, or a combined perceptual metric). Higher is better.
   */
  contrastScore: number;
}

// ---- Output interface ----

/**
 * Result of assessCaptureQuality.
 *
 * score: overall capture quality in [0, 1]. This value is intended to be
 *   passed directly as captureQualityScore to scoreMeasurementConfidence()
 *   in confidenceModel.ts (Task 2).
 *
 * issues: human-actionable problem descriptions, one entry per detected
 *   issue. Empty when the capture is fully acceptable.
 *
 * pass: true only when NO blocking issue is present.
 *   A false pass signals the caller to flag affected measurements as
 *   low-confidence or UNKNOWN (RULE 9 / Section 5.5). The caller MAY
 *   choose to proceed despite a failed capture but MUST NOT treat it as
 *   equivalent to a passing capture.
 *
 * Blocking issues (cause pass = false):
 *   - no person detected
 *   - full body not in frame (any of: head, shoulders, hips, ankles missing)
 *   - orientation does not match requested view
 *   - device tilt >= TILT_BLOCK_DEG (25 deg)
 *   - contrast below CONTRAST_BLOCK_MIN (0.15)
 *
 * Soft issues (add to issues list, reduce score, do NOT change pass):
 *   - tilt between TILT_WARN_DEG (10 deg) and TILT_BLOCK_DEG (25 deg)
 *   - contrast between CONTRAST_BLOCK_MIN (0.15) and CONTRAST_WARN_MIN (0.35)
 *   - average landmark visibility below MIN_LANDMARK_VISIBILITY (0.50)
 */
export interface CaptureQualityResult {
  score: number;
  issues: string[];
  pass: boolean;
}

// ---- Core assessment function ----

/**
 * Assesses the quality of a single captured frame from a caller-supplied
 * plain-data description. Returns a score in [0, 1], a list of human-
 * actionable issue strings, and a pass flag.
 *
 * Pure function: no IO, no side effects, no mutation. Safe to call from any
 * context including server-side and test environments.
 *
 * Score formula: start from 1.0, subtract named penalty for each issue
 * detected, clamp result to [0, 1]. Multiple issues stack additively; a
 * heavily flawed capture will approach 0.
 *
 * pass is true only when NO blocking issue is detected (see CaptureQualityResult
 * for the authoritative list of blocking vs. soft issues).
 *
 * RULE 9: this function only reports the assessment. It never fabricates or
 * suppresses a measurement value. The caller decides how to handle a failed view.
 *
 * @param input - Caller-supplied frame description. No image data required.
 * @returns CaptureQualityResult with score, issues, and pass.
 */
export function assessCaptureQuality(input: CaptureQualityInput): CaptureQualityResult {
  const issues: string[] = [];
  let penalty = 0;
  let hasBlockingIssue = false;

  const addBlocking = (issue: string, pen: number): void => {
    issues.push(issue);
    penalty += pen;
    hasBlockingIssue = true;
  };

  const addSoft = (issue: string, pen: number): void => {
    issues.push(issue);
    penalty += pen;
  };

  // --- 1. Single-person detection (BLOCKING) ---
  // Without a detected person no further CV signal is reliable.
  if (!input.personDetected) {
    addBlocking('no person detected', PENALTY_NO_PERSON);
  }

  // --- 2. Full body in frame (BLOCKING) ---
  // Only assessed when a person is detected. Missing key landmark anchors mean
  // the body extends outside the frame or is significantly occluded.
  if (input.personDetected) {
    const lm = input.landmarks;
    const missingParts: string[] = [];

    if (!lm.noseVisible) {
      missingParts.push('head');
    }
    if (!lm.leftShoulderVisible || !lm.rightShoulderVisible) {
      missingParts.push('shoulders');
    }
    if (!lm.leftHipVisible || !lm.rightHipVisible) {
      missingParts.push('hips');
    }
    if (!lm.leftAnkleVisible || !lm.rightAnkleVisible) {
      missingParts.push('ankles');
    }

    if (missingParts.length > 0) {
      addBlocking(
        `full body not in frame (missing: ${missingParts.join(', ')})`,
        PENALTY_NOT_FULL_BODY
      );
    }
  }

  // --- 3. Orientation mismatch (BLOCKING) ---
  // Assessed only when a person is detected and orientation could be classified.
  // A side view submitted as a front view would silently corrupt all width-based
  // measurements; this must be a hard failure.
  if (input.personDetected && input.detectedPose !== null) {
    if (input.detectedPose !== input.requestedPose) {
      addBlocking(
        `orientation does not match requested view (requested ${input.requestedPose}, detected ${input.detectedPose})`,
        PENALTY_WRONG_ORIENTATION
      );
    }
  }

  // --- 4. Device tilt ---
  // Mild tilt: soft warning (score reduced, pass unchanged).
  // Excessive tilt: BLOCKING because measurements derived from a heavily tilted
  // image carry a systematic perspective distortion that cannot be corrected
  // post-hoc without knowing the actual tilt vector.
  const tilt = Math.abs(input.tiltDeg);
  if (tilt >= TILT_BLOCK_DEG) {
    addBlocking(
      `device tilt too high (${tilt.toFixed(1)} degrees from vertical)`,
      PENALTY_TILT_BLOCKING
    );
  } else if (tilt >= TILT_WARN_DEG) {
    addSoft(
      `slight device tilt detected (${tilt.toFixed(1)} degrees)`,
      PENALTY_TILT_SOFT
    );
  }

  // --- 5. Contrast / brightness ---
  // Marginal contrast: soft (measurement quality degraded but possibly usable).
  // Very low contrast: BLOCKING (reliable segmentation is impossible).
  if (input.contrastScore < CONTRAST_BLOCK_MIN) {
    addBlocking(
      'low contrast (image is too dark or overexposed)',
      PENALTY_CONTRAST_BLOCKING
    );
  } else if (input.contrastScore < CONTRAST_WARN_MIN) {
    addSoft('low contrast', PENALTY_CONTRAST_SOFT);
  }

  // --- 6. Average landmark visibility (SOFT) ---
  // Even when all required anchors are technically present, a low average
  // visibility score indicates borderline occlusion or distance that will
  // increase measurement uncertainty. This is a soft signal; blocking is
  // already handled by the per-landmark boolean checks above.
  if (input.personDetected && input.landmarks.averageVisibility < MIN_LANDMARK_VISIBILITY) {
    addSoft(
      `low landmark visibility (average ${input.landmarks.averageVisibility.toFixed(2)})`,
      PENALTY_LOW_VISIBILITY
    );
  }

  const score = Math.max(0, Math.min(1, 1 - penalty));
  const pass = !hasBlockingIssue;

  return { score, issues, pass };
}
