// Tests for scan-quality.ts (Prompt #169 T3).
//
// Covers:
//   scoreLighting: in-band pass, out-of-band mean, out-of-band std.
//   scorePose: zero deviation, avg > tolerance, max-joint guard.
//   scoreClothingTightness: midpoint 100, boundary 0, mid-range pass.
//   scoreBackgroundClutter: zero, at-max, over-max, and overallPass advisory.
//   scoreCameraLevel: zero pitch, at-tolerance, mid-range.
//   scoreFrameCoverage: centered body, head clipped at y=0.
//   aggregateQualityScores: all-pass, advisory-only, blocking-fail.

import { describe, it, expect } from 'vitest';
import {
  scoreLighting,
  scorePose,
  scoreClothingTightness,
  scoreBackgroundClutter,
  scoreCameraLevel,
  scoreFrameCoverage,
  aggregateQualityScores,
} from '../scan-quality';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a synthetic ImageData with all pixels set to a given RGB value.
 * Luminance = 0.299*r + 0.587*g + 0.114*b.
 */
function makeImageDataFlat(r: number, g: number, b: number, w = 10, h = 10): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return { data, width: w, height: h } as ImageData;
}

/**
 * Luminance of a flat-color pixel.
 */
function luminanceOf(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Build an ImageData where half the pixels have luminance lum1 and the other
 * half have luminance lum2 (uniformly spread). This yields a specific mean and
 * std-dev.
 *
 * mean = (lum1 + lum2) / 2
 * std  = |lum1 - lum2| / 2
 */
function makeImageDataTwoLuminances(
  lum1: number,
  lum2: number,
  w = 20,
  h = 10,
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const lum = p % 2 === 0 ? lum1 : lum2;
    const idx = p * 4;
    // Use grayscale (r=g=b) so luma formula gives exactly `lum`.
    data[idx]     = Math.round(lum);
    data[idx + 1] = Math.round(lum);
    data[idx + 2] = Math.round(lum);
    data[idx + 3] = 255;
  }
  return { data, width: w, height: h } as ImageData;
}

/**
 * Build a BlazePose-33 keypoint array where all joints are in a perfect
 * standing A-pose. Used as the baseline; deviation tests modify specific joints.
 *
 * All keypoints placed at anatomically plausible normalized positions in a
 * 480x640 frame. Confidence = 1 for all.
 */
function makePerfectAPoseKeypoints(): Array<{
  x: number;
  y: number;
  z: number;
  confidence: number;
}> {
  // 33 keypoints; for the geometric proxy scorer the critical indices are:
  //   11: left shoulder  12: right shoulder
  //   13: left elbow     14: right elbow
  //   15: left wrist     16: right wrist
  //   23: left hip       24: right hip
  //   25: left knee      26: right knee
  //   27: left ankle     28: right ankle
  //   29-32: feet + heels
  const kp = Array.from({ length: 33 }, (_, i) => ({
    x: 240,
    y: (i / 32) * 640,
    z: 0,
    confidence: 1,
  }));

  // Head region (0-10): place at top of frame.
  for (let i = 0; i <= 10; i++) {
    kp[i] = { x: 240, y: 30 + i * 2, z: 0, confidence: 1 };
  }

  // Shoulders (11, 12)
  kp[11] = { x: 180, y: 120, z: 0, confidence: 1 };
  kp[12] = { x: 300, y: 120, z: 0, confidence: 1 };

  // Elbows (13, 14) — directly below shoulders for near-180-deg elbow.
  kp[13] = { x: 160, y: 220, z: 0, confidence: 1 };
  kp[14] = { x: 320, y: 220, z: 0, confidence: 1 };

  // Wrists (15, 16) — further out for A-pose arm abduction (~80 deg).
  kp[15] = { x: 100, y: 300, z: 0, confidence: 1 };
  kp[16] = { x: 380, y: 300, z: 0, confidence: 1 };

  // Hips (23, 24)
  kp[23] = { x: 210, y: 360, z: 0, confidence: 1 };
  kp[24] = { x: 270, y: 360, z: 0, confidence: 1 };

  // Knees (25, 26) — slightly apart for ~15 deg hip abduction.
  kp[25] = { x: 200, y: 480, z: 0, confidence: 1 };
  kp[26] = { x: 280, y: 480, z: 0, confidence: 1 };

  // Ankles (27, 28)
  kp[27] = { x: 200, y: 580, z: 0, confidence: 1 };
  kp[28] = { x: 280, y: 580, z: 0, confidence: 1 };

  // Feet (29-32)
  kp[29] = { x: 195, y: 620, z: 0, confidence: 1 };
  kp[30] = { x: 285, y: 620, z: 0, confidence: 1 };
  kp[31] = { x: 195, y: 615, z: 0, confidence: 1 };
  kp[32] = { x: 285, y: 615, z: 0, confidence: 1 };

  return kp;
}

/**
 * Build keypoints with pre-computed deviation values appended at indices 33-42.
 * The scorer picks these up when keypoints.length >= 43.
 */
function makeKeypointsWithDeviations(deviationsDeg: number[]): Array<{
  x: number;
  y: number;
  z: number;
  confidence: number;
}> {
  const kp = makePerfectAPoseKeypoints();
  for (const dev of deviationsDeg) {
    kp.push({ x: dev, y: 0, z: 0, confidence: 1 });
  }
  return kp;
}

// ---------------------------------------------------------------------------
// scoreLighting
// ---------------------------------------------------------------------------

describe('scoreLighting', () => {
  it('mean=140 std=52 => score ~100 pass', () => {
    // mean = (lum1 + lum2) / 2 = 140 => lum1 + lum2 = 280
    // std  = |lum1 - lum2| / 2 = 52  => |lum1 - lum2| = 104
    // lum1 = 192, lum2 = 88
    const img = makeImageDataTwoLuminances(192, 88);
    const result = scoreLighting(img);
    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.meanLuminance).toBeCloseTo(140, 0);
    expect(result.stdDev).toBeCloseTo(52, 0);
  });

  it('mean=50 (below 60) => score 0 fail', () => {
    // Use flat image with luminance ~50: set r=g=b=50 => lum = 50.
    const img = makeImageDataFlat(50, 50, 50);
    const result = scoreLighting(img);
    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.meanLuminance).toBeCloseTo(50, 0);
  });

  it('mean=230 (above 220) => score 0 fail', () => {
    const img = makeImageDataFlat(230, 230, 230);
    const result = scoreLighting(img);
    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('std=20 (below 25) => fail even if mean is in range', () => {
    // mean = 140, std = 20 => lum1 = 160, lum2 = 120
    const img = makeImageDataTwoLuminances(160, 120);
    const result = scoreLighting(img);
    expect(result.pass).toBe(false);
    // Score should be 0 because std-dev sub-score is 0.
    expect(result.score).toBe(0);
    expect(result.stdDev).toBeCloseTo(20, 0);
  });

  it('std=85 (above 80) => fail even if mean is in range', () => {
    // mean = 140, std = 85 => lum1 = 225, lum2 = 55
    const img = makeImageDataTwoLuminances(225, 55);
    const result = scoreLighting(img);
    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.stdDev).toBeCloseTo(85, 0);
  });
});

// ---------------------------------------------------------------------------
// scorePose
// ---------------------------------------------------------------------------

describe('scorePose', () => {
  it('zero deviation (pre-computed) => score 100 pass', () => {
    // Supply 10 zeros as pre-computed deviations at indices 33-42.
    const kp = makeKeypointsWithDeviations(Array(10).fill(0));
    const result = scorePose(kp);
    expect(result.pass).toBe(true);
    expect(result.score).toBe(100);
    expect(result.avgDeviationDeg).toBe(0);
    expect(result.maxJointDeviationDeg).toBe(0);
  });

  it('avg deviation 13 deg => score 0 fail (exceeds 12 deg average tolerance)', () => {
    // Uniform 13 deg deviation across all 10 joints.
    const kp = makeKeypointsWithDeviations(Array(10).fill(13));
    const result = scorePose(kp);
    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.avgDeviationDeg).toBeCloseTo(13, 1);
  });

  it('avg 10 deg but one joint at 26 deg => fail (max-joint guard)', () => {
    // 9 joints at ~8.9 deg, 1 joint at 26 deg => avg ~10, max = 26.
    // 9 * 8.9 + 1 * 26 = 80.1 + 26 = 106.1 / 10 = 10.61 avg.
    const devs = Array(9).fill(8.9).concat([26]);
    const kp = makeKeypointsWithDeviations(devs);
    const result = scorePose(kp);
    expect(result.maxJointDeviationDeg).toBeGreaterThan(25);
    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('avg 6 deg with no single joint over 25 => pass', () => {
    const kp = makeKeypointsWithDeviations(Array(10).fill(6));
    const result = scorePose(kp);
    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.avgDeviationDeg).toBeCloseTo(6, 1);
  });
});

// ---------------------------------------------------------------------------
// scoreClothingTightness
// ---------------------------------------------------------------------------

describe('scoreClothingTightness', () => {
  it('ratio=1.10 (midpoint) => score 100 pass', () => {
    const result = scoreClothingTightness(110, 100);
    expect(result.score).toBe(100);
    expect(result.pass).toBe(true);
    expect(result.ratio).toBeCloseTo(1.10, 5);
  });

  it('ratio=1.02 (lower boundary, closed) => score 0 but pass', () => {
    // Boundary interpretation: [1.02, 1.18] is closed. At 1.02 the linear
    // ramp score is 0 (edge of the band) but pass is true (in range).
    const result = scoreClothingTightness(102, 100);
    expect(result.score).toBe(0);
    expect(result.pass).toBe(true);
    expect(result.ratio).toBeCloseTo(1.02, 5);
  });

  it('ratio=1.18 (upper boundary, closed) => score 0 but pass', () => {
    const result = scoreClothingTightness(118, 100);
    expect(result.score).toBe(0);
    expect(result.pass).toBe(true);
    expect(result.ratio).toBeCloseTo(1.18, 5);
  });

  it('ratio=1.01 (below lower boundary) => score 0 fail', () => {
    const result = scoreClothingTightness(101, 100);
    expect(result.score).toBe(0);
    expect(result.pass).toBe(false);
  });

  it('ratio=1.19 (above upper boundary) => score 0 fail (baggy clothing)', () => {
    const result = scoreClothingTightness(119, 100);
    expect(result.score).toBe(0);
    expect(result.pass).toBe(false);
  });

  it('ratio=1.05 => mid-band positive score, pass', () => {
    const result = scoreClothingTightness(105, 100);
    // 1.05 is between 1.02 and 1.10; score should be between 0 and 100.
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.pass).toBe(true);
  });

  it('expectedBodyAreaPx <= 0 => score 0 fail', () => {
    const result = scoreClothingTightness(100, 0);
    expect(result.score).toBe(0);
    expect(result.pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scoreBackgroundClutter
// ---------------------------------------------------------------------------

describe('scoreBackgroundClutter', () => {
  it('edge density = 0 => score 100 advisory pass', () => {
    const result = scoreBackgroundClutter(0);
    expect(result.score).toBe(100);
    expect(result.advisoryPass).toBe(true);
  });

  it('edge density = 70 (at advisory max) => score 0 advisory fail', () => {
    const result = scoreBackgroundClutter(70);
    expect(result.score).toBe(0);
    expect(result.advisoryPass).toBe(false);
  });

  it('edge density = 80 (above advisory max) => score 0 advisory fail', () => {
    const result = scoreBackgroundClutter(80);
    expect(result.score).toBe(0);
    expect(result.advisoryPass).toBe(false);
  });

  it('edge density = 35 (half max) => score ~50', () => {
    const result = scoreBackgroundClutter(35);
    expect(result.score).toBeCloseTo(50, 0);
    expect(result.advisoryPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scoreCameraLevel
// ---------------------------------------------------------------------------

describe('scoreCameraLevel', () => {
  it('pitch = 0 => score 100 pass', () => {
    const result = scoreCameraLevel(0);
    expect(result.score).toBe(100);
    expect(result.pass).toBe(true);
    expect(result.pitchDeg).toBe(0);
  });

  it('pitch = 3 deg (at tolerance boundary) => score 0 pass (closed boundary)', () => {
    // |3| <= 3, so pass. Score at exact boundary = 0 (linear ramp edge).
    const result = scoreCameraLevel(3);
    expect(result.score).toBe(0);
    expect(result.pass).toBe(true);
  });

  it('pitch = -3 deg (negative at tolerance boundary) => score 0 pass', () => {
    const result = scoreCameraLevel(-3);
    expect(result.score).toBe(0);
    expect(result.pass).toBe(true);
  });

  it('pitch = 3.1 deg (slightly over tolerance) => score 0 fail', () => {
    const result = scoreCameraLevel(3.1);
    expect(result.score).toBe(0);
    expect(result.pass).toBe(false);
  });

  it('pitch = 2 deg => score ~33 pass', () => {
    // 1 - 2/3 = 0.333 => 33
    const result = scoreCameraLevel(2);
    expect(result.pass).toBe(true);
    expect(result.score).toBeCloseTo(33, 0);
  });

  it('pitch = 1.5 deg => score ~50 pass', () => {
    const result = scoreCameraLevel(1.5);
    expect(result.pass).toBe(true);
    expect(result.score).toBeCloseTo(50, 0);
  });
});

// ---------------------------------------------------------------------------
// scoreFrameCoverage
// ---------------------------------------------------------------------------

describe('scoreFrameCoverage', () => {
  const frameW = 480;
  const frameH = 640;

  it('body well within frame => high score pass', () => {
    // Head at y=64 (10% of 640), feet at y=576 (90% of 640).
    const kp = makePerfectAPoseKeypoints();
    // Override head keypoints to y=64.
    for (let i = 0; i <= 10; i++) {
      kp[i] = { x: 240, y: 64, z: 0, confidence: 1 };
    }
    // Override ankle/foot keypoints to y=576.
    for (let i = 27; i <= 32; i++) {
      kp[i] = { x: 240, y: 576, z: 0, confidence: 1 };
    }
    const result = scoreFrameCoverage(kp, frameW, frameH);
    expect(result.pass).toBe(true);
    expect(result.score).toBe(100);
  });

  it('head at y=0 (clipped at top edge) => score 0 pass=true (still inside frame)', () => {
    // y=0 is exactly at the top edge. The body is technically in-frame (not
    // out-of-frame), but the 10%-margin score falls to 0.
    const kp = makePerfectAPoseKeypoints();
    for (let i = 0; i <= 10; i++) {
      kp[i] = { x: 240, y: 0, z: 0, confidence: 1 };
    }
    for (let i = 27; i <= 32; i++) {
      kp[i] = { x: 240, y: 576, z: 0, confidence: 1 };
    }
    const result = scoreFrameCoverage(kp, frameW, frameH);
    // y=0 means head is at the very top edge. headScore = (0 / topMargin)*100 = 0.
    expect(result.score).toBe(0);
    // pass is true because head is still >= 0 (not above the top edge).
    expect(result.pass).toBe(true);
    expect(result.headCrownY).toBe(0);
  });

  it('head above frame (y=-5) => pass false', () => {
    const kp = makePerfectAPoseKeypoints();
    for (let i = 0; i <= 10; i++) {
      kp[i] = { x: 240, y: -5, z: 0, confidence: 1 };
    }
    for (let i = 27; i <= 32; i++) {
      kp[i] = { x: 240, y: 600, z: 0, confidence: 1 };
    }
    const result = scoreFrameCoverage(kp, frameW, frameH);
    expect(result.pass).toBe(false);
  });

  it('feet below frame (y > frameHeight) => pass false', () => {
    const kp = makePerfectAPoseKeypoints();
    for (let i = 0; i <= 10; i++) {
      kp[i] = { x: 240, y: 64, z: 0, confidence: 1 };
    }
    for (let i = 27; i <= 32; i++) {
      kp[i] = { x: 240, y: frameH + 10, z: 0, confidence: 1 };
    }
    const result = scoreFrameCoverage(kp, frameW, frameH);
    expect(result.pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// aggregateQualityScores
// ---------------------------------------------------------------------------

/** Build a minimal valid aggregateQualityScores inputs object. */
function makeGoodInputs() {
  // Lighting: mean=140, std=52 via two-luminance construction.
  const rgbImage = makeImageDataTwoLuminances(192, 88, 20, 10);

  // All 6 pass.
  const kp = makeKeypointsWithDeviations(Array(10).fill(0));
  // Ensure head and feet are at 10% margins for a 640-high frame.
  for (let i = 0; i <= 10; i++) {
    kp[i] = { x: 240, y: 64, z: 0, confidence: 1 };
  }
  for (let i = 27; i <= 32; i++) {
    kp[i] = { x: 240, y: 576, z: 0, confidence: 1 };
  }

  return {
    rgbImage,
    keypoints: kp,
    silhouetteMaskAreaPx: 110,  // ratio=1.10 (midpoint)
    expectedBodyAreaPx: 100,
    edgeDensityOutsidePerson: 10, // well within advisory max
    devicePitchDeg: 0,
    frameWidth: 480,
    frameHeight: 640,
  };
}

describe('aggregateQualityScores', () => {
  it('all six checks pass => overallPass true, no blocking issues from blocking checks', () => {
    const result = aggregateQualityScores(makeGoodInputs());
    expect(result.overallPass).toBe(true);
    // blockingIssues may contain advisory notes but not from blocking checks.
    const blockingOnly = result.blockingIssues.filter(
      (s) => !s.startsWith('Advisory:'),
    );
    expect(blockingOnly).toHaveLength(0);
  });

  it('advisory background clutter fail alone does NOT flip overallPass', () => {
    const inputs = {
      ...makeGoodInputs(),
      edgeDensityOutsidePerson: 80, // advisory fail (above 70)
    };
    const result = aggregateQualityScores(inputs);
    expect(result.overallPass).toBe(true);
    // bgClutter score should be 0.
    expect(result.bgClutter).toBe(0);
    // The advisory message should appear in blockingIssues as informational.
    const advisoryItems = result.blockingIssues.filter((s) =>
      s.startsWith('Advisory:'),
    );
    expect(advisoryItems.length).toBeGreaterThan(0);
  });

  it('lighting fail => overallPass false with lighting issue listed', () => {
    const inputs = {
      ...makeGoodInputs(),
      // Flat image with mean=50 (below 60) => lighting fail.
      rgbImage: makeImageDataFlat(50, 50, 50),
    };
    const result = aggregateQualityScores(inputs);
    expect(result.overallPass).toBe(false);
    expect(result.blockingIssues.some((s) => s.toLowerCase().includes('lighting'))).toBe(true);
  });

  it('camera level fail => overallPass false with camera issue listed', () => {
    const inputs = {
      ...makeGoodInputs(),
      devicePitchDeg: 5, // exceeds 3 deg tolerance
    };
    const result = aggregateQualityScores(inputs);
    expect(result.overallPass).toBe(false);
    expect(result.blockingIssues.some((s) => s.toLowerCase().includes('camera'))).toBe(true);
  });

  it('clothing fail => overallPass false with clothing issue listed', () => {
    const inputs = {
      ...makeGoodInputs(),
      silhouetteMaskAreaPx: 130, // ratio=1.30, baggy clothing
    };
    const result = aggregateQualityScores(inputs);
    expect(result.overallPass).toBe(false);
    expect(result.blockingIssues.some((s) => s.toLowerCase().includes('clothing'))).toBe(true);
  });

  it('QualityScores shape is correct', () => {
    const result = aggregateQualityScores(makeGoodInputs());
    expect(result).toHaveProperty('lighting');
    expect(result).toHaveProperty('pose');
    expect(result).toHaveProperty('clothing');
    expect(result).toHaveProperty('bgClutter');
    expect(result).toHaveProperty('cameraLevel');
    expect(result).toHaveProperty('frameCoverage');
    expect(result).toHaveProperty('overallPass');
    expect(result).toHaveProperty('blockingIssues');
    expect(Array.isArray(result.blockingIssues)).toBe(true);
  });
});
