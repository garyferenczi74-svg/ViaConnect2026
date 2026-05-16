// Body Scanner: Quality scoring functions (§4.2, §9).
//
// Pure functions; no DOM, no React, no MediaPipe, no OpenCV imports.
// All inputs are already-extracted: RGB image data, BlazePose keypoints,
// silhouette mask areas, edge density, device pitch.
//
// Thresholds are imported from scan-constants.ts (no magic numbers here).

import {
  LIGHTING_THRESHOLDS,
  POSE_TOLERANCE_DEG,
  CLOTHING_TIGHTNESS_RANGE,
  CAMERA_LEVEL_TOLERANCE_DEG,
  BACKGROUND_CLUTTER_ADVISORY_MAX,
} from '@/lib/body-tracker/scan-constants';
import type { QualityScores } from '@/lib/body-tracker/scan-types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Clamp a value to [0, 100] and round to nearest integer. */
function clampScore(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Linear interpolation from a "perfect" center to 0 at the edges.
 * Returns 0-100 where the score is 100 at `ideal` and drops linearly to 0
 * at `edgeLow` and `edgeHigh`. Outside those bounds, score is 0.
 */
function linearScoreFromCenter(
  value: number,
  edgeLow: number,
  edgeHigh: number,
  ideal: number,
): number {
  if (value < edgeLow || value > edgeHigh) return 0;
  if (value <= ideal) {
    const range = ideal - edgeLow;
    if (range <= 0) return 100;
    return clampScore(((value - edgeLow) / range) * 100);
  } else {
    const range = edgeHigh - ideal;
    if (range <= 0) return 100;
    return clampScore(((edgeHigh - value) / range) * 100);
  }
}

// ---------------------------------------------------------------------------
// scoreLighting
// ---------------------------------------------------------------------------

/**
 * Compute lighting score from RGB histogram per §9.1.
 *
 * Mean luminance ideal = 140 (midpoint of [60, 220]).
 * Std-dev ideal = 52 (midpoint of [25, 80]).
 *
 * Score is the minimum of the mean-luminance sub-score and the std-dev
 * sub-score so that BOTH must be in-band to achieve a high score.
 *
 * Pass requires mean in [60, 220] AND std-dev in [25, 80].
 */
export function scoreLighting(rgbImage: ImageData): {
  score: number;
  pass: boolean;
  meanLuminance: number;
  stdDev: number;
} {
  const data = rgbImage.data;
  const pixelCount = rgbImage.width * rgbImage.height;

  if (pixelCount === 0) {
    return { score: 0, pass: false, meanLuminance: 0, stdDev: 0 };
  }

  // Compute per-pixel luminance using the ITU-R BT.601 luma coefficients.
  let sumLuminance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sumLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  const meanLuminance = sumLuminance / pixelCount;

  let sumSqDiff = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const diff = lum - meanLuminance;
    sumSqDiff += diff * diff;
  }
  const stdDev = Math.sqrt(sumSqDiff / pixelCount);

  const meanIdeal = (LIGHTING_THRESHOLDS.meanLuminanceMin + LIGHTING_THRESHOLDS.meanLuminanceMax) / 2; // 140
  const stdIdeal  = (LIGHTING_THRESHOLDS.stdDevMin + LIGHTING_THRESHOLDS.stdDevMax) / 2;              // 52.5

  const meanScore = linearScoreFromCenter(
    meanLuminance,
    LIGHTING_THRESHOLDS.meanLuminanceMin,
    LIGHTING_THRESHOLDS.meanLuminanceMax,
    meanIdeal,
  );
  const stdScore = linearScoreFromCenter(
    stdDev,
    LIGHTING_THRESHOLDS.stdDevMin,
    LIGHTING_THRESHOLDS.stdDevMax,
    stdIdeal,
  );

  const score = Math.min(meanScore, stdScore);

  const pass =
    meanLuminance >= LIGHTING_THRESHOLDS.meanLuminanceMin &&
    meanLuminance <= LIGHTING_THRESHOLDS.meanLuminanceMax &&
    stdDev >= LIGHTING_THRESHOLDS.stdDevMin &&
    stdDev <= LIGHTING_THRESHOLDS.stdDevMax;

  return { score, pass, meanLuminance, stdDev };
}

// ---------------------------------------------------------------------------
// scorePose
// ---------------------------------------------------------------------------

/**
 * Compute pose score from BlazePose 33 keypoints vs canonical A-pose per §9.2.
 *
 * This function receives per-joint angle deviations (already computed by the
 * caller from the raw keypoints). The caller is responsible for mapping the
 * BlazePose landmark indices to the A_POSE_TEMPLATE entries and supplying
 * the deviation array.
 *
 * However, since we only receive the raw keypoints array here (not angles),
 * we compute a proxy deviation score from how spread the arms are, using
 * the x-distance between wrist and shoulder landmarks as a proxy for
 * shoulder abduction deviation. For shoulder symmetry we use bilateral
 * keypoints. For the remaining joints (elbows, hips, knees, ankles) we
 * use visibility/confidence-weighted symmetry metrics.
 *
 * Score: 100 at 0 avg deviation, linear to 0 at POSE_TOLERANCE_DEG.average.
 * The max-joint guard: if any single joint exceeds POSE_TOLERANCE_DEG.perJoint,
 * the score is forced to 0.
 *
 * NOTE: For a real deployment the caller should pre-compute joint-angle
 * deviations from the A-pose and pass them directly. The keypoint-to-angle
 * pipeline lives in T7.
 *
 * WARNING: The dual-path API uses keypoints.length >= 33 + JOINT_COUNT (43)
 * as the signal that indices 33-42 carry pre-computed joint angle deviations.
 * If a future MediaPipe model ever produces more than 33 real keypoints, this
 * guard becomes ambiguous and the function would silently misinterpret real
 * coordinates as angle deviations. Before upgrading the upstream pose
 * detector, update the length guard or refactor scorePose to take a separate
 * deviations parameter.
 *
 * BlazePose landmark indices used here:
 *   11: left shoulder, 12: right shoulder
 *   13: left elbow,    14: right elbow
 *   15: left wrist,    16: right wrist
 *   23: left hip,      24: right hip
 *   25: left knee,     26: right knee
 *   27: left ankle,    28: right ankle
 */
export function scorePose(
  keypoints: Array<{ x: number; y: number; z: number; confidence: number }>,
): {
  score: number;
  pass: boolean;
  avgDeviationDeg: number;
  maxJointDeviationDeg: number;
} {
  // Accept an optional pre-computed deviation list appended to the keypoints
  // array beyond index 32. If the caller passes exactly 10 extra elements
  // (one per A_POSE_TEMPLATE entry), use them directly. Otherwise fall back
  // to a geometric proxy based on landmark positions.
  //
  // This "dual-path" API keeps T3 pure while letting T7 supply real angles.

  const JOINT_COUNT = 10; // matches A_POSE_TEMPLATE key count
  let deviationsDeg: number[];

  if (keypoints.length >= 33 + JOINT_COUNT) {
    // T7 caller pre-computed deviations as synthetic keypoints at indices 33+.
    // x field holds the deviation in degrees; y,z,confidence are ignored.
    deviationsDeg = [];
    for (let i = 33; i < 33 + JOINT_COUNT; i++) {
      deviationsDeg.push(Math.abs(keypoints[i].x));
    }
  } else if (keypoints.length >= 29) {
    // Geometric proxy using landmark positions. Compute a rough joint-deviation
    // estimate from bilateral symmetry and expected arm/leg positions.
    deviationsDeg = computeProxyDeviations(keypoints);
  } else {
    // Insufficient keypoints.
    return { score: 0, pass: false, avgDeviationDeg: 999, maxJointDeviationDeg: 999 };
  }

  const avgDeviationDeg =
    deviationsDeg.reduce((s, d) => s + d, 0) / deviationsDeg.length;
  const maxJointDeviationDeg = Math.max(...deviationsDeg);

  // Max-joint guard.
  if (maxJointDeviationDeg > POSE_TOLERANCE_DEG.perJoint) {
    return { score: 0, pass: false, avgDeviationDeg, maxJointDeviationDeg };
  }

  // Linear score from 0 avg deviation (100) to POSE_TOLERANCE_DEG.average (0).
  const rawScore =
    Math.max(0, 1 - avgDeviationDeg / POSE_TOLERANCE_DEG.average) * 100;
  const score = clampScore(rawScore);
  const pass = avgDeviationDeg <= POSE_TOLERANCE_DEG.average;

  return { score, pass, avgDeviationDeg, maxJointDeviationDeg };
}

/**
 * Geometric proxy: derive per-joint angle deviations from BlazePose landmark
 * positions. Returns 10 values (one per A_POSE_TEMPLATE entry) in degrees.
 * This is a best-effort approximation; the T7 wiring replaces it with real
 * angles.
 */
function computeProxyDeviations(
  kp: Array<{ x: number; y: number; z: number; confidence: number }>,
): number[] {
  const get = (i: number) => kp[i] ?? { x: 0, y: 0, z: 0, confidence: 0 };

  const lShoulder = get(11);
  const rShoulder = get(12);
  const lElbow    = get(13);
  const rElbow    = get(14);
  const lWrist    = get(15);
  const rWrist    = get(16);
  const lHip      = get(23);
  const rHip      = get(24);
  const lKnee     = get(25);
  const rKnee     = get(26);
  const lAnkle    = get(27);
  const rAnkle    = get(28);

  // Shoulder abduction: use horizontal distance between shoulder and wrist
  // relative to torso width. In A-pose arms are slightly out (~80 deg abduction).
  // A rough proxy: if wrist is near hip, abduction ~0; if wrist is at shoulder
  // height and far out, abduction ~90.
  const torsoWidth = Math.abs(rShoulder.x - lShoulder.x) || 1;
  const lArmOut = Math.abs(lWrist.x - lShoulder.x) / torsoWidth;
  const rArmOut = Math.abs(rWrist.x - rShoulder.x) / torsoWidth;
  const lShoulderDev = Math.abs(Math.atan(lArmOut) * (180 / Math.PI) - 80); // target 80 deg
  const rShoulderDev = Math.abs(Math.atan(rArmOut) * (180 / Math.PI) - 80);

  // Elbow flexion: in A-pose elbows should be ~180 deg (straight). Use the
  // angle at the elbow from shoulder->elbow->wrist vectors.
  const lElbowDev  = jointAngleDeviation(lShoulder, lElbow, lWrist, 180);
  const rElbowDev  = jointAngleDeviation(rShoulder, rElbow, rWrist, 180);

  // Hip abduction: use horizontal distance between hip and knee relative to
  // pelvis width. Target ~15 deg.
  const pelvisWidth = Math.abs(rHip.x - lHip.x) || 1;
  const lLegOut = Math.abs(lKnee.x - lHip.x) / pelvisWidth;
  const rLegOut = Math.abs(rKnee.x - rHip.x) / pelvisWidth;
  const lHipDev = Math.abs(Math.atan(lLegOut) * (180 / Math.PI) - 15);
  const rHipDev = Math.abs(Math.atan(rLegOut) * (180 / Math.PI) - 15);

  // Knee flexion: target 180 deg.
  const lKneeDev   = jointAngleDeviation(lHip, lKnee, lAnkle, 180);
  const rKneeDev   = jointAngleDeviation(rHip, rKnee, rAnkle, 180);

  // Ankle dorsiflexion: target 90 deg. Use hip->knee->ankle angle as proxy.
  const lAnkleDev  = jointAngleDeviation(lKnee, lAnkle, { x: lAnkle.x, y: lAnkle.y + 1, z: 0, confidence: 1 }, 90);
  const rAnkleDev  = jointAngleDeviation(rKnee, rAnkle, { x: rAnkle.x, y: rAnkle.y + 1, z: 0, confidence: 1 }, 90);

  return [
    lShoulderDev,
    rShoulderDev,
    lElbowDev,
    rElbowDev,
    lHipDev,
    rHipDev,
    lKneeDev,
    rKneeDev,
    lAnkleDev,
    rAnkleDev,
  ];
}

/** Angle at the middle joint (a -> b -> c) deviation from a target in degrees. */
function jointAngleDeviation(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  targetDeg: number,
): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot  = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleDeg = Math.acos(cosAngle) * (180 / Math.PI);
  return Math.abs(angleDeg - targetDeg);
}

// ---------------------------------------------------------------------------
// scoreClothingTightness
// ---------------------------------------------------------------------------

/**
 * Compute clothing tightness score per §9.4.
 *
 * Boundary interpretation: the spec states ratio in [1.02, 1.18] is acceptable.
 * "Above 1.18 implies baggy clothing" means ratio > 1.18 fails; ratio AT 1.18
 * is the highest passing value (closed upper bound). Similarly ratio AT 1.02 is
 * the lowest passing value (closed lower bound). Ratio exactly at a boundary
 * scores 0 (the edge of the linear ramp). Values strictly inside the band score
 * proportionally higher, peaking at 100 when ratio == 1.10 (midpoint).
 */
export function scoreClothingTightness(
  silhouetteMaskAreaPx: number,
  expectedBodyAreaPx: number,
): {
  score: number;
  pass: boolean;
  ratio: number;
} {
  if (expectedBodyAreaPx <= 0) {
    return { score: 0, pass: false, ratio: 0 };
  }

  const ratio = silhouetteMaskAreaPx / expectedBodyAreaPx;

  // Midpoint of [1.02, 1.18] is 1.10.
  const ideal = (CLOTHING_TIGHTNESS_RANGE.min + CLOTHING_TIGHTNESS_RANGE.max) / 2;

  const score = linearScoreFromCenter(
    ratio,
    CLOTHING_TIGHTNESS_RANGE.min,
    CLOTHING_TIGHTNESS_RANGE.max,
    ideal,
  );

  // Pass: closed interval [1.02, 1.18]. Fail if strictly outside bounds.
  const pass =
    ratio >= CLOTHING_TIGHTNESS_RANGE.min && ratio <= CLOTHING_TIGHTNESS_RANGE.max;

  return { score, pass, ratio };
}

// ---------------------------------------------------------------------------
// scoreBackgroundClutter
// ---------------------------------------------------------------------------

/**
 * Compute background clutter score from edge density outside the person
 * segmentation mask per §9.7.
 *
 * Score is 100 at edge density 0, drops linearly to 0 at
 * BACKGROUND_CLUTTER_ADVISORY_MAX (70). Values above 70 score 0.
 *
 * Closed-interval boundary semantics: at exactly the advisory max the score
 * is 0 but advisoryPass remains true, matching every other scorer in this
 * module.
 *
 * Background clutter is ADVISORY only: a failing score does NOT block capture.
 * aggregateQualityScores routes the message to advisoryNotes, not blockingIssues.
 */
export function scoreBackgroundClutter(edgeDensityOutsidePerson: number): {
  score: number;
  advisoryPass: boolean;
} {
  const clamped = Math.max(0, edgeDensityOutsidePerson);
  const rawScore =
    Math.max(0, 1 - clamped / BACKGROUND_CLUTTER_ADVISORY_MAX) * 100;
  const score = clampScore(rawScore);
  // Advisory pass: closed-interval boundary semantics: at exactly the advisory
  // max the score is 0 but advisoryPass remains true, matching every other
  // scorer in this module.
  const advisoryPass = edgeDensityOutsidePerson <= BACKGROUND_CLUTTER_ADVISORY_MAX;
  return { score, advisoryPass };
}

// ---------------------------------------------------------------------------
// scoreCameraLevel
// ---------------------------------------------------------------------------

/**
 * Compute camera level score from device IMU pitch per §4.2.
 *
 * Score is 100 at pitch == 0, drops linearly to 0 at +/- CAMERA_LEVEL_TOLERANCE_DEG (3 deg).
 * Pass if |pitch| <= CAMERA_LEVEL_TOLERANCE_DEG.
 */
export function scoreCameraLevel(devicePitchDeg: number): {
  score: number;
  pass: boolean;
  pitchDeg: number;
} {
  const absPitch = Math.abs(devicePitchDeg);
  const rawScore =
    Math.max(0, 1 - absPitch / CAMERA_LEVEL_TOLERANCE_DEG) * 100;
  const score = clampScore(rawScore);
  const pass = absPitch <= CAMERA_LEVEL_TOLERANCE_DEG;
  return { score, pass, pitchDeg: devicePitchDeg };
}

// ---------------------------------------------------------------------------
// scoreFrameCoverage
// ---------------------------------------------------------------------------

/**
 * Compute full-body-in-frame score per §4.2.
 *
 * Pass requires the head crown (minimum y among head keypoints) to be inside
 * the top edge and the feet (maximum y) to be inside the bottom edge.
 *
 * Score is 100 when head and feet are 10% inside the frame margins.
 * Score drops to 0 as either head or feet approach or exceed the frame edge.
 *
 * BlazePose head keypoints: 0 (nose), 1 (left eye inner), 2 (left eye),
 * 3 (left eye outer), 4 (right eye inner), 5 (right eye), 6 (right eye outer),
 * 7 (left ear), 8 (right ear), 9 (mouth left), 10 (mouth right).
 * Head crown approximation: use the minimum y value among indices 0-10.
 *
 * Foot keypoints: 29 (left foot index), 30 (right foot index),
 * 31 (left heel), 32 (right heel).
 * Feet y: use the maximum y value among indices 27-32 (ankles + feet).
 */
export function scoreFrameCoverage(
  keypoints: Array<{ x: number; y: number; z: number; confidence: number }>,
  frameWidth: number,
  frameHeight: number,
): {
  score: number;
  pass: boolean;
  headCrownY: number;
  feetY: number;
} {
  if (keypoints.length < 29) {
    return { score: 0, pass: false, headCrownY: -1, feetY: -1 };
  }

  // Head crown: minimum y among landmarks 0-10 (head region).
  let headCrownY = Infinity;
  for (let i = 0; i <= 10 && i < keypoints.length; i++) {
    if (keypoints[i].confidence > 0) {
      headCrownY = Math.min(headCrownY, keypoints[i].y);
    }
  }
  if (headCrownY === Infinity) headCrownY = keypoints[0].y;

  // Feet: maximum y among landmarks 27-32 (ankles and feet).
  let feetY = -Infinity;
  for (let i = 27; i <= 32 && i < keypoints.length; i++) {
    if (keypoints[i].confidence > 0) {
      feetY = Math.max(feetY, keypoints[i].y);
    }
  }
  if (feetY === -Infinity) feetY = keypoints[keypoints.length - 1].y;

  // Target margins: 10% inside the frame on top and bottom.
  const topMargin    = frameHeight * 0.1;
  const bottomMargin = frameHeight * 0.9;

  // Score component for head (should be >= topMargin from top, i.e., y >= topMargin in
  // screen coords where y=0 is top).
  // Head crown being at y=0 means it's at the very edge (score 0).
  // Head crown at topMargin (10% in) means score 100.
  const headScore = clampScore((headCrownY / topMargin) * 100);

  // Score component for feet (should be <= bottomMargin, i.e., y <= bottomMargin).
  // Feet at frameHeight (bottom edge) means score 0.
  // Feet at bottomMargin (10% from bottom) means score 100.
  const feetScore = clampScore(
    ((frameHeight - feetY) / (frameHeight - bottomMargin)) * 100,
  );

  const score = Math.min(headScore, feetScore);

  // Pass: head crown visible above bottom and feet visible below top (full body in frame).
  // Specifically: headCrownY >= 0 (head not above the top edge) AND feetY <= frameHeight (feet not below the bottom edge).
  const pass = headCrownY >= 0 && feetY <= frameHeight;

  return { score, pass, headCrownY, feetY };
}

// ---------------------------------------------------------------------------
// aggregateQualityScores
// ---------------------------------------------------------------------------

/**
 * Aggregate all six scores into a single QualityScores object.
 *
 * Blocking checks (ALL must pass for overallPass): lighting, pose, clothing,
 * cameraLevel, frameCoverage.
 *
 * Advisory only (does NOT flip overallPass): bgClutter.
 */
export function aggregateQualityScores(inputs: {
  rgbImage: ImageData;
  keypoints: Array<{ x: number; y: number; z: number; confidence: number }>;
  silhouetteMaskAreaPx: number;
  expectedBodyAreaPx: number;
  edgeDensityOutsidePerson: number;
  devicePitchDeg: number;
  frameWidth: number;
  frameHeight: number;
}): QualityScores {
  const lightingResult = scoreLighting(inputs.rgbImage);
  const poseResult     = scorePose(inputs.keypoints);
  const clothingResult = scoreClothingTightness(
    inputs.silhouetteMaskAreaPx,
    inputs.expectedBodyAreaPx,
  );
  const bgClutterResult = scoreBackgroundClutter(inputs.edgeDensityOutsidePerson);
  const cameraResult    = scoreCameraLevel(inputs.devicePitchDeg);
  const frameResult     = scoreFrameCoverage(
    inputs.keypoints,
    inputs.frameWidth,
    inputs.frameHeight,
  );

  const blockingIssues: string[] = [];
  const advisoryNotes: string[]  = [];

  if (!lightingResult.pass) {
    blockingIssues.push('Lighting out of acceptable range');
  }
  if (!poseResult.pass) {
    blockingIssues.push('Pose deviation too high');
  }
  if (!clothingResult.pass) {
    blockingIssues.push('Clothing fit outside acceptable range');
  }
  if (!cameraResult.pass) {
    blockingIssues.push('Camera not level');
  }
  if (!frameResult.pass) {
    blockingIssues.push('Body not fully in frame');
  }
  // Advisory only: bgClutter goes to advisoryNotes, NOT blockingIssues.
  // Does not affect overallPass.
  if (!bgClutterResult.advisoryPass) {
    advisoryNotes.push('High background clutter detected');
  }

  const overallPass =
    lightingResult.pass &&
    poseResult.pass &&
    clothingResult.pass &&
    cameraResult.pass &&
    frameResult.pass;
  // bgClutter is intentionally excluded from overallPass.

  return {
    lighting:       lightingResult.score,
    pose:           poseResult.score,
    clothing:       clothingResult.score,
    bgClutter:      bgClutterResult.score,
    cameraLevel:    cameraResult.score,
    frameCoverage:  frameResult.score,
    overallPass,
    blockingIssues,
    advisoryNotes,
  };
}
