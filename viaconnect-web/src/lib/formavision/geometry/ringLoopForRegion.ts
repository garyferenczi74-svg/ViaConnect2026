// Cross-section ring loop for a selected body region (Prompt 210b, P2-T4b).
//
// The measurement ring drawn when a region is selected IS the body cross-section at
// that region (210a Section 2.2): the same ellipse the loft uses, sized to the real
// circumference, so the ring is literally "the number, drawn." This helper returns
// the ordered ring-loop points (x, z at the level's y) for a region id from the
// current BodyParamVector, reusing ellipsePointsForPerimeter so the ring hugs the
// rendered surface rather than a guessed circle.
//
// Resolution mirrors the geometry builder: a measured ring in the param vector
// supplies the circumference, aspect and level; a region whose value is null or
// absent falls back to the sex template for that id and is flagged estimated, so the
// ring is never sized to zero and an UNKNOWN region still draws at a sensible place.
// It is pure and deterministic so the loop math is unit testable with no GPU.

import { ellipsePointsForPerimeter, type Point2 } from './ellipse';
import { templateForSex } from './types';
import type { BodyParamVector } from './types';

export interface RegionRingLoop {
  // Ordered ring-loop points in the body's x/z plane at the region's height.
  points: Point2[];
  // The region's normalized height (0 feet, 1 crown) and its world y in meters.
  levelN: number;
  y: number;
  // The circumference the ring is sized to, in meters.
  circumferenceM: number;
  // True when the circumference came from the template rather than a measurement.
  estimated: boolean;
}

// Resolve a selection id to a ring loop. selection ids are ring ids (chest, waist,
// rThigh, ...). When the id is unknown to both the param vector and the template the
// loop falls back to the first template ring so the caller never gets an empty loop.
export function ringLoopForRegion(
  param: BodyParamVector,
  regionId: string,
  segments = 64,
): RegionRingLoop {
  const template = templateForSex(param.sex);
  const measured = param.rings.find((r) => r.id === regionId);
  const templateRing =
    template.rings.find((r) => r.id === regionId) ?? template.rings[0];

  const hasMeasurement =
    measured !== undefined &&
    measured.circumferenceM !== null &&
    measured.circumferenceM !== undefined &&
    !measured.estimated;

  const circumferenceM = hasMeasurement
    ? (measured.circumferenceM as number)
    : templateRing.circumferenceM;
  const aspectRatio = measured ? measured.aspectRatio : templateRing.aspectRatio;
  const levelN = measured ? measured.levelN : templateRing.levelN;
  const y = levelN * param.heightM;

  return {
    points: ellipsePointsForPerimeter(circumferenceM, aspectRatio, segments),
    levelN,
    y,
    circumferenceM,
    estimated: !hasMeasurement,
  };
}
