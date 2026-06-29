// Measurement extraction engine: converts pose silhouettes into 18+
// anthropometric measurements using landmark-driven widths, Ramanujan
// ellipse circumference prediction, and composition formulas.

import { widthAtY } from './silhouetteProcessor';
import { predictCircumference, wrapAsMeasured, type Region } from './circumferencePredictor';
import {
  averageDepths,
  lrAsymmetryScore,
  lrCorroborationScore,
  fbCorroborationScore,
  aggregateLrCorroboration,
  aggregateFbCorroboration,
  aggregateLrAsymmetry,
} from './accuracy/corroboration';
import type {
  BiologicalSex,
  CorroborationSignals,
  ExtractedMeasurements,
  MeasuredValue,
  PoseSilhouette,
} from './types';

export interface ExtractionInputs {
  silhouettes: PoseSilhouette[];
  sex: BiologicalSex;
  heightCm: number;
}

export function extractMeasurements({ silhouettes, sex, heightCm }: ExtractionInputs): ExtractedMeasurements {
  const front = silhouettes.find((s) => s.poseId === 'front') ?? null;
  const back  = silhouettes.find((s) => s.poseId === 'back')  ?? null;
  const left  = silhouettes.find((s) => s.poseId === 'left')  ?? null;
  const right = silhouettes.find((s) => s.poseId === 'right') ?? null;
  // Task 6: `side = left ?? right` removed - depths are now averaged per level
  // (see leftDepths / rightDepths / sideDepths below).

  if (!front) {
    throw new Error('Front silhouette required for measurement extraction');
  }

  // Scale guard: front is required; side views are optional boosters.
  const scale = front.scaleCmPerPx ?? (left?.scaleCmPerPx ?? (right?.scaleCmPerPx ?? null));
  if (!scale) {
    throw new Error('Unable to compute pixel-to-cm scale. Verify user height and landmark detection.');
  }

  // Derive characteristic Y positions in FRONT pose
  const yNeck   = midY(front.landmarks.nose?.y, midOfShoulders(front)?.y);
  const yShoulder = midOfShoulders(front)?.y ?? null;
  const yHip    = midOfHips(front)?.y ?? null;
  const yChest  = yShoulder !== null && yHip !== null ? yShoulder + (yHip - yShoulder) * 0.30 : null;
  const yWaistNavel = yShoulder !== null && yHip !== null ? yShoulder + (yHip - yShoulder) * 0.70 : null;
  const yBicepL = midY(front.landmarks.left_shoulder?.y, front.landmarks.left_elbow?.y);
  const yBicepR = midY(front.landmarks.right_shoulder?.y, front.landmarks.right_elbow?.y);
  const yForearmL = midY(front.landmarks.left_elbow?.y, front.landmarks.left_wrist?.y);
  const yForearmR = midY(front.landmarks.right_elbow?.y, front.landmarks.right_wrist?.y);
  const yThighL = midY(front.landmarks.left_hip?.y, front.landmarks.left_knee?.y);
  const yThighR = midY(front.landmarks.right_hip?.y, front.landmarks.right_knee?.y);
  const yCalfL  = midY(front.landmarks.left_knee?.y, front.landmarks.left_ankle?.y);
  const yCalfR  = midY(front.landmarks.right_knee?.y, front.landmarks.right_ankle?.y);

  // Find natural waist: narrowest horizontal width between shoulder and hip
  const yWaistNatural = findNarrowestY(front, yShoulder, yHip);

  // Sample widths (pixels → cm)
  const w = (s: PoseSilhouette | null, y: number | null): number | null => {
    if (!s || y === null) return null;
    const px = widthAtY(s, y, 5);
    if (px === null || s.scaleCmPerPx === null) return null;
    return px * s.scaleCmPerPx;
  };

  const frontWidths = {
    neck: w(front, yNeck),
    shoulder: shoulderWidthCm(front),
    chest: w(front, yChest),
    waistNatural: w(front, yWaistNatural),
    waistNavel: w(front, yWaistNavel),
    hip: w(front, yHip),
    bicepL: w(front, yBicepL),
    bicepR: w(front, yBicepR),
    forearmL: w(front, yForearmL),
    forearmR: w(front, yForearmR),
    thighL: w(front, yThighL),
    thighR: w(front, yThighR),
    calfL: w(front, yCalfL),
    calfR: w(front, yCalfR),
  };

  // Task 6: Per-level depths from each side silhouette (cm, using that view's own scale).
  // Assumption: Y-coordinates from front landmarks are transferable to left/right views
  // because the 4-photo session uses consistent camera height and framing.
  const leftDepths = left
    ? {
        neck:         w(left, yNeck),
        chest:        w(left, yChest),
        waistNatural: w(left, yWaistNatural),
        waistNavel:   w(left, yWaistNavel),
        hip:          w(left, yHip),
        bicep:        w(left, yBicepL ?? yBicepR),
        thigh:        w(left, yThighL ?? yThighR),
        calf:         w(left, yCalfL ?? yCalfR),
      }
    : null;

  const rightDepths = right
    ? {
        neck:         w(right, yNeck),
        chest:        w(right, yChest),
        waistNatural: w(right, yWaistNatural),
        waistNavel:   w(right, yWaistNavel),
        hip:          w(right, yHip),
        bicep:        w(right, yBicepL ?? yBicepR),
        thigh:        w(right, yThighL ?? yThighR),
        calf:         w(right, yCalfL ?? yCalfR),
      }
    : null;

  // Task 6: L/R averaged depths (replaces single `side = left ?? right`).
  // averageDepths is null-safe: if one side is absent the other is used;
  // if both are absent the depth is null (UNKNOWN - RULE 9, never 0).
  const ld = leftDepths;
  const rd = rightDepths;
  const sideDepths = (left !== null || right !== null)
    ? {
        neck:         averageDepths(ld?.neck         ?? null, rd?.neck         ?? null),
        chest:        averageDepths(ld?.chest        ?? null, rd?.chest        ?? null),
        waistNatural: averageDepths(ld?.waistNatural ?? null, rd?.waistNatural ?? null),
        waistNavel:   averageDepths(ld?.waistNavel   ?? null, rd?.waistNavel   ?? null),
        hip:          averageDepths(ld?.hip          ?? null, rd?.hip          ?? null),
        bicep:        averageDepths(ld?.bicep        ?? null, rd?.bicep        ?? null),
        thigh:        averageDepths(ld?.thigh        ?? null, rd?.thigh        ?? null),
        calf:         averageDepths(ld?.calf         ?? null, rd?.calf         ?? null),
      }
    : null;

  // Task 6: Back-view widths at key torso levels for front-back corroboration
  // and glute/hip contour refinement. Same Y-coordinate assumption applies.
  const backWidths = back !== null
    ? {
        chest:        w(back, yChest),
        waistNatural: w(back, yWaistNatural),
        waistNavel:   w(back, yWaistNavel),
        hip:          w(back, yHip),
      }
    : null;

  // Task 6: Glute/hip contour refinement using the back view.
  // The back silhouette often captures the posterior hip contour (glutes) that
  // can differ from the front silhouette reading. When both views are present,
  // the max of the two provides a less-biased hip width estimate (front-only
  // tends to underestimate when the subject tilts slightly forward).
  // RULE 9: if front hip is null, falls through to null (no fabrication).
  const backHipWidth: number | null = backWidths?.hip ?? null;
  const refinedHipWidth: number | null =
    frontWidths.hip !== null && backHipWidth !== null
      ? Math.max(frontWidths.hip, backHipWidth)
      : frontWidths.hip;

  // Build circumferences
  const circ = (frontWidth: number | null, sideDepth: number | undefined | null, region: Region): MeasuredValue => {
    if (frontWidth === null) return missing();
    const pred = predictCircumference({
      frontWidthCm: frontWidth,
      sideDepthCm: sideDepth ?? undefined,
      region,
      sex,
    });
    return wrapAsMeasured(pred);
  };

  const neck          = circ(frontWidths.neck,         sideDepths?.neck,         'neck');
  const shoulder      = circ(frontWidths.shoulder,     undefined,                 'shoulder');
  const chest         = circ(frontWidths.chest,        sideDepths?.chest,         'chest');
  const waistNatural  = circ(frontWidths.waistNatural, sideDepths?.waistNatural,  'waist_natural');
  const waistNavel    = circ(frontWidths.waistNavel,   sideDepths?.waistNavel,    'waist_navel');
  // Hip uses refinedHipWidth (back-view adjusted) when the back silhouette is available.
  const hip           = circ(refinedHipWidth,          sideDepths?.hip,           'hip');
  const bicepR        = circ(frontWidths.bicepR,       sideDepths?.bicep,         'bicep');
  const bicepL        = circ(frontWidths.bicepL,       sideDepths?.bicep,         'bicep');
  const forearmR      = circ(frontWidths.forearmR,     undefined,                 'forearm');
  const forearmL      = circ(frontWidths.forearmL,     undefined,                 'forearm');
  const thighR        = circ(frontWidths.thighR,       sideDepths?.thigh,         'thigh');
  const thighL        = circ(frontWidths.thighL,       sideDepths?.thigh,         'thigh');
  const calfR         = circ(frontWidths.calfR,        sideDepths?.calf,          'calf');
  const calfL         = circ(frontWidths.calfL,        sideDepths?.calf,          'calf');

  // Lengths
  const inseamCm = inseamLengthCm(front);
  const torsoLengthCm = torsoCm(front);

  // Derived ratios (only when both values are known positive numbers).
  // When either input is null (UNKNOWN), the ratio is unavailable -> sentinel 0.
  const ratio = (a: number | null, b: number | null): number =>
    (a !== null && b !== null && a > 0 && b > 0) ? Math.round((a / b) * 100) / 100 : 0;

  const waistToHipRatio    = ratio(waistNatural.cm, hip.cm);
  const waistToHeightRatio = ratio(waistNatural.cm, heightCm);
  const shoulderToWaistRatio = ratio(shoulder.cm, waistNatural.cm);

  // Task 6: Compute per-level corroboration signals for future confidence wiring.
  // These map to ConfidenceInputs.lrCorroboration and .fbCorroboration in
  // confidenceModel.ts. Full per-field confidence threading is a later task.
  const lrLevelKeys = [
    'neck', 'chest', 'waistNatural', 'waistNavel', 'hip', 'bicep', 'thigh', 'calf',
  ] as const;
  type LrKey = (typeof lrLevelKeys)[number];

  const lrCorScores = lrLevelKeys.map((k: LrKey) =>
    lrCorroborationScore(ld?.[k] ?? null, rd?.[k] ?? null)
  );
  const asymScores = lrLevelKeys.map((k: LrKey) =>
    lrAsymmetryScore(ld?.[k] ?? null, rd?.[k] ?? null)
  );
  const fbCorScores = [
    fbCorroborationScore(frontWidths.chest,        backWidths?.chest        ?? null),
    fbCorroborationScore(frontWidths.waistNatural, backWidths?.waistNatural ?? null),
    fbCorroborationScore(frontWidths.waistNavel,   backWidths?.waistNavel   ?? null),
    fbCorroborationScore(frontWidths.hip,          backWidths?.hip          ?? null),
  ];

  const corroborationSignals: CorroborationSignals = {
    lrCorroboration: aggregateLrCorroboration(lrCorScores),
    fbCorroboration: aggregateFbCorroboration(fbCorScores),
    lrAsymmetry:     aggregateLrAsymmetry(asymScores),
  };

  return {
    neckCirc: neck,
    shoulderCirc: shoulder,
    chestCirc: chest,
    waistNaturalCirc: waistNatural,
    waistNavelCirc: waistNavel,
    hipCirc: hip,
    rightBicepCirc: bicepR,
    leftBicepCirc: bicepL,
    rightForearmCirc: forearmR,
    leftForearmCirc: forearmL,
    rightThighCirc: thighR,
    leftThighCirc: thighL,
    rightCalfCirc: calfR,
    leftCalfCirc: calfL,
    waistToHipRatio,
    waistToHeightRatio,
    shoulderToWaistRatio,
    inseamCm: round1(inseamCm),
    torsoLengthCm: round1(torsoLengthCm),
    corroborationSignals,
  };
}

function missing(): MeasuredValue {
  // RULE 9 / Section 17.1: a measurement that cannot be determined is UNKNOWN.
  // cm:null is the honest signal; cm:0 is FORBIDDEN (0 is a fabricated value).
  return { cm: null, uncertaintyCm: 0, confidence: 'low', source: 'missing' };
}

function midY(a: number | undefined, b: number | undefined): number | null {
  if (a === undefined || b === undefined) return null;
  return (a + b) / 2;
}

function midOfShoulders(s: PoseSilhouette): { x: number; y: number } | null {
  const l = s.landmarks.left_shoulder;
  const r = s.landmarks.right_shoulder;
  if (!l || !r) return null;
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
}

function midOfHips(s: PoseSilhouette): { x: number; y: number } | null {
  const l = s.landmarks.left_hip;
  const r = s.landmarks.right_hip;
  if (!l || !r) return null;
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
}

function shoulderWidthCm(front: PoseSilhouette): number | null {
  const l = front.landmarks.left_shoulder;
  const r = front.landmarks.right_shoulder;
  if (!l || !r || front.scaleCmPerPx === null) return null;
  const px = Math.abs(r.x - l.x);
  return px * front.scaleCmPerPx;
}

function findNarrowestY(front: PoseSilhouette, shoulderY: number | null, hipY: number | null): number | null {
  if (shoulderY === null || hipY === null) return null;
  const yStart = shoulderY + (hipY - shoulderY) * 0.35;
  const yEnd   = shoulderY + (hipY - shoulderY) * 0.85;
  let minWidth = Infinity;
  let bestY: number | null = null;
  for (let y = yStart; y <= yEnd; y += 2) {
    const w = widthAtY(front, y, 4);
    if (w !== null && w < minWidth) {
      minWidth = w;
      bestY = y;
    }
  }
  return bestY;
}

function inseamLengthCm(front: PoseSilhouette): number {
  const lHip = front.landmarks.left_hip;
  const lAnkle = front.landmarks.left_ankle;
  const rHip = front.landmarks.right_hip;
  const rAnkle = front.landmarks.right_ankle;
  const scale = front.scaleCmPerPx;
  if (!scale) return 0;
  const samples: number[] = [];
  if (lHip && lAnkle) samples.push(Math.hypot(lAnkle.x - lHip.x, lAnkle.y - lHip.y) * scale);
  if (rHip && rAnkle) samples.push(Math.hypot(rAnkle.x - rHip.x, rAnkle.y - rHip.y) * scale);
  return samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
}

function torsoCm(front: PoseSilhouette): number {
  const sh = midOfShoulders(front);
  const hip = midOfHips(front);
  if (!sh || !hip || !front.scaleCmPerPx) return 0;
  return Math.hypot(hip.x - sh.x, hip.y - sh.y) * front.scaleCmPerPx;
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
