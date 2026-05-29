// Prompt #170 Phase 1f: reference object catalog and pixel to mm scaling.
//
// Phase 1 accepts a pre-detected reference (typically from the vision provider's
// secondary pass) and computes pixels per mm from the bounding box's longest
// edge against the catalog's known real-world longest dimension. Phase 2
// (Prompt 170b) will add an inline detector that picks the reference object
// directly from the image.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { BoundingBox } from '../vision/types';
import type { ReferenceObject, ReferenceObjectKind } from './types';

export const REFERENCE_CATALOG: Record<
  ReferenceObjectKind,
  { realWorldLongestMm: number; aspectRatio: number }
> = {
  credit_card: {
    realWorldLongestMm: 85.60,
    // ISO/IEC 7810 ID-1: 85.60 / 53.98.
    aspectRatio: 85.60 / 53.98,
  },
  standard_fork: {
    realWorldLongestMm: 200,
    aspectRatio: 8.0,
  },
  plate_10in: {
    realWorldLongestMm: 254,
    aspectRatio: 1.0,
  },
  plate_12in: {
    realWorldLongestMm: 305,
    aspectRatio: 1.0,
  },
};

export function pixelsPerMmFromReference(ref: ReferenceObject): number {
  const { w, h } = ref.boundingBox;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return Number.NaN;
  }
  const realWorld = ref.realWorldLongestMm;
  if (!Number.isFinite(realWorld) || realWorld <= 0) {
    return Number.NaN;
  }
  const longestPx = Math.max(w, h);
  return longestPx / realWorld;
}

export function bboxAreaCm2(bbox: BoundingBox, pixelsPerMm: number): number {
  const { w, h } = bbox;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return Number.NaN;
  }
  if (!Number.isFinite(pixelsPerMm) || pixelsPerMm <= 0) {
    return Number.NaN;
  }
  // Convert px to mm by dividing, then mm^2 to cm^2 by dividing by 100.
  const wMm = w / pixelsPerMm;
  const hMm = h / pixelsPerMm;
  const areaMm2 = wMm * hMm;
  return areaMm2 / 100;
}
