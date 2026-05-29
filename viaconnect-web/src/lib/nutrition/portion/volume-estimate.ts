// Prompt #170 Phase 1f: portion (volume and mass) estimator.
//
// Phase 1 combines three signals in priority order:
//   1. A vision-provider portionGramsHint, if present (most direct).
//   2. A reference object, used to scale the food's bbox to real-world cm^2,
//      multiplied by a rough height proxy and a density bucket.
//   3. A vision-provider portionVolumeMlHint, multiplied by a density bucket.
//   4. A coarse fallback (120 g, "unknown").
//
// The height proxy is intentionally crude: depth sensors arrive in 170b. The
// estimator clamps grams to [5, 1500] so a bad bbox or missing reference does
// not produce absurd values that would poison downstream nutrition math.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { BoundingBox, VisionItem } from '../vision/types';
import type { PortionEstimate, ReferenceObject } from './types';
import { densityFor } from './density-table';
import { bboxAreaCm2, pixelsPerMmFromReference } from './reference-objects';

export interface PortionEstimateInput {
  item: Pick<VisionItem, 'foodName' | 'boundingBox' | 'portionGramsHint' | 'portionVolumeMlHint'>;
  reference?: ReferenceObject;
  // Assumed depth-to-height ratio for a single-plate meal item. Default 0.4.
  // Phase 2 (Prompt 170b) replaces this with a real depth integration.
  depthToHeightRatio?: number;
}

const GRAMS_MIN = 5;
const GRAMS_MAX = 1500;
const DEFAULT_DEPTH_RATIO = 0.4;
const FALLBACK_GRAMS = 120;

export function clampGrams(g: number): number {
  if (!Number.isFinite(g)) return FALLBACK_GRAMS;
  if (g < GRAMS_MIN) return GRAMS_MIN;
  if (g > GRAMS_MAX) return GRAMS_MAX;
  return g;
}

export function bboxLongestEdgePx(bbox: BoundingBox): number {
  const { w, h } = bbox;
  if (!Number.isFinite(w) || !Number.isFinite(h)) return Number.NaN;
  return Math.max(w, h);
}

function roundGrams(g: number): number {
  return Math.round(g);
}

function roundMl(ml: number): number {
  return Math.round(ml * 10) / 10;
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

export function estimatePortion(input: PortionEstimateInput): PortionEstimate {
  const { item, reference } = input;
  const depthRatio = isPositiveFinite(input.depthToHeightRatio)
    ? input.depthToHeightRatio
    : DEFAULT_DEPTH_RATIO;

  // Path 1: direct grams hint from the vision provider.
  if (isPositiveFinite(item.portionGramsHint)) {
    const grams = roundGrams(clampGrams(item.portionGramsHint));
    return {
      method: 'vision_inference',
      grams,
      confidence: 0.55,
      humanLabel: `approximately ${grams} g`,
    };
  }

  // Path 2: reference-object scaling.
  if (reference) {
    const pxPerMm = pixelsPerMmFromReference(reference);
    const areaCm2 = bboxAreaCm2(item.boundingBox, pxPerMm);
    if (Number.isFinite(areaCm2) && areaCm2 > 0) {
      const heightCm = Math.sqrt(areaCm2) * depthRatio;
      const volumeMl = areaCm2 * heightCm; // cm^2 * cm = mL
      const density = densityFor(item.foodName).densityGPerMl;
      const rawGrams = volumeMl * density;
      const grams = roundGrams(clampGrams(rawGrams));
      const volume_ml = roundMl(volumeMl);
      return {
        method: 'reference_object',
        grams,
        volume_ml,
        confidence: 0.65,
        humanLabel: `approximately ${grams} g`,
      };
    }
  }

  // Path 3: vision-provider volume hint.
  if (isPositiveFinite(item.portionVolumeMlHint)) {
    const volumeMl = item.portionVolumeMlHint;
    const density = densityFor(item.foodName).densityGPerMl;
    const rawGrams = volumeMl * density;
    const grams = roundGrams(clampGrams(rawGrams));
    return {
      method: 'vision_inference',
      grams,
      volume_ml: roundMl(volumeMl),
      confidence: 0.50,
      humanLabel: `approximately ${grams} g`,
    };
  }

  // Path 4: no signal. Coarse single-serving fallback.
  return {
    method: 'unknown',
    grams: FALLBACK_GRAMS,
    confidence: 0.30,
    humanLabel: `single serving, ${FALLBACK_GRAMS} g`,
  };
}
