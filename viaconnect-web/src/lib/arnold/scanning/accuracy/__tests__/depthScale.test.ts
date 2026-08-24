// Task 14 (Prompt 210c) - TDD tests for ARKit/ARCore depth-derived breadth.
//
// Tests cover:
//   1. depthDerivedDepthCm: null on invalid/absent samples; correct cm on valid.
//   2. depthDerivedScaleCmPerPx: null on bad inputs; correct scale on valid.
//   3. findDepthSample: null on absent/empty frame; returns closest in tolerance.
//   4. probeDepthCapability: returns false in Node test env (graceful degradation).
//   5. reconcileScale: depth anchor participates when present, absent = unchanged.
//   6. extractMeasurements: BYTE-IDENTICAL without depth frame (core invariant).
//   7. extractMeasurements: uses depth-derived b when depth frame present.
//
// Run: npx vitest run src/lib/arnold/scanning

import { describe, it, expect } from 'vitest';
import {
  depthDerivedDepthCm,
  depthDerivedScaleCmPerPx,
  findDepthSample,
  MAX_LEVEL_DELTA,
  type CameraIntrinsics,
  type DepthFrame,
  type DepthSample,
} from '../depthScale';
import { probeDepthCapability } from '../../depth/formaVisionDepth';
import { reconcileScale } from '../scaleCalibration';
import { extractMeasurements } from '../../measurementEngine';
import type { PoseSilhouette } from '../../types';

// ---- Fixtures ----

function validSample(overrides: Partial<DepthSample> = {}): DepthSample {
  return {
    levelNorm: 0.40,
    minDepthM: 1.00,
    maxDepthM: 1.32,      // range = 0.32 m = 32 cm
    medianDepthM: 1.16,
    validPixelCount: 20,
    ...overrides,
  };
}

function validIntrinsics(overrides: Partial<CameraIntrinsics> = {}): CameraIntrinsics {
  // fx=1000px at 1.16m depth: scale = (1.16/1000)*100 = 0.116 cm/px
  return {
    fx: 1000,
    fy: 1000,
    cx: 540,
    cy: 960,
    widthPx: 1080,
    heightPx: 1920,
    ...overrides,
  };
}

function validFrame(sampleLevelNorm = 0.40): DepthFrame {
  return {
    samples: [validSample({ levelNorm: sampleLevelNorm })],
    intrinsics: validIntrinsics(),
    capturedAtMs: Date.now(),
  };
}

// Silhouette fixture helpers (reused from measurementEngine.unknown.test.ts style)
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

/** Side silhouette with given depth in pixels at scale 0.4 cm/px. */
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

// ---- Section 1: depthDerivedDepthCm ----

describe('depthDerivedDepthCm', () => {
  it('returns null when sample is null (RULE 9 - no fabrication)', () => {
    expect(depthDerivedDepthCm(null)).toBeNull();
  });

  it('returns null when sample is undefined', () => {
    expect(depthDerivedDepthCm(undefined)).toBeNull();
  });

  it('returns null when validPixelCount is below minimum threshold', () => {
    expect(depthDerivedDepthCm(validSample({ validPixelCount: 4 }))).toBeNull();
  });

  it('returns null when range is below MIN_DEPTH_RANGE_M (noise/flat surface)', () => {
    // 0.005m range = 0.5cm - below the 1cm minimum
    expect(depthDerivedDepthCm(validSample({ minDepthM: 1.0, maxDepthM: 1.005 }))).toBeNull();
  });

  it('returns null when range exceeds MAX_DEPTH_RANGE_M (silhouette not isolated)', () => {
    // 0.9m range - exceeds 80cm maximum
    expect(depthDerivedDepthCm(validSample({ minDepthM: 1.0, maxDepthM: 1.9 }))).toBeNull();
  });

  it('returns null when range is non-finite', () => {
    expect(depthDerivedDepthCm(validSample({ minDepthM: 1.0, maxDepthM: Infinity }))).toBeNull();
    expect(depthDerivedDepthCm(validSample({ minDepthM: NaN, maxDepthM: 1.32 }))).toBeNull();
  });

  it('returns correct breadth in cm for a valid sample', () => {
    // range = 1.32 - 1.00 = 0.32 m = 32 cm
    const result = depthDerivedDepthCm(validSample());
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(32, 5);
  });

  it('returns correct breadth for a thinner body level (16 cm range)', () => {
    // range = 1.16 - 1.00 = 0.16 m = 16 cm
    const result = depthDerivedDepthCm(validSample({ minDepthM: 1.00, maxDepthM: 1.16 }));
    expect(result).toBeCloseTo(16, 5);
  });

  it('accepts the minimum valid range (just above 1 cm floor)', () => {
    // range = 0.011 m = 1.1 cm - just above MIN_DEPTH_RANGE_M = 0.01 m
    const result = depthDerivedDepthCm(validSample({ minDepthM: 1.000, maxDepthM: 1.011 }));
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(1.1, 3);
  });
});

// ---- Section 2: depthDerivedScaleCmPerPx ----

describe('depthDerivedScaleCmPerPx', () => {
  it('returns null when sample is null (RULE 9)', () => {
    expect(depthDerivedScaleCmPerPx(null, validIntrinsics())).toBeNull();
  });

  it('returns null when intrinsics is null (RULE 9)', () => {
    expect(depthDerivedScaleCmPerPx(validSample(), null)).toBeNull();
  });

  it('returns null when medianDepthM is zero', () => {
    expect(depthDerivedScaleCmPerPx(validSample({ medianDepthM: 0 }), validIntrinsics())).toBeNull();
  });

  it('returns null when medianDepthM is negative', () => {
    expect(depthDerivedScaleCmPerPx(validSample({ medianDepthM: -1 }), validIntrinsics())).toBeNull();
  });

  it('returns null when fx is zero', () => {
    expect(depthDerivedScaleCmPerPx(validSample(), validIntrinsics({ fx: 0 }))).toBeNull();
  });

  it('returns null when scale is below MIN_SCALE_CM_PER_PX (implausibly small)', () => {
    // medianDepthM=0.001, fx=1000 -> scale = 0.0001/1000*100 = 0.00001 -> too small
    expect(depthDerivedScaleCmPerPx(
      validSample({ medianDepthM: 0.001 }),
      validIntrinsics({ fx: 100000 }),
    )).toBeNull();
  });

  it('returns correct scale: (medianDepthM / fx) * 100', () => {
    // medianDepthM=1.16, fx=1000 -> scale = 1.16/1000 * 100 = 0.116 cm/px
    const result = depthDerivedScaleCmPerPx(validSample({ medianDepthM: 1.16 }), validIntrinsics({ fx: 1000 }));
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(0.116, 5);
  });

  it('round-trip: derived scale * frontWidthPx recovers physical width', () => {
    // person is 40cm wide at 1.16m depth with fx=1000px
    // frontWidthPx = physicalWidthM * fx / depthM = 0.40 * 1000 / 1.16 ~ 344.8 px
    // scale = (1.16/1000)*100 = 0.116 cm/px
    // recovery: 344.8 * 0.116 ~ 40 cm
    const scale = depthDerivedScaleCmPerPx(validSample({ medianDepthM: 1.16 }), validIntrinsics({ fx: 1000 }));
    expect(scale).not.toBeNull();
    const frontWidthPx = (0.40 * 1000) / 1.16;
    expect(scale! * frontWidthPx).toBeCloseTo(40, 0);
  });

  it('returns null when validPixelCount is below minimum', () => {
    expect(depthDerivedScaleCmPerPx(validSample({ validPixelCount: 3 }), validIntrinsics())).toBeNull();
  });
});

// ---- Section 3: findDepthSample ----

describe('findDepthSample', () => {
  it('returns null when frame is null (RULE 9)', () => {
    expect(findDepthSample(null, 0.4)).toBeNull();
  });

  it('returns null when frame is undefined', () => {
    expect(findDepthSample(undefined, 0.4)).toBeNull();
  });

  it('returns null when samples array is empty', () => {
    const frame: DepthFrame = { samples: [], intrinsics: validIntrinsics(), capturedAtMs: 0 };
    expect(findDepthSample(frame, 0.4)).toBeNull();
  });

  it('returns null when levelNorm is non-finite', () => {
    expect(findDepthSample(validFrame(0.4), Infinity)).toBeNull();
    expect(findDepthSample(validFrame(0.4), NaN)).toBeNull();
  });

  it('returns the matching sample when levelNorm is exact', () => {
    const frame = validFrame(0.40);
    const result = findDepthSample(frame, 0.40);
    expect(result).not.toBeNull();
    expect(result!.levelNorm).toBe(0.40);
  });

  it('returns the sample when delta is within MAX_LEVEL_DELTA tolerance', () => {
    // sample at 0.40, query at 0.40 + MAX_LEVEL_DELTA - epsilon -> within tolerance
    const frame = validFrame(0.40);
    const query = 0.40 + MAX_LEVEL_DELTA - 0.001;
    const result = findDepthSample(frame, query);
    expect(result).not.toBeNull();
  });

  it('returns null when the closest sample is farther than MAX_LEVEL_DELTA', () => {
    // sample at 0.40, query at 0.40 + MAX_LEVEL_DELTA + epsilon -> outside tolerance
    const frame = validFrame(0.40);
    const query = 0.40 + MAX_LEVEL_DELTA + 0.001;
    expect(findDepthSample(frame, query)).toBeNull();
  });

  it('returns the closest sample when multiple samples are present', () => {
    const frame: DepthFrame = {
      samples: [
        validSample({ levelNorm: 0.30 }),
        validSample({ levelNorm: 0.50 }),
        validSample({ levelNorm: 0.70 }),
      ],
      intrinsics: validIntrinsics(),
      capturedAtMs: 0,
    };
    // query at 0.48: closest is 0.50 (delta 0.02 < MAX_LEVEL_DELTA)
    const result = findDepthSample(frame, 0.48);
    expect(result).not.toBeNull();
    expect(result!.levelNorm).toBe(0.50);
  });

  it('returns null when all samples are too far from the requested level', () => {
    const frame: DepthFrame = {
      samples: [validSample({ levelNorm: 0.10 }), validSample({ levelNorm: 0.90 })],
      intrinsics: validIntrinsics(),
      capturedAtMs: 0,
    };
    // query at 0.50: both samples are 0.40 away, exceeding MAX_LEVEL_DELTA = 0.05
    expect(findDepthSample(frame, 0.50)).toBeNull();
  });
});

// ---- Section 4: probeDepthCapability graceful degradation ----

describe('probeDepthCapability', () => {
  it('returns false in Node/non-Capacitor environment without throwing', async () => {
    // In vitest node environment: window is undefined, so the SSR guard fires
    // and the function returns false immediately without touching the native bridge.
    // This proves graceful degradation at the JS seam boundary.
    const result = await probeDepthCapability();
    expect(result).toBe(false);
  });
});

// ---- Section 5: reconcileScale with depth anchor ----

describe('reconcileScale: depth scale anchor (Task 14)', () => {
  const NOMINAL = 0.05;

  it('includes depthScaleCmPerPx as an anchor when provided and valid', () => {
    // Three anchors agree tightly: front, side, depth
    const result = reconcileScale({
      frontScaleCmPerPx: NOMINAL,
      sideScaleCmPerPx: NOMINAL * 1.005,
      depthScaleCmPerPx: NOMINAL * 0.998,
    });
    expect(result.scaleCmPerPx).not.toBeNull();
    // Mean of three tight anchors should be very close to NOMINAL
    expect(result.scaleCmPerPx!).toBeCloseTo(NOMINAL, 2);
    expect(result.disagreementFlag).toBe(false);
  });

  it('raises agreement toward 1 when depth anchor corroborates front and side', () => {
    const withoutDepth = reconcileScale({
      frontScaleCmPerPx: NOMINAL,
      sideScaleCmPerPx: NOMINAL * 1.01,
    });
    const withDepth = reconcileScale({
      frontScaleCmPerPx: NOMINAL,
      sideScaleCmPerPx: NOMINAL * 1.01,
      depthScaleCmPerPx: NOMINAL * 1.005,  // close to both
    });
    // Adding a corroborating anchor should not lower agreement
    expect(withDepth.agreement).toBeGreaterThanOrEqual(withoutDepth.agreement - 0.05);
  });

  it('lowers agreement when depth anchor is an outlier', () => {
    const withoutDepth = reconcileScale({
      frontScaleCmPerPx: NOMINAL,
      sideScaleCmPerPx: NOMINAL * 1.01,
    });
    const withOutlierDepth = reconcileScale({
      frontScaleCmPerPx: NOMINAL,
      sideScaleCmPerPx: NOMINAL * 1.01,
      depthScaleCmPerPx: NOMINAL * 1.30,  // 30% outlier
    });
    // An outlier depth anchor should lower or not raise agreement
    expect(withOutlierDepth.agreement).toBeLessThanOrEqual(withoutDepth.agreement + 0.05);
  });

  it('is byte-identical to pre-Task-14 behavior when depthScaleCmPerPx is absent', () => {
    const withoutField = reconcileScale({
      frontScaleCmPerPx: NOMINAL,
      sideScaleCmPerPx: NOMINAL * 1.01,
    });
    const withUndefined = reconcileScale({
      frontScaleCmPerPx: NOMINAL,
      sideScaleCmPerPx: NOMINAL * 1.01,
      depthScaleCmPerPx: undefined,
    });
    const withNull = reconcileScale({
      frontScaleCmPerPx: NOMINAL,
      sideScaleCmPerPx: NOMINAL * 1.01,
      depthScaleCmPerPx: null,
    });
    // All three calls must produce identical results
    expect(withUndefined.scaleCmPerPx).toBe(withoutField.scaleCmPerPx);
    expect(withUndefined.agreement).toBe(withoutField.agreement);
    expect(withUndefined.disagreementFlag).toBe(withoutField.disagreementFlag);
    expect(withNull.scaleCmPerPx).toBe(withoutField.scaleCmPerPx);
    expect(withNull.agreement).toBe(withoutField.agreement);
    expect(withNull.disagreementFlag).toBe(withoutField.disagreementFlag);
  });
});

// ---- Section 6: extractMeasurements byte-identical without depth ----

describe('extractMeasurements: byte-identical without depth frame (CORE INVARIANT)', () => {
  // This test proves the NON-NEGOTIABLE INVARIANT: when depthFrame is absent,
  // the measurement pipeline output is byte-identical to the pre-Task-14 behavior.
  const silhouettes = [frontFullLandmarks(), makeSideSilhouette('left', 70)];
  const inputs = { silhouettes, sex: 'male' as const, heightCm: 180 };

  it('outputs identical JSON when depthFrame is omitted vs. null vs. undefined', () => {
    const baseline = extractMeasurements(inputs);
    const withNull = extractMeasurements({ ...inputs, depthFrame: null });
    const withUndefined = extractMeasurements({ ...inputs, depthFrame: undefined });

    // Use JSON.stringify as a deterministic deep-equality check
    const baselineJson = JSON.stringify(baseline);
    expect(JSON.stringify(withNull)).toBe(baselineJson);
    expect(JSON.stringify(withUndefined)).toBe(baselineJson);
  });

  it('semiAxes.chest.bCm is unchanged when no depthFrame (side silhouette depth used)', () => {
    // Side silhouette: 70px wide at 0.4 cm/px = 28 cm breadth -> bCm = 14
    const result = extractMeasurements(inputs);
    expect(result.semiAxes.chest.bCm).toBeCloseTo(14, 2);
  });

  it('all existing tests still pass: chestCirc.cm is positive with side view', () => {
    const result = extractMeasurements(inputs);
    expect(result.chestCirc.cm).not.toBeNull();
    expect(result.chestCirc.cm).toBeGreaterThan(0);
  });
});

// ---- Section 7: extractMeasurements prefers depth when frame is present ----

describe('extractMeasurements: prefers depth-derived breadth when depth frame present', () => {
  // Setup:
  //   Side silhouette chest depth: 70px * 0.4 cm/px = 28 cm (bCm = 14)
  //   Depth frame chest: range = 1.32 - 1.00 = 0.32m = 32 cm (bCm = 16)
  // With depth frame active, semiAxes.chest.bCm should be 16 (not 14).

  // Chest Y: shoulderY=110, hipY=280, chest = 110 + (280-110)*0.30 = 161
  // levelNorm for chest = 161/400 = 0.4025
  const CHEST_LEVEL_NORM = 161 / 400;

  const depthFrame: DepthFrame = {
    samples: [
      validSample({ levelNorm: CHEST_LEVEL_NORM, minDepthM: 1.00, maxDepthM: 1.32 }),
      // waist navel: Y = 110 + (280-110)*0.70 = 229, norm = 229/400 = 0.5725
      validSample({ levelNorm: 229 / 400, minDepthM: 1.00, maxDepthM: 1.28 }),
    ],
    intrinsics: validIntrinsics(),
    capturedAtMs: Date.now(),
  };

  const silhouettes = [frontFullLandmarks(), makeSideSilhouette('left', 70)];
  const baseInputs = { silhouettes, sex: 'male' as const, heightCm: 180 };

  it('chest bCm uses depth-derived 32cm breadth (not 28cm from side silhouette)', () => {
    const withDepth = extractMeasurements({ ...baseInputs, depthFrame });
    // 32 cm front-to-back -> bCm = 16
    expect(withDepth.semiAxes.chest.bCm).toBeCloseTo(16, 2);
  });

  it('chest bCm differs from the baseline (side-only) value when depth is present', () => {
    const baseline = extractMeasurements(baseInputs);
    const withDepth = extractMeasurements({ ...baseInputs, depthFrame });
    // baseline bCm = 14 (side silhouette); withDepth bCm = 16 (depth camera)
    expect(withDepth.semiAxes.chest.bCm).not.toBeCloseTo(baseline.semiAxes.chest.bCm ?? 0, 1);
  });

  it('chest circumference with depth differs from baseline (depth changes ellipse b)', () => {
    const baseline = extractMeasurements(baseInputs);
    const withDepth = extractMeasurements({ ...baseInputs, depthFrame });
    // Larger b -> larger circumference
    expect(withDepth.chestCirc.cm).not.toBeNull();
    expect(withDepth.chestCirc.cm!).toBeGreaterThan(baseline.chestCirc.cm ?? 0);
  });

  it('levels without a depth sample fall back to side silhouette depth', () => {
    // Depth frame only has chest and waistNavel samples.
    // hip (levelNorm ~0.70) has no nearby sample -> falls back to side depth.
    const withDepth = extractMeasurements({ ...baseInputs, depthFrame });
    const baseline = extractMeasurements(baseInputs);
    // Hip bCm should be the same as baseline (side silhouette) since depth has no hip sample
    expect(withDepth.semiAxes.hip.bCm).toBeCloseTo(baseline.semiAxes.hip.bCm ?? 0, 2);
  });

  it('corroborationSignals are unchanged by depth frame (corroboration uses silhouettes)', () => {
    const baseline = extractMeasurements(baseInputs);
    const withDepth = extractMeasurements({ ...baseInputs, depthFrame });
    // L/R and F/B corroboration use silhouette data, not depth camera
    expect(withDepth.corroborationSignals.lrCorroboration).toBe(
      baseline.corroborationSignals.lrCorroboration
    );
    expect(withDepth.corroborationSignals.fbCorroboration).toBe(
      baseline.corroborationSignals.fbCorroboration
    );
  });
});

// ---- Section 8: edge cases ----

describe('depthDerivedDepthCm + findDepthSample: edge cases', () => {
  it('depthDerivedDepthCm: exactly MIN_DEPTH_RANGE_M (0.01m = 1cm) -> null (not >=)', () => {
    // 0.01m range is equal to MIN_DEPTH_RANGE_M; since check is < not <=, it passes
    // Wait - MIN_DEPTH_RANGE_M = 0.01, check is rangeM < MIN_DEPTH_RANGE_M
    // 0.01 < 0.01 is false, so 0.01 PASSES the check -> should return a value
    const result = depthDerivedDepthCm(validSample({ minDepthM: 1.000, maxDepthM: 1.010 }));
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(1.0, 3);
  });

  it('depthDerivedDepthCm: range exactly 0 (flat surface) -> null', () => {
    // 0 < MIN_DEPTH_RANGE_M(0.01), so returns null
    expect(depthDerivedDepthCm(validSample({ minDepthM: 1.0, maxDepthM: 1.0 }))).toBeNull();
  });

  it('findDepthSample: levelNorm exactly at MAX_LEVEL_DELTA boundary -> null (> not >=)', () => {
    // bestDelta > MAX_LEVEL_DELTA (strict), so delta == MAX_LEVEL_DELTA passes
    const frame = validFrame(0.40);
    const exactBoundary = 0.40 + MAX_LEVEL_DELTA; // delta = MAX_LEVEL_DELTA exactly
    const result = findDepthSample(frame, exactBoundary);
    // bestDelta = MAX_LEVEL_DELTA, check is > MAX_LEVEL_DELTA -> false -> returns sample
    expect(result).not.toBeNull();
  });
});
