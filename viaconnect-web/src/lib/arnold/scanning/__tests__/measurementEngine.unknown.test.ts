// Task 3 (Prompt 210c) - TDD tests for honest UNKNOWN measurements.
// RULE 9 / Section 17.1: a measurement that cannot be determined MUST be null,
// never cm:0.  Write tests first (RED against old cm:0 code), then fix
// missing() to return cm:null (GREEN).

import { describe, it, expect } from 'vitest';
import { extractMeasurements } from '../measurementEngine';
import type { PoseSilhouette } from '../types';

// ---------------------------------------------------------------------------
// Helpers: build minimal PoseSilhouette fixtures
// ---------------------------------------------------------------------------

/** Build a dense rectangular contour (left edge x=40, right edge x=140,
 *  rows every 2px from y=startY to y=endY).  widthAtY with tolerance=5
 *  will find ~5 points per side at any y in [startY+5 .. endY-5].        */
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

/** A front silhouette with NO shoulder landmarks so chest (which depends on
 *  shoulder Y for its vertical position) cannot be placed => UNKNOWN.     */
function frontNoShoulders(): PoseSilhouette {
  return {
    poseId: 'front',
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380),
    landmarks: {
      // Hips present (so hipCirc can be estimated) but NO shoulders
      left_hip:  { x: 60, y: 280 },
      right_hip: { x: 140, y: 280 },
      // Ankle / knee for limb measurements
      left_knee:   { x: 65, y: 330 },
      right_knee:  { x: 135, y: 330 },
      left_ankle:  { x: 65, y: 370 },
      right_ankle: { x: 135, y: 370 },
    },
    scaleCmPerPx: 0.4,   // 40cm body width at 100px => reasonable
    maskDimensions: { width: 200, height: 400 },
    qualityScore: 0.8,
    qualityIssues: [],
  };
}

/** A front silhouette with BOTH shoulder and hip landmarks plus a full
 *  rectangular contour.  chest Y can be derived => measured value.       */
function frontFullLandmarks(): PoseSilhouette {
  return {
    poseId: 'front',
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380),
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

// ---------------------------------------------------------------------------
// Test 1: missing chest landmark => chestCirc.cm === null  (RULE 9)
// ---------------------------------------------------------------------------

describe('RULE 9: missing measurement is UNKNOWN (cm null), never cm:0', () => {
  it('front silhouette without shoulder landmarks yields chestCirc.cm === null (not 0)', () => {
    const result = extractMeasurements({
      silhouettes: [frontNoShoulders()],
      sex: 'male',
      heightCm: 180,
    });

    // RULE 9: an undeterminable circumference MUST be null, never fabricated as 0
    expect(result.chestCirc.cm).toBeNull();
    expect(result.chestCirc.source).toBe('missing');
    expect(result.chestCirc.confidence).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// Test 2: ratio that depends on a null circumference is the "unavailable"
// sentinel (0), NOT a fabricated number derived from cm:0.
// ---------------------------------------------------------------------------

describe('ratio with null circumference inputs returns the unavailable sentinel (0)', () => {
  it('waistToHipRatio is 0 (unavailable) when waistNaturalCirc.cm is null', () => {
    // No shoulder => waistNatural is also null (waist Y depends on shoulder Y)
    const result = extractMeasurements({
      silhouettes: [frontNoShoulders()],
      sex: 'male',
      heightCm: 180,
    });

    // waistNatural.cm should be null because it depends on shoulderY
    expect(result.waistNaturalCirc.cm).toBeNull();

    // The ratio must NOT be a fabricated numeric estimate; it must be 0 (unavailable)
    expect(result.waistToHipRatio).toBe(0);
    // Document the convention: 0 is the sentinel for "ratio unavailable" in
    // ExtractedMeasurements (waistToHipRatio: number).  A null input must
    // produce exactly this sentinel, not a non-zero fabricated value.
  });
});

// ---------------------------------------------------------------------------
// Test 3: present (measured) value is still a positive number (no regression)
// ---------------------------------------------------------------------------

describe('present measurement retains its numeric cm (no regression)', () => {
  it('chestCirc.cm is a positive number when both shoulder and hip landmarks are present', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });

    expect(result.chestCirc.cm).not.toBeNull();
    expect(typeof result.chestCirc.cm).toBe('number');
    expect(result.chestCirc.cm).toBeGreaterThan(0);
  });

  it('hipCirc.cm is a positive number when hip landmarks are present', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });

    expect(result.hipCirc.cm).not.toBeNull();
    expect(typeof result.hipCirc.cm).toBe('number');
    expect(result.hipCirc.cm).toBeGreaterThan(0);
  });
});
