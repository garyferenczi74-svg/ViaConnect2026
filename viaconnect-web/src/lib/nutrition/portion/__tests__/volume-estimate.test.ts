// Prompt #170 Phase 1f: volume / mass estimator tests.
//
// Verifies the four signal priority paths (grams hint, reference object, volume
// hint, fallback), the density bucket multiplier path, and the [5, 1500] grams
// clamp guard for absurd bounding boxes.

import { describe, it, expect } from 'vitest';
import {
  estimatePortion,
  clampGrams,
  bboxLongestEdgePx,
} from '../volume-estimate';
import type { ReferenceObject } from '../types';
import type { BoundingBox, VisionItem } from '../../vision/types';

function item(
  foodName: string,
  bbox: BoundingBox,
  extras: Partial<Pick<VisionItem, 'portionGramsHint' | 'portionVolumeMlHint'>> = {},
): Pick<VisionItem, 'foodName' | 'boundingBox' | 'portionGramsHint' | 'portionVolumeMlHint'> {
  return {
    foodName,
    boundingBox: bbox,
    portionGramsHint: extras.portionGramsHint,
    portionVolumeMlHint: extras.portionVolumeMlHint,
  };
}

function creditCard(w: number, h: number): ReferenceObject {
  return {
    kind: 'credit_card',
    boundingBox: { x: 0, y: 0, w, h },
    realWorldLongestMm: 85.60,
  };
}

describe('estimatePortion', () => {
  it('uses portionGramsHint directly when provided', () => {
    const result = estimatePortion({
      item: item('grilled chicken breast', { x: 0, y: 0, w: 400, h: 300 }, { portionGramsHint: 142 }),
    });
    expect(result.method).toBe('vision_inference');
    expect(result.grams).toBe(142);
    expect(result.confidence).toBeCloseTo(0.55, 5);
    expect(result.humanLabel).toBe('approximately 142 g');
  });

  it('uses reference-object scaling for a chicken bbox with a credit card present', () => {
    const result = estimatePortion({
      item: item('chicken breast', { x: 0, y: 0, w: 400, h: 300 }),
      reference: creditCard(256, 161),
    });
    expect(result.method).toBe('reference_object');
    expect(result.confidence).toBeCloseTo(0.65, 5);
    expect(Number.isNaN(result.grams)).toBe(false);
    // Plausible single-plate range; not the absurd unclamped value.
    expect(result.grams).toBeGreaterThan(50);
    expect(result.grams).toBeLessThanOrEqual(1500);
    expect(result.volume_ml).toBeGreaterThan(0);
  });

  it('uses portionVolumeMlHint when no grams hint or reference, multiplied by density', () => {
    const result = estimatePortion({
      item: item('chicken curry', { x: 0, y: 0, w: 400, h: 300 }, { portionVolumeMlHint: 200 }),
    });
    expect(result.method).toBe('vision_inference');
    // 200 mL * 0.95 (mixed_dish density) = 190 g.
    expect(result.grams).toBe(190);
    expect(result.volume_ml).toBe(200);
    expect(result.confidence).toBeCloseTo(0.50, 5);
  });

  it('falls back to 120 g unknown when no signal at all', () => {
    const result = estimatePortion({
      item: item('mystery item', { x: 0, y: 0, w: 100, h: 100 }),
    });
    expect(result.method).toBe('unknown');
    expect(result.grams).toBe(120);
    expect(result.confidence).toBeCloseTo(0.30, 5);
    expect(result.humanLabel).toBe('single serving, 120 g');
  });

  it('clamps grams at 1500 for an absurdly large bbox under reference scaling', () => {
    const result = estimatePortion({
      item: item('beef stew', { x: 0, y: 0, w: 4000, h: 3000 }),
      reference: creditCard(256, 161),
    });
    expect(result.method).toBe('reference_object');
    expect(result.grams).toBeLessThanOrEqual(1500);
  });

  it('clamps grams at 5 for a tiny bbox under reference scaling', () => {
    const result = estimatePortion({
      item: item('chicken', { x: 0, y: 0, w: 2, h: 2 }),
      reference: creditCard(256, 161),
    });
    expect(result.method).toBe('reference_object');
    expect(result.grams).toBeGreaterThanOrEqual(5);
  });

  it('ignores a zero portionGramsHint and falls through to the next signal', () => {
    const result = estimatePortion({
      item: item('rice', { x: 0, y: 0, w: 100, h: 100 }, { portionGramsHint: 0, portionVolumeMlHint: 240 }),
    });
    expect(result.method).toBe('vision_inference');
    // 240 mL * 0.85 (solid_starch density) = 204 g.
    expect(result.grams).toBe(204);
  });

  it('ignores a non-finite portionGramsHint and falls through', () => {
    const result = estimatePortion({
      item: item('rice', { x: 0, y: 0, w: 100, h: 100 }, { portionGramsHint: Number.NaN }),
    });
    expect(result.method).toBe('unknown');
  });

  it('humanLabel is dash-free for all paths', () => {
    const paths = [
      estimatePortion({ item: item('chicken', { x: 0, y: 0, w: 100, h: 100 }, { portionGramsHint: 142 }) }),
      estimatePortion({
        item: item('chicken', { x: 0, y: 0, w: 400, h: 300 }),
        reference: creditCard(256, 161),
      }),
      estimatePortion({ item: item('curry', { x: 0, y: 0, w: 100, h: 100 }, { portionVolumeMlHint: 200 }) }),
      estimatePortion({ item: item('mystery', { x: 0, y: 0, w: 100, h: 100 }) }),
    ];
    for (const r of paths) {
      expect(r.humanLabel ?? '').not.toMatch(/[–—]/);
    }
  });
});

describe('clampGrams', () => {
  it('returns the input when in range', () => {
    expect(clampGrams(100)).toBe(100);
  });

  it('clamps to 5 below the floor', () => {
    expect(clampGrams(1)).toBe(5);
  });

  it('clamps to 1500 above the ceiling', () => {
    expect(clampGrams(99999)).toBe(1500);
  });

  it('returns the 120 g fallback for non-finite input', () => {
    expect(clampGrams(Number.NaN)).toBe(120);
    expect(clampGrams(Number.POSITIVE_INFINITY)).toBe(120);
  });
});

describe('bboxLongestEdgePx', () => {
  it('returns the larger of width and height', () => {
    expect(bboxLongestEdgePx({ x: 0, y: 0, w: 100, h: 250 })).toBe(250);
    expect(bboxLongestEdgePx({ x: 0, y: 0, w: 500, h: 100 })).toBe(500);
  });

  it('returns NaN for non-finite inputs', () => {
    expect(bboxLongestEdgePx({ x: 0, y: 0, w: Number.NaN, h: 100 })).toBeNaN();
  });
});
