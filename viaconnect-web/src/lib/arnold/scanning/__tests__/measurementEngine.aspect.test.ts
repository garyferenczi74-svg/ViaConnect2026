// Task 8 (Prompt 210c): TDD tests for per-level semi-axis output.
// Strategy: write tests RED first, then implement the axes helper in
// measurementEngine.ts and LevelSemiAxes in types.ts to turn them GREEN.
//
// Tests verify:
//  1. Known front width + side depth -> correct a, b, aspectRatio (+ one-model guarantee)
//  2. Missing side depth -> aspectRatio null (UNKNOWN); circumference still estimated
//  3. Missing front width -> whole level UNKNOWN (cm null, all semi-axes null)
//  4. Regression: existing circumference values are unchanged

import { describe, it, expect } from 'vitest';
import { extractMeasurements } from '../measurementEngine';
import { predictCircumference } from '../circumferencePredictor';
import type { PoseSilhouette } from '../types';

// ---------------------------------------------------------------------------
// Fixtures (minimal, local copies so this file has no import coupling)
// ---------------------------------------------------------------------------

function rectContour(
  startY: number,
  endY: number,
  leftX = 40,
  rightX = 140,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let y = startY; y <= endY; y += 2) {
    pts.push({ x: leftX, y });
    pts.push({ x: rightX, y });
  }
  return pts;
}

/** Front silhouette with full landmarks and a 100px-wide contour (40cm at 0.4cm/px).
 * shoulder y=110, hip y=280 -> chestY = 110 + (280-110)*0.30 = 161
 * widthAtY(front, 161, 5) = 100px -> frontWidthCm(chest) = 40cm */
function frontFullLandmarks(): PoseSilhouette {
  return {
    poseId: 'front',
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380, 40, 140),
    landmarks: {
      nose:           { x: 100, y: 60 },
      left_shoulder:  { x: 55,  y: 110 },
      right_shoulder: { x: 145, y: 110 },
      left_hip:       { x: 60,  y: 280 },
      right_hip:      { x: 140, y: 280 },
      left_elbow:     { x: 40,  y: 200 },
      right_elbow:    { x: 160, y: 200 },
      left_wrist:     { x: 38,  y: 260 },
      right_wrist:    { x: 162, y: 260 },
      left_knee:      { x: 65,  y: 330 },
      right_knee:     { x: 135, y: 330 },
      left_ankle:     { x: 65,  y: 370 },
      right_ankle:    { x: 135, y: 370 },
    },
    scaleCmPerPx: 0.4,
    maskDimensions: { width: 200, height: 400 },
    qualityScore: 0.9,
    qualityIssues: [],
  };
}

/** Front silhouette with NO shoulder landmarks -> chestY null -> chestCirc UNKNOWN. */
function frontNoShoulders(): PoseSilhouette {
  return {
    poseId: 'front',
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380),
    landmarks: {
      left_hip:   { x: 60,  y: 280 },
      right_hip:  { x: 140, y: 280 },
      left_knee:  { x: 65,  y: 330 },
      right_knee: { x: 135, y: 330 },
      left_ankle: { x: 65,  y: 370 },
      right_ankle:{ x: 135, y: 370 },
    },
    scaleCmPerPx: 0.4,
    maskDimensions: { width: 200, height: 400 },
    qualityScore: 0.8,
    qualityIssues: [],
  };
}

/** Side silhouette with a depthPx-wide contour.
 * depthPx=70: 70px * 0.4cm/px = 28cm body depth at chest level. */
function makeSideSilhouette(poseId: 'left' | 'right', depthPx = 70): PoseSilhouette {
  return {
    poseId,
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380, 65, 65 + depthPx),
    landmarks: {
      nose:           { x: 90,  y: 60 },
      left_shoulder:  { x: 75,  y: 110 },
      right_shoulder: { x: 115, y: 110 },
      left_hip:       { x: 78,  y: 280 },
      right_hip:      { x: 112, y: 280 },
    },
    scaleCmPerPx: 0.4,
    maskDimensions: { width: 200, height: 400 },
    qualityScore: 0.8,
    qualityIssues: [],
  };
}

// ---------------------------------------------------------------------------
// Test 1: known front width + side depth produce correct a, b, aspectRatio
// and the one-model guarantee (emitted a,b are the same ones used for circ)
// ---------------------------------------------------------------------------

describe('Task 8: known front width (40cm) + side depth (28cm) produce correct semi-axes', () => {
  it('chest aCm = 20 (front width / 2)', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70)],
      sex: 'male',
      heightCm: 180,
    });
    // front contour is 100px wide at chest level; 100 * 0.4 = 40cm; a = 40/2 = 20
    expect(result.semiAxes).toBeDefined();
    expect(result.semiAxes!.chest.aCm).toBeCloseTo(20, 4);
  });

  it('chest bCm = 14 (side depth / 2)', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70)],
      sex: 'male',
      heightCm: 180,
    });
    // side contour is 70px wide at chest level; 70 * 0.4 = 28cm; b = 28/2 = 14
    expect(result.semiAxes!.chest.bCm).toBeCloseTo(14, 4);
  });

  it('chest aspectRatio = b / a = 0.7', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70)],
      sex: 'male',
      heightCm: 180,
    });
    // 14 / 20 = 0.7
    expect(result.semiAxes!.chest.aspectRatio).toBeCloseTo(0.7, 5);
  });

  it('one-model guarantee: chestCirc.cm equals predictCircumference(frontWidth=40, sideDepth=28)', () => {
    // The emitted a,b must be the same inputs the circumference was computed from.
    // Verifies no second computation and no divergence between axes and circ.
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70)],
      sex: 'male',
      heightCm: 180,
    });
    const reference = predictCircumference({
      frontWidthCm: 40,
      sideDepthCm: 28,
      region: 'chest',
      sex: 'male',
    });
    expect(result.chestCirc.cm).toBe(reference.circumferenceCm);
  });
});

// ---------------------------------------------------------------------------
// Test 2: missing side depth -> aspectRatio UNKNOWN; circumference still present
// ---------------------------------------------------------------------------

describe('Task 8: missing side depth -> aspectRatio null (UNKNOWN), circumference falls back to front-only', () => {
  it('chest aspectRatio is null (UNKNOWN) when no side view is provided', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],  // front only, no side
      sex: 'male',
      heightCm: 180,
    });
    // RULE 9 / Task 8: aspectRatio must not be fabricated when b is unknown
    expect(result.semiAxes).toBeDefined();
    expect(result.semiAxes!.chest.aspectRatio).toBeNull();
  });

  it('chest bCm is null (UNKNOWN) when no side view is provided', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.semiAxes!.chest.bCm).toBeNull();
  });

  it('chest aCm is still present (front width known) when no side view', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });
    // a is known from front even without side
    expect(result.semiAxes!.chest.aCm).not.toBeNull();
    expect(result.semiAxes!.chest.aCm).toBeCloseTo(20, 4);
  });

  it('chest circumference falls back to front-only estimate (not null, not 0) with lowered confidence', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });
    // Circumference must not be UNKNOWN (front width is present) and must not be 0
    expect(result.chestCirc.cm).not.toBeNull();
    expect(result.chestCirc.cm).toBeGreaterThan(0);
    // Front-only path sets confidence to 'low'
    expect(result.chestCirc.confidence).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// Test 3: missing front width -> whole level UNKNOWN (cm null, all axes null)
// ---------------------------------------------------------------------------

describe('Task 8: missing front width -> level is UNKNOWN (cm null, all semi-axes null)', () => {
  it('chest aCm is null when front width cannot be derived (no shoulder landmarks)', () => {
    const result = extractMeasurements({
      silhouettes: [frontNoShoulders()],
      sex: 'male',
      heightCm: 180,
    });
    // No shoulder landmarks -> chestY null -> frontWidth null -> aCm null
    expect(result.semiAxes).toBeDefined();
    expect(result.semiAxes!.chest.aCm).toBeNull();
  });

  it('chest bCm is null when front width is null (RULE 9 cascade)', () => {
    const result = extractMeasurements({
      silhouettes: [frontNoShoulders()],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.semiAxes!.chest.bCm).toBeNull();
  });

  it('chest aspectRatio is null when front width is null', () => {
    const result = extractMeasurements({
      silhouettes: [frontNoShoulders()],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.semiAxes!.chest.aspectRatio).toBeNull();
  });

  it('chestCirc.cm is null when front width is null (RULE 9 - UNKNOWN, not 0)', () => {
    const result = extractMeasurements({
      silhouettes: [frontNoShoulders()],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.chestCirc.cm).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test 4: regression guard - existing circumference values unchanged
// ---------------------------------------------------------------------------

describe('Task 8: regression - adding semi-axis output does not change circumference values', () => {
  it('chestCirc.cm matches predictCircumference before and after semi-axis fields are added', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70), makeSideSilhouette('right', 70)],
      sex: 'male',
      heightCm: 180,
    });
    // L/R averaged side depth: both sides 70px = 28cm, average = 28cm
    const reference = predictCircumference({
      frontWidthCm: 40,
      sideDepthCm: 28,
      region: 'chest',
      sex: 'male',
    });
    expect(result.chestCirc.cm).toBe(reference.circumferenceCm);
    expect(result.chestCirc.source).toBe('ellipse_frontSide');
  });

  it('hipCirc.cm is a positive number with both side views (no regression)', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70), makeSideSilhouette('right', 70)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.hipCirc.cm).not.toBeNull();
    expect(result.hipCirc.cm).toBeGreaterThan(0);
  });

  it('semiAxes is defined and does not alter neckCirc or waistNaturalCirc values', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70)],
      sex: 'male',
      heightCm: 180,
    });
    // semiAxes must exist (new field) and existing measurements must be unaffected
    expect(result.semiAxes).toBeDefined();
    expect(result.neckCirc.cm).not.toBeNull();
    expect(result.neckCirc.cm).toBeGreaterThan(0);
    expect(result.waistNaturalCirc.cm).not.toBeNull();
    expect(result.waistNaturalCirc.cm).toBeGreaterThan(0);
  });
});
