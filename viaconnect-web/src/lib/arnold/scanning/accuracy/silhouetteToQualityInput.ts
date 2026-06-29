/**
 * Task 13b (Prompt 210c) - Maps a PoseSilhouette (T9 CV output) to a
 * CaptureQualityInput for assessCaptureQuality.
 *
 * Exports:
 *   silhouetteToQualityInput - pure mapper, no IO, no side effects
 *   retakePromptForIssues   - maps issues[] to a single user-actionable prompt
 *
 * Design: fail-open. When landmark data is ambiguous or absent, the mapper
 * defaults to conservative values that produce a PASSING quality result rather
 * than a false failure. RULE 9: this module only maps inputs for the quality
 * assessor - it never fabricates or suppresses a measurement value.
 *
 * Coordinate convention: landmarks in PoseSilhouette are in image space (pixels)
 * per the type comment in scanning/types.ts. Normalization to [0,1] is applied
 * internally when computing orientation heuristics.
 */

import type { PoseSilhouette, LandmarkMap } from '../types';
import type { LandmarkKey } from '../types';
import type { PoseId } from '../../types';
import type { CaptureQualityInput, BodyLandmarkAssessment } from './captureQuality';
import { TILT_WARN_DEG } from './captureQuality';

// ---- Constants (single source) ----

/**
 * MediaPipe visibility score threshold below which a landmark is treated as
 * not-visible for BodyLandmarkAssessment purposes.
 * MediaPipe visibility is a probability in [0, 1]; 0.5 is the conventional midpoint.
 */
export const VISIBILITY_THRESHOLD = 0.5;

/**
 * Minimum fraction of key landmark anchors that must be present for a person
 * to be considered "detected" in the frame. 3 of 7 (43%) is conservative:
 * even a heavily occluded but clearly present person passes this gate.
 */
export const PERSON_DETECTED_MIN_ANCHORS = 3;

/**
 * Default contrast score used when no contrast information is available from
 * the silhouette (qualityScore is 0 or unset). 0.6 is above the CONTRAST_WARN_MIN
 * (0.35) and CONTRAST_BLOCK_MIN (0.15) thresholds, so it does not generate a
 * false-positive contrast issue when the actual score is unknown.
 */
export const DEFAULT_CONTRAST_SCORE = 0.6;

/**
 * Threshold for the shoulder symmetry ratio below which the frame is classified
 * as a side view. If (closer_shoulder / farther_shoulder) < this value the
 * person is substantially turned, suggesting a lateral pose.
 */
const SIDE_VIEW_ASYMMETRY_THRESHOLD = 0.35;

// ---- Internal helpers ----

/**
 * Returns true when the landmark at `key` is present in the map AND its
 * visibility score (when provided) is at or above VISIBILITY_THRESHOLD.
 * When visibility is absent (e.g., landmarks from a non-MediaPipe source),
 * presence alone is treated as visible (fail-open).
 */
function isVisible(lm: LandmarkMap, key: LandmarkKey): boolean {
  const pt = lm[key];
  if (!pt) return false;
  // When visibility is absent, treat the landmark as visible (fail-open).
  if (pt.visibility === undefined) return true;
  return pt.visibility >= VISIBILITY_THRESHOLD;
}

/**
 * Builds a BodyLandmarkAssessment from a raw LandmarkMap.
 * averageVisibility is computed over all landmarks that carry a visibility score.
 * When no landmarks carry a score, averageVisibility is 0 (conservative).
 */
function buildLandmarkAssessment(lm: LandmarkMap): BodyLandmarkAssessment {
  // All landmark keys we need for averageVisibility (MediaPipe Pose 33-point set)
  const ALL_VISIBILITY_KEYS: LandmarkKey[] = [
    'nose',
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle',
  ];

  const visScores: number[] = [];
  for (const k of ALL_VISIBILITY_KEYS) {
    const pt = lm[k];
    if (pt && pt.visibility !== undefined) {
      visScores.push(pt.visibility);
    }
  }
  const averageVisibility =
    visScores.length > 0
      ? visScores.reduce((a, b) => a + b, 0) / visScores.length
      : 0;

  return {
    noseVisible: isVisible(lm, 'nose'),
    leftShoulderVisible: isVisible(lm, 'left_shoulder'),
    rightShoulderVisible: isVisible(lm, 'right_shoulder'),
    leftHipVisible: isVisible(lm, 'left_hip'),
    rightHipVisible: isVisible(lm, 'right_hip'),
    leftAnkleVisible: isVisible(lm, 'left_ankle'),
    rightAnkleVisible: isVisible(lm, 'right_ankle'),
    averageVisibility,
  };
}

/**
 * Returns true when at least PERSON_DETECTED_MIN_ANCHORS key landmark anchors
 * are present in the map.
 */
function detectPerson(lm: LandmarkMap): boolean {
  const KEY_ANCHORS: LandmarkKey[] = [
    'nose',
    'left_shoulder', 'right_shoulder',
    'left_hip', 'right_hip',
    'left_ankle', 'right_ankle',
  ];
  const visibleCount = KEY_ANCHORS.filter((k) => isVisible(lm, k)).length;
  return visibleCount >= PERSON_DETECTED_MIN_ANCHORS;
}

/**
 * Estimates device tilt in degrees from the shoulder line.
 * Returns 0 when no shoulder data is available (fail-open: no false tilt alarm).
 * Falls back to the hip line when both shoulders are missing.
 *
 * The tilt is the angle between the shoulder line and the horizontal axis.
 * 0 = camera level; 90 = camera sideways.
 */
function estimateTiltDeg(lm: LandmarkMap): number {
  function lineAngle(ax: number, ay: number, bx: number, by: number): number {
    const dy = Math.abs(ay - by);
    const dx = Math.abs(ax - bx);
    if (dx === 0 && dy === 0) return 0;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  const ls = lm['left_shoulder'];
  const rs = lm['right_shoulder'];
  if (ls && rs) {
    return lineAngle(ls.x, ls.y, rs.x, rs.y);
  }

  // Fallback: hip line
  const lh = lm['left_hip'];
  const rh = lm['right_hip'];
  if (lh && rh) {
    return lineAngle(lh.x, lh.y, rh.x, rh.y);
  }

  return 0; // Cannot determine; assume level (fail-open)
}

/**
 * Estimates the PoseId from the landmark geometry in the image.
 * Returns null when insufficient landmarks are present to classify.
 *
 * Heuristic:
 * - If both shoulders are visible and roughly symmetric around the image
 *   horizontal center, the person is facing front or back.
 *   - Nose visible -> front; nose absent/invisible -> back.
 * - If one shoulder is much closer to center than the other (asymmetry ratio
 *   below SIDE_VIEW_ASYMMETRY_THRESHOLD), the person is in a lateral pose.
 *   - Which shoulder is more central determines left vs right.
 *
 * When the heuristic is inconclusive, `requestedPose` is returned (trust the
 * user instruction; fail-open for RULE 9).
 */
function estimateDetectedPose(
  lm: LandmarkMap,
  imageWidth: number,
  requestedPose: PoseId,
): PoseId | null {
  const ls = lm['left_shoulder'];
  const rs = lm['right_shoulder'];

  // Cannot classify without at least one shoulder
  if (!ls && !rs) return null;

  // If only one shoulder is visible, assume lateral (side) view
  if (!ls && rs) {
    // Only right shoulder visible -> likely right side profile
    return 'right';
  }
  if (ls && !rs) {
    // Only left shoulder visible -> likely left side profile
    return 'left';
  }

  // Both shoulders visible - check symmetry
  // Normalize x to [0, 1] to handle both pixel and normalized coordinates
  const maxCoord = Math.max(ls!.x, rs!.x);
  const norm = (v: number) => (maxCoord > 2 ? v / imageWidth : v);
  const lsNorm = norm(ls!.x);
  const rsNorm = norm(rs!.x);
  const center = 0.5;

  const leftDistFromCenter = Math.abs(lsNorm - center);
  const rightDistFromCenter = Math.abs(rsNorm - center);
  const larger = Math.max(leftDistFromCenter, rightDistFromCenter);
  const smaller = Math.min(leftDistFromCenter, rightDistFromCenter);

  // Avoid division by zero
  if (larger < 0.02) {
    // Both shoulders very close to center - cannot classify, trust requested pose
    return requestedPose;
  }

  const asymmetryRatio = smaller / larger;
  if (asymmetryRatio < SIDE_VIEW_ASYMMETRY_THRESHOLD) {
    // One shoulder is much closer to center - lateral pose
    if (leftDistFromCenter < rightDistFromCenter) {
      // Left shoulder closer to center -> person turned right (right lateral)
      return 'right';
    } else {
      // Right shoulder closer to center -> person turned left (left lateral)
      return 'left';
    }
  }

  // Roughly symmetric -> front or back
  const nose = lm['nose'];
  const noseVis =
    nose !== undefined && (nose.visibility === undefined || nose.visibility >= VISIBILITY_THRESHOLD);

  return noseVis ? 'front' : 'back';
}

// ---- Public API ----

/**
 * Maps a PoseSilhouette to a CaptureQualityInput for assessCaptureQuality.
 *
 * This is the adapter between the T9 in-memory CV pipeline and the T13 quality
 * assessor. All fields are estimated from the landmark data in the silhouette.
 *
 * Fail-open behavior:
 * - Missing landmark -> conservative default (no false alarm).
 * - Zero qualityScore on the silhouette -> DEFAULT_CONTRAST_SCORE (0.6) used.
 * - Unknown orientation -> `requestedPose` trusted (no false orientation mismatch).
 *
 * RULE 9: this function only maps inputs. It never fabricates or suppresses
 * a measurement value. The quality assessor receives the mapped inputs and
 * reports issues; the caller decides how to handle failed views.
 *
 * @param sil - PoseSilhouette from processSilhouette (T9 in-memory pipeline).
 * @param requestedPose - The pose the user was asked to assume.
 * @param contrastScore - Optional external contrast estimate [0,1]; overrides
 *   the qualityScore-based default when provided.
 */
export function silhouetteToQualityInput(
  sil: PoseSilhouette,
  requestedPose: PoseId,
  contrastScore?: number,
): CaptureQualityInput {
  const lm = sil.landmarks;
  const landmarks = buildLandmarkAssessment(lm);
  const personDetected = detectPerson(lm);
  const tiltDeg = estimateTiltDeg(lm);

  // Estimate detected pose only when a person is present; otherwise null
  // prevents a false orientation-mismatch issue.
  const detectedPose = personDetected
    ? estimateDetectedPose(lm, sil.imageWidth, requestedPose)
    : null;

  // Contrast score: use the provided value, then fall back to qualityScore
  // (which is already in [0,1] from scanQualityAssessor), then the safe default.
  const effectiveContrast =
    contrastScore !== undefined
      ? contrastScore
      : sil.qualityScore > 0
        ? sil.qualityScore
        : DEFAULT_CONTRAST_SCORE;

  return {
    requestedPose,
    detectedPose,
    personDetected,
    landmarks,
    tiltDeg,
    contrastScore: effectiveContrast,
  };
}

// ---- Retake prompt helper ----

/**
 * Produces a single, user-facing retake-prompt string from a list of issue
 * strings produced by assessCaptureQuality.
 *
 * Priority order: blocking issues are addressed first (they have the greatest
 * measurement impact). Only the highest-priority issue drives the primary prompt.
 * Soft issues generate a supplementary note appended after a space.
 *
 * Returns an empty string when the issues list is empty (no retake needed).
 *
 * The resulting string is suitable for display in a UI retake prompt or toast.
 * It is intentionally concise (one actionable sentence) and does not include
 * raw issue text from assessCaptureQuality.
 */
export function retakePromptForIssues(issues: string[]): string {
  if (issues.length === 0) return '';

  // Helper: check if any issue contains a substring (case-insensitive)
  const has = (sub: string) =>
    issues.some((i) => i.toLowerCase().includes(sub.toLowerCase()));

  // --- Blocking issues (priority order) ---

  if (has('no person detected')) {
    return 'Step into the frame so your full body is clearly visible from head to feet.';
  }

  if (has('full body not in frame')) {
    const frameIssue = issues.find((i) => i.includes('full body not in frame')) ?? '';
    const missingParts: string[] = [];
    if (frameIssue.includes('head')) missingParts.push('head');
    if (frameIssue.includes('shoulders')) missingParts.push('shoulders');
    if (frameIssue.includes('hips')) missingParts.push('hips');
    if (frameIssue.includes('ankles') || frameIssue.includes('feet')) missingParts.push('feet');

    if (missingParts.length === 1 && missingParts[0] === 'feet') {
      return 'Step back so your feet are fully visible. The camera must capture you from head to feet.';
    }
    if (missingParts.length === 1 && missingParts[0] === 'head') {
      return 'Step back so your head is fully visible. The camera must capture you from head to feet.';
    }
    const partText = missingParts.join(' and ') || 'parts of your body';
    return `Step back - your ${partText} ${missingParts.length === 1 ? 'is' : 'are'} cut off. Full body from head to feet must be in frame.`;
  }

  if (has('orientation does not match')) {
    const orientIssue = issues.find((i) => i.includes('orientation does not match')) ?? '';
    // Extract the requested pose from the issue string.
    // Format: "orientation does not match requested view (requested front, detected left)"
    // Match the "(requested <pose>" segment inside the parentheses.
    const requestedMatch = /\(requested (\w+)/.exec(orientIssue);
    const requested = requestedMatch ? requestedMatch[1] : 'the correct direction';
    return `Turn to face ${requested} view - the camera detected a different orientation.`;
  }

  if (has('device tilt too high')) {
    const tiltIssue = issues.find((i) => i.includes('device tilt too high')) ?? '';
    const degMatch = /(\d+\.?\d*) degrees/.exec(tiltIssue);
    const deg = degMatch ? `${parseFloat(degMatch[1]).toFixed(0)} degrees` : 'significantly';
    return `Hold the camera level - it is tilted ${deg} from vertical. Prop it on a surface or tripod.`;
  }

  if (has('low contrast (image is too dark or overexposed)')) {
    return 'Move to better lighting. The photo is too dark or overexposed for accurate measurements.';
  }

  // --- Soft issues only (all remaining) ---

  if (has('slight device tilt')) {
    const tiltIssue = issues.find((i) => i.includes('slight device tilt')) ?? '';
    const degMatch = /(\d+\.?\d*) degrees/.exec(tiltIssue);
    const degStr = degMatch
      ? ` (${parseFloat(degMatch[1]).toFixed(0)} degrees)`
      : '';
    if (issues.length === 1) {
      return `The camera has a slight tilt${degStr}. Straightening it will improve accuracy.`;
    }
  }

  if (has('low contrast') && !has('too dark')) {
    if (issues.length === 1) {
      return 'Better lighting will improve measurement accuracy.';
    }
  }

  if (has('low landmark visibility')) {
    if (issues.length === 1) {
      return 'Move further from the camera so your full body is clearly visible.';
    }
  }

  // Fallback for multiple soft issues or unrecognised patterns
  return 'Retake this photo for best accuracy - step back, improve lighting, and hold the camera level.';
}

// ---- Per-view quality summary ----

/** Quality assessment result for a single view. */
export interface ViewQualityResult {
  poseId: PoseId;
  score: number;
  issues: string[];
  pass: boolean;
  /** User-readable retake prompt; empty when pass is true. */
  retakePrompt: string;
}

/**
 * Returns a human-friendly label for the pose (used in retake prompts and UI badges).
 */
export function poseLabelShort(poseId: PoseId): string {
  const LABELS: Record<PoseId, string> = {
    front: 'Front',
    back: 'Back',
    left: 'Left side',
    right: 'Right side',
  };
  return LABELS[poseId];
}

/**
 * Tilt threshold above which the level indicator should show a warning.
 * Mirrors TILT_WARN_DEG from captureQuality.ts (exported for UI consumption).
 */
export const UI_TILT_WARN_DEG = TILT_WARN_DEG;
