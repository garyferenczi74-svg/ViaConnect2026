// Prompt #170 Phase 1f: reference object math tests.
//
// Verifies that pixels-per-mm comes from the longest bbox edge over the catalog's
// real-world longest dimension, that degenerate bboxes return NaN, and that
// bbox area in cm^2 round-trips a known input.

import { describe, it, expect } from 'vitest';
import {
  pixelsPerMmFromReference,
  bboxAreaCm2,
  REFERENCE_CATALOG,
} from '../reference-objects';
import type { ReferenceObject } from '../types';

describe('pixelsPerMmFromReference', () => {
  it('returns roughly 2.99 for a 256x161 credit card bbox', () => {
    const ref: ReferenceObject = {
      kind: 'credit_card',
      boundingBox: { x: 0, y: 0, w: 256, h: 161 },
      realWorldLongestMm: REFERENCE_CATALOG.credit_card.realWorldLongestMm,
    };
    const pxPerMm = pixelsPerMmFromReference(ref);
    expect(pxPerMm).toBeCloseTo(256 / 85.60, 3);
    expect(pxPerMm).toBeCloseTo(2.99, 2);
  });

  it('returns NaN for a degenerate bbox with zero width', () => {
    const ref: ReferenceObject = {
      kind: 'credit_card',
      boundingBox: { x: 0, y: 0, w: 0, h: 100 },
      realWorldLongestMm: 85.60,
    };
    expect(pixelsPerMmFromReference(ref)).toBeNaN();
  });

  it('returns NaN for a degenerate bbox with negative height', () => {
    const ref: ReferenceObject = {
      kind: 'credit_card',
      boundingBox: { x: 0, y: 0, w: 100, h: -5 },
      realWorldLongestMm: 85.60,
    };
    expect(pixelsPerMmFromReference(ref)).toBeNaN();
  });

  it('uses the longest edge, not width specifically', () => {
    // Tall bbox: h > w. Should still resolve to max / realWorld.
    const ref: ReferenceObject = {
      kind: 'plate_10in',
      boundingBox: { x: 0, y: 0, w: 25, h: 254 },
      realWorldLongestMm: 254,
    };
    expect(pixelsPerMmFromReference(ref)).toBeCloseTo(1.0, 5);
  });

  it('returns roughly 1.26 px/mm for a 256x256 plate_8in bbox', () => {
    const ref: ReferenceObject = {
      kind: 'plate_8in',
      boundingBox: { x: 0, y: 0, w: 256, h: 256 },
      realWorldLongestMm: REFERENCE_CATALOG.plate_8in.realWorldLongestMm,
    };
    const pxPerMm = pixelsPerMmFromReference(ref);
    expect(pxPerMm).toBeCloseTo(256 / 203, 3);
    expect(pxPerMm).toBeCloseTo(1.26, 2);
  });
});

describe('bboxAreaCm2', () => {
  it('returns 1 cm^2 for a 100x100 px bbox at 10 px/mm', () => {
    const area = bboxAreaCm2({ x: 0, y: 0, w: 100, h: 100 }, 10);
    expect(area).toBeCloseTo(1, 5);
  });

  it('returns NaN for a degenerate bbox', () => {
    expect(bboxAreaCm2({ x: 0, y: 0, w: 0, h: 100 }, 10)).toBeNaN();
  });

  it('returns NaN for a non-positive pixelsPerMm', () => {
    expect(bboxAreaCm2({ x: 0, y: 0, w: 100, h: 100 }, 0)).toBeNaN();
    expect(bboxAreaCm2({ x: 0, y: 0, w: 100, h: 100 }, Number.NaN)).toBeNaN();
  });
});

describe('REFERENCE_CATALOG', () => {
  it('lists all four reference kinds with positive real-world dimensions', () => {
    expect(REFERENCE_CATALOG.credit_card.realWorldLongestMm).toBeCloseTo(85.60, 2);
    expect(REFERENCE_CATALOG.plate_8in.realWorldLongestMm).toBe(203);
    expect(REFERENCE_CATALOG.plate_10in.realWorldLongestMm).toBe(254);
    expect(REFERENCE_CATALOG.plate_12in.realWorldLongestMm).toBe(305);
  });

  it('matches ISO/IEC 7810 ID-1 aspect ratio for credit_card', () => {
    expect(REFERENCE_CATALOG.credit_card.aspectRatio).toBeCloseTo(85.60 / 53.98, 3);
  });

  it('does not include standard_fork (dropped per #170a §17)', () => {
    expect((REFERENCE_CATALOG as Record<string, unknown>).standard_fork).toBeUndefined();
  });
});
