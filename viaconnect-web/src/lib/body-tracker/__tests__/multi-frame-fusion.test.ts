// Tests for multi-frame-fusion.ts (Prompt #169 T4).
//
// Covers:
//   validateFusionInput: rejects wrong frame count, mismatched masks,
//     mismatched keypoint lengths, excessive time span; accepts valid input.
//   medianFilterMasks: binary median 255 and 0 cases.
//   averageKeypointsWeighted: uniform confidence, varying confidence, all-zero.
//   fuseFrames: integration test returns consensus mask + averaged keypoints.

import { describe, it, expect } from 'vitest';
import {
  validateFusionInput,
  medianFilterMasks,
  averageKeypointsWeighted,
  fuseFrames,
} from '../multi-frame-fusion';
import type { FrameFusionInput } from '../scan-types';
import { MULTI_FRAME_FUSION } from '../scan-constants';

// ============================================================
// Helpers
// ============================================================

/** Create a minimal binary silhouette ImageData of given dimensions. */
function makeBlankMask(w: number, h: number, fillValue = 0): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  if (fillValue !== 0) {
    data.fill(fillValue);
  }
  return { data, width: w, height: h } as ImageData;
}

type Keypoint = { x: number; y: number; z: number; confidence: number };

/** Create N identical keypoints with given coordinates. */
function makeKp(x: number, y: number, z = 0, confidence = 1): Keypoint {
  return { x, y, z, confidence };
}

/** Build a valid 3-frame FrameFusionInput. */
function makeValidInput(overrides?: Partial<FrameFusionInput>): FrameFusionInput {
  const now = Date.now();
  const mask = makeBlankMask(4, 4);
  const kp   = [makeKp(10, 20), makeKp(30, 40)];

  const base: FrameFusionInput = {
    frames: [
      { silhouetteMask: mask, keypoints: kp, capturedAt: now },
      { silhouetteMask: mask, keypoints: kp, capturedAt: now + 100 },
      { silhouetteMask: mask, keypoints: kp, capturedAt: now + 200 },
    ],
  };

  return { ...base, ...overrides };
}

// ============================================================
// validateFusionInput
// ============================================================

describe('validateFusionInput', () => {
  it('accepts a valid 3-frame input with ~100ms intervals', () => {
    const input = makeValidInput();
    expect(validateFusionInput(input)).toBeNull();
  });

  it('rejects when frame count is not 3', () => {
    const now  = Date.now();
    const mask = makeBlankMask(4, 4);
    const kp   = [makeKp(0, 0)];
    const input: FrameFusionInput = {
      frames: [
        { silhouetteMask: mask, keypoints: kp, capturedAt: now },
        { silhouetteMask: mask, keypoints: kp, capturedAt: now + 100 },
      ],
    };
    expect(validateFusionInput(input)).toContain(String(MULTI_FRAME_FUSION.frameCount));
  });

  it('rejects when masks have mismatched dimensions', () => {
    const now   = Date.now();
    const mask1 = makeBlankMask(4, 4);
    const mask2 = makeBlankMask(8, 8); // different size
    const kp    = [makeKp(0, 0)];
    const input: FrameFusionInput = {
      frames: [
        { silhouetteMask: mask1, keypoints: kp, capturedAt: now },
        { silhouetteMask: mask2, keypoints: kp, capturedAt: now + 100 },
        { silhouetteMask: mask1, keypoints: kp, capturedAt: now + 200 },
      ],
    };
    expect(validateFusionInput(input)).not.toBeNull();
  });

  it('rejects when keypoint array lengths differ across frames', () => {
    const now  = Date.now();
    const mask = makeBlankMask(4, 4);
    const kp1  = [makeKp(0, 0)];
    const kp2  = [makeKp(0, 0), makeKp(1, 1)]; // extra keypoint
    const input: FrameFusionInput = {
      frames: [
        { silhouetteMask: mask, keypoints: kp1, capturedAt: now },
        { silhouetteMask: mask, keypoints: kp2, capturedAt: now + 100 },
        { silhouetteMask: mask, keypoints: kp1, capturedAt: now + 200 },
      ],
    };
    expect(validateFusionInput(input)).not.toBeNull();
  });

  it('rejects when capture time span exceeds 1.5x the expected window', () => {
    // Expected max = 3 * 100 * 1.5 = 450ms. A span of 600ms should fail.
    const now  = Date.now();
    const mask = makeBlankMask(4, 4);
    const kp   = [makeKp(0, 0)];
    const input: FrameFusionInput = {
      frames: [
        { silhouetteMask: mask, keypoints: kp, capturedAt: now },
        { silhouetteMask: mask, keypoints: kp, capturedAt: now + 300 },
        { silhouetteMask: mask, keypoints: kp, capturedAt: now + 600 },
      ],
    };
    expect(validateFusionInput(input)).not.toBeNull();
  });

  it('accepts when capture time span is exactly at the jitter boundary (450ms)', () => {
    const now  = Date.now();
    const mask = makeBlankMask(4, 4);
    const kp   = [makeKp(0, 0)];
    const input: FrameFusionInput = {
      frames: [
        { silhouetteMask: mask, keypoints: kp, capturedAt: now },
        { silhouetteMask: mask, keypoints: kp, capturedAt: now + 225 },
        { silhouetteMask: mask, keypoints: kp, capturedAt: now + 450 },
      ],
    };
    expect(validateFusionInput(input)).toBeNull();
  });
});

// ============================================================
// medianFilterMasks
// ============================================================

describe('medianFilterMasks', () => {
  /**
   * Create a 1x1 binary mask where all four RGBA channels are set to value.
   */
  function make1x1(value: number): ImageData {
    const data = new Uint8ClampedArray([value, value, value, value]);
    return { data, width: 1, height: 1 } as ImageData;
  }

  it('pixel [255, 255, 0] across 3 masks => median 255', () => {
    const masks = [make1x1(255), make1x1(255), make1x1(0)];
    const result = medianFilterMasks(masks);
    // Median of [0, 255, 255] sorted = 255.
    expect(result.data[0]).toBe(255);
  });

  it('pixel [255, 0, 0] across 3 masks => median 0', () => {
    const masks = [make1x1(255), make1x1(0), make1x1(0)];
    const result = medianFilterMasks(masks);
    // Median of [0, 0, 255] sorted = 0.
    expect(result.data[0]).toBe(0);
  });

  it('preserves mask dimensions', () => {
    const masks = [makeBlankMask(6, 8), makeBlankMask(6, 8), makeBlankMask(6, 8)];
    const result = medianFilterMasks(masks);
    expect(result.width).toBe(6);
    expect(result.height).toBe(8);
    expect(result.data.length).toBe(6 * 8 * 4);
  });

  it('single-mask passthrough: median of one value is itself', () => {
    const mask = make1x1(128);
    const result = medianFilterMasks([mask]);
    expect(result.data[0]).toBe(128);
  });
});

// ============================================================
// averageKeypointsWeighted
// ============================================================

describe('averageKeypointsWeighted', () => {
  it('3 frames with equal confidence => simple mean of coordinates', () => {
    const kpPerFrame = [
      [makeKp(10, 20, 0, 1.0)],
      [makeKp(20, 30, 0, 1.0)],
      [makeKp(30, 40, 0, 1.0)],
    ];
    const result = averageKeypointsWeighted(kpPerFrame);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBeCloseTo(20, 5);
    expect(result[0].y).toBeCloseTo(30, 5);
    expect(result[0].confidence).toBeCloseTo(1.0, 5);
  });

  it('confidence-weighted: (10, conf 0.5), (20, conf 1.0), (30, conf 0.5) => x=20, conf=0.667', () => {
    // Weighted x = (10*0.5 + 20*1.0 + 30*0.5) / (0.5 + 1.0 + 0.5) = 40 / 2 = 20
    // Mean confidence = (0.5 + 1.0 + 0.5) / 3 = 0.667
    const kpPerFrame = [
      [makeKp(10, 0, 0, 0.5)],
      [makeKp(20, 0, 0, 1.0)],
      [makeKp(30, 0, 0, 0.5)],
    ];
    const result = averageKeypointsWeighted(kpPerFrame);
    expect(result[0].x).toBeCloseTo(20, 5);
    expect(result[0].confidence).toBeCloseTo(2 / 3, 3);
  });

  it('all-zero confidence => returns (0, 0, 0, confidence=0)', () => {
    const kpPerFrame = [
      [makeKp(100, 200, 300, 0)],
      [makeKp(100, 200, 300, 0)],
      [makeKp(100, 200, 300, 0)],
    ];
    const result = averageKeypointsWeighted(kpPerFrame);
    expect(result[0]).toEqual({ x: 0, y: 0, z: 0, confidence: 0 });
  });

  it('empty frame list => returns empty array', () => {
    expect(averageKeypointsWeighted([])).toHaveLength(0);
  });

  it('multiple keypoints per frame are each averaged independently', () => {
    const kpPerFrame = [
      [makeKp(0, 0, 0, 1), makeKp(100, 100, 0, 1)],
      [makeKp(10, 10, 0, 1), makeKp(200, 200, 0, 1)],
      [makeKp(20, 20, 0, 1), makeKp(300, 300, 0, 1)],
    ];
    const result = averageKeypointsWeighted(kpPerFrame);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBeCloseTo(10, 5);
    expect(result[1].x).toBeCloseTo(200, 5);
  });
});

// ============================================================
// fuseFrames (integration)
// ============================================================

describe('fuseFrames', () => {
  it('returns consensusMask and averagedKeypoints for valid 3-frame input', () => {
    const now = Date.now();

    // Build 3 masks: pixel 0 has values [255, 255, 0] across frames => median 255.
    const makeMask = (v0: number): ImageData => {
      const data = new Uint8ClampedArray(1 * 1 * 4);
      data[0] = v0; data[1] = v0; data[2] = v0; data[3] = 255;
      return { data, width: 1, height: 1 } as ImageData;
    };

    const input: FrameFusionInput = {
      frames: [
        {
          silhouetteMask: makeMask(255),
          keypoints: [makeKp(10, 20, 0, 1)],
          capturedAt: now,
        },
        {
          silhouetteMask: makeMask(255),
          keypoints: [makeKp(20, 30, 0, 1)],
          capturedAt: now + 100,
        },
        {
          silhouetteMask: makeMask(0),
          keypoints: [makeKp(30, 40, 0, 1)],
          capturedAt: now + 200,
        },
      ],
    };

    const result = fuseFrames(input);

    expect(result).toHaveProperty('consensusMask');
    expect(result).toHaveProperty('averagedKeypoints');

    // Median of [255, 255, 0] = 255.
    expect(result.consensusMask.data[0]).toBe(255);

    // Averaged keypoint: (10+20+30)/3 = 20, (20+30+40)/3 = 30.
    expect(result.averagedKeypoints[0].x).toBeCloseTo(20, 5);
    expect(result.averagedKeypoints[0].y).toBeCloseTo(30, 5);
  });

  it('throws when validation fails (wrong frame count)', () => {
    const now  = Date.now();
    const mask = makeBlankMask(4, 4);
    const kp   = [makeKp(0, 0)];
    const input: FrameFusionInput = {
      frames: [
        { silhouetteMask: mask, keypoints: kp, capturedAt: now },
        { silhouetteMask: mask, keypoints: kp, capturedAt: now + 100 },
      ],
    };
    expect(() => fuseFrames(input)).toThrow();
  });
});
