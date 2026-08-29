import type { Landmark, QaCode, QaMode, QaResult } from './types';
import type { PoseId } from './poses';
import { LM, vis, distX, midpointX } from './landmarks';
import {
  VISIBILITY_MIN,
  SHOULDER_VIS_MIN,
  HEAD_Y_MIN,
  FEET_Y_MAX,
  BODY_HEIGHT_MIN,
  BODY_HEIGHT_MAX,
  HIP_CENTER_MIN,
  HIP_CENTER_MAX,
  ARMS_OUT_MIN,
  FRONT_SHOULDER_WIDTH_MIN,
  NOSE_CENTER_TOL,
  SIDE_SHOULDER_WIDTH_MAX,
  SIDE_VIS_ASYMMETRY_MIN,
  BACK_NOSE_EAR_DIFF_MIN,
  BLUR_VARIANCE_MIN,
} from './qaThresholds';

// Section 8 user-facing strings. Every QaCode maps to exactly one string here.
const MESSAGES: Record<QaCode, string> = {
  PASS: '',
  NO_BODY: 'Step onto the mark',
  FEET_CUT: 'Feet cut off. Step back.',
  HEAD_CUT: 'Head cut off. Move the phone farther away.',
  OFF_MARK: 'Get on the mark',
  ARMS_IN: 'Arms too close to your body',
  SQUARE_UP: 'Square up to the camera',
  TURN_MORE: 'Turn more. I still see your chest.',
  BLURRY: 'Too blurry. Hold still.',
};

export function messageForCode(code: QaCode): string {
  return MESSAGES[code];
}

function toResult(code: QaCode, mode: QaMode): QaResult {
  return { pass: code === 'PASS', code, message: messageForCode(code), mode };
}

// Every-pose gates, in the order the spec (Section 11) evaluates them.
// First failing gate wins; null means all gates passed.
function checkEveryPoseGates(lms: Landmark[], blurScore: number): QaCode | null {
  const nose = lms[LM.nose];
  if (!nose) return 'NO_BODY';

  const lAnkle = lms[LM.lAnkle];
  const rAnkle = lms[LM.rAnkle];
  const lHeel = lms[LM.lHeel];
  const rHeel = lms[LM.rHeel];
  if (!lAnkle || !rAnkle || !lHeel || !rHeel) return 'FEET_CUT';

  // Feet checked before head: visibility floor or the ankle/heel sitting in
  // the bottom edge band both read as feet cut off frame.
  const feetVis = Math.min(vis(lms, LM.lAnkle), vis(lms, LM.rAnkle), vis(lms, LM.lHeel), vis(lms, LM.rHeel));
  const maxFeetY = Math.max(lAnkle.y, rAnkle.y, lHeel.y, rHeel.y);
  if (feetVis <= VISIBILITY_MIN || maxFeetY >= FEET_Y_MAX) return 'FEET_CUT';

  // Head: visibility floor or the nose sitting in the top edge band both
  // read as head cut off frame.
  const noseVis = vis(lms, LM.nose);
  if (noseVis <= VISIBILITY_MIN || nose.y <= HEAD_Y_MIN) return 'HEAD_CUT';

  // Body height: nose-to-ankle span as a fraction of frame height.
  // Too small = too far away (OFF_MARK, "Get on the mark").
  // Too large = too close, the head is likely about to leave frame, so this
  // direction reuses HEAD_CUT per spec ("above HEAD_CUT").
  const minAnkleY = Math.min(lAnkle.y, rAnkle.y);
  const bodyHeight = minAnkleY - nose.y;
  if (bodyHeight < BODY_HEIGHT_MIN) return 'OFF_MARK';
  if (bodyHeight > BODY_HEIGHT_MAX) return 'HEAD_CUT';

  // Hip center: horizontal on-the-mark window.
  const lHip = lms[LM.lHip];
  const rHip = lms[LM.rHip];
  if (!lHip || !rHip) return 'OFF_MARK';
  const hipCenterX = midpointX(lHip, rHip);
  if (hipCenterX < HIP_CENTER_MIN || hipCenterX > HIP_CENTER_MAX) return 'OFF_MARK';

  // Arms: at least one wrist must clear its same-side hip by ARMS_OUT_MIN.
  const lWrist = lms[LM.lWrist];
  const rWrist = lms[LM.rWrist];
  const lArmOut = lWrist ? distX(lWrist, lHip) > ARMS_OUT_MIN : false;
  const rArmOut = rWrist ? distX(rWrist, rHip) > ARMS_OUT_MIN : false;
  if (!lArmOut && !rArmOut) return 'ARMS_IN';

  // Blur: still-only check.
  if (blurScore < BLUR_VARIANCE_MIN) return 'BLURRY';

  return null;
}

function checkFrontFacing(lms: Landmark[]): QaCode | null {
  const lSh = lms[LM.lShoulder];
  const rSh = lms[LM.rShoulder];
  if (!lSh || !rSh) return 'SQUARE_UP';
  if (vis(lms, LM.lShoulder) <= SHOULDER_VIS_MIN || vis(lms, LM.rShoulder) <= SHOULDER_VIS_MIN) return 'SQUARE_UP';

  const shoulderWidth = distX(rSh, lSh);
  if (shoulderWidth <= FRONT_SHOULDER_WIDTH_MIN) return 'SQUARE_UP';

  const nose = lms[LM.nose];
  const shoulderMidX = midpointX(lSh, rSh);
  if (Math.abs(nose.x - shoulderMidX) > NOSE_CENTER_TOL * shoulderWidth) return 'SQUARE_UP';

  const earsVisible = vis(lms, LM.lEar) > VISIBILITY_MIN && vis(lms, LM.rEar) > VISIBILITY_MIN;
  const eyesVisible = vis(lms, LM.lEye) > VISIBILITY_MIN && vis(lms, LM.rEye) > VISIBILITY_MIN;
  if (!earsVisible && !eyesVisible) return 'SQUARE_UP';

  return null;
}

// Shared RIGHT/LEFT side-on facing check. LEFT is the mirror of RIGHT with
// near/far landmark indices swapped (near = the side facing the camera).
function checkSideFacing(
  lms: Landmark[],
  nearShoulder: number,
  farShoulder: number,
  nearHip: number,
  nearAnkle: number,
  nearEar: number,
  farEar: number,
): QaCode | null {
  if (vis(lms, nearShoulder) <= SHOULDER_VIS_MIN || vis(lms, nearHip) <= SHOULDER_VIS_MIN || vis(lms, nearAnkle) <= SHOULDER_VIS_MIN) {
    return 'TURN_MORE';
  }

  const nearVis = vis(lms, nearShoulder);
  const farVis = vis(lms, farShoulder);
  if (nearVis - farVis < SIDE_VIS_ASYMMETRY_MIN) return 'TURN_MORE';

  const nearShLm = lms[nearShoulder];
  const farShLm = lms[farShoulder];
  if (!nearShLm || !farShLm) return 'TURN_MORE';
  const shoulderWidth = distX(nearShLm, farShLm);
  if (shoulderWidth >= SIDE_SHOULDER_WIDTH_MAX) return 'TURN_MORE';

  if (vis(lms, nearEar) <= vis(lms, farEar)) return 'TURN_MORE';

  return null;
}

function checkBackFacing(lms: Landmark[]): QaCode | null {
  const lSh = lms[LM.lShoulder];
  const rSh = lms[LM.rShoulder];
  if (!lSh || !rSh) return 'TURN_MORE';
  if (vis(lms, LM.lShoulder) <= SHOULDER_VIS_MIN || vis(lms, LM.rShoulder) <= SHOULDER_VIS_MIN) return 'TURN_MORE';

  const shoulderWidth = distX(rSh, lSh);
  if (shoulderWidth <= FRONT_SHOULDER_WIDTH_MIN) return 'TURN_MORE';

  const noseVis = vis(lms, LM.nose);
  const meanEarVis = (vis(lms, LM.lEar) + vis(lms, LM.rEar)) / 2;
  if (meanEarVis - noseVis < BACK_NOSE_EAR_DIFF_MIN) return 'TURN_MORE';

  return null;
}

function checkFacing(pose: PoseId, lms: Landmark[]): QaCode | null {
  switch (pose) {
    case 'front':
      return checkFrontFacing(lms);
    case 'right':
      return checkSideFacing(lms, LM.rShoulder, LM.lShoulder, LM.rHip, LM.rAnkle, LM.rEar, LM.lEar);
    case 'back':
      return checkBackFacing(lms);
    case 'left':
      return checkSideFacing(lms, LM.lShoulder, LM.rShoulder, LM.lHip, LM.lAnkle, LM.lEar, LM.rEar);
    default:
      return null;
  }
}

export function evaluatePose(input: {
  landmarks: Landmark[] | null;
  pose: PoseId;
  frameWidth: number;
  frameHeight: number;
  blurScore: number;
}): QaResult {
  const { landmarks, pose, blurScore } = input;
  if (!landmarks || landmarks.length === 0) return toResult('NO_BODY', 'landmarker');

  const gateCode = checkEveryPoseGates(landmarks, blurScore);
  if (gateCode) return toResult(gateCode, 'landmarker');

  const facingCode = checkFacing(pose, landmarks);
  if (facingCode) return toResult(facingCode, 'landmarker');

  return toResult('PASS', 'landmarker');
}

// Weak QA fallback when the pose landmarker is unavailable. Never checks
// facing. Local thresholds below are weak-mode only (no landmark geometry
// involved) and are not part of the qaThresholds.ts calibration surface;
// starting values, calibrated Phase 5 like the rest of the module.
const WEAK_LUMINANCE_VARIANCE_MIN = 50; // frame must show some contrast to read as non-empty
const WEAK_EXPOSURE_MIN = 0.15; // below this the frame reads as underexposed
const WEAK_EXPOSURE_MAX = 0.85; // above this the frame reads as overexposed

export function evaluateWeakFrame(input: { luminanceVariance: number; exposure: number; blurScore: number }): QaResult {
  const { luminanceVariance, exposure, blurScore } = input;

  if (luminanceVariance <= WEAK_LUMINANCE_VARIANCE_MIN) return toResult('NO_BODY', 'weak');
  if (exposure < WEAK_EXPOSURE_MIN || exposure > WEAK_EXPOSURE_MAX) return toResult('NO_BODY', 'weak');
  if (blurScore < BLUR_VARIANCE_MIN) return toResult('BLURRY', 'weak');

  return toResult('PASS', 'weak');
}
