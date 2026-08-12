// Pure ellipse-perimeter solver for the FormaVision parametric body (Prompt 210b)
// plus 210e-2 Revision C anatomical rings (Prompt 210g).
//
// Given a target circumference (perimeter) and an aspect ratio b / a, this module
// solves the ellipse semi-axes whose perimeter matches the target, then samples the
// ellipse into a closed ring of (x, z) points. Anatomical rings apply angular
// shape-correction and re-normalize so circumference still matches.

import type { Sex } from './types';
import {
  regionForLevelId,
  shapeCorrectionFactor,
  type ShapeRegion,
} from './shapeCorrection';

export interface Point2 {
  x: number;
  z: number;
}

// Ramanujan's second approximation of the ellipse perimeter. Accurate to better
// than one part in ten thousand across the aspect ratios this body uses.
export function ramanujanPerimeter(a: number, b: number): number {
  const h = ((a - b) * (a - b)) / ((a + b) * (a + b));
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

// Solve the semi-axes (a, b) such that b / a equals aspectRatio and the ellipse
// perimeter equals perimeterM. With a fixed ratio r = b / a, the Ramanujan
// perimeter is linear in a, so a single closed-form scale recovers a exactly.
export function solveSemiAxes(
  perimeterM: number,
  aspectRatio: number,
): { a: number; b: number } {
  const safePerimeter = perimeterM > 0 ? perimeterM : 1e-3;
  const ratio = aspectRatio > 0 ? aspectRatio : 1;
  // Perimeter for a unit major semi-axis (a = 1, b = ratio). Because the Ramanujan
  // formula scales linearly with a, the true a is target / unitPerimeter.
  const unitPerimeter = ramanujanPerimeter(1, ratio);
  const a = safePerimeter / unitPerimeter;
  const b = a * ratio;
  return { a, b };
}

// Closed-polygon perimeter of a ring of (x, z) points.
export function polygonPerimeter(points: Point2[]): number {
  if (points.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    total += Math.hypot(next.x - current.x, next.z - current.z);
  }
  return total;
}

// Sample a perimeter-matched ellipse into `segments` evenly-angled points on the
// x and z axes. x spans the width (major axis a), z spans the depth (minor axis b).
// Pure ellipse (no angular shape-correction). Prefer anatomicalRingPoints for body.
export function ellipsePointsForPerimeter(
  perimeterM: number,
  aspectRatio: number,
  segments: number,
): Point2[] {
  const count = Math.max(3, Math.floor(segments));
  const { a, b } = solveSemiAxes(perimeterM, aspectRatio);
  const points: Point2[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const theta = (i / count) * Math.PI * 2;
    points[i] = {
      x: a * Math.cos(theta),
      z: b * Math.sin(theta),
    };
  }
  return points;
}

export interface AnatomicalRingOptions {
  levelId?: string;
  region?: ShapeRegion;
  sex?: Sex;
  // When true, skip angular correction (tests / deliberate degradation gate).
  disableShapeCorrection?: boolean;
}

/**
 * 210e-2 Rev C ring: perimeter-matched ellipse modulated by angular shape
 * correction, then uniformly scaled so the closed polygon perimeter still equals
 * perimeterM (measured circumference preserved).
 */
export function anatomicalRingPoints(
  perimeterM: number,
  aspectRatio: number,
  segments: number,
  opts?: AnatomicalRingOptions,
): Point2[] {
  const base = ellipsePointsForPerimeter(perimeterM, aspectRatio, segments);
  if (opts?.disableShapeCorrection) {
    return base;
  }
  const sex = opts?.sex ?? 'male';
  const region =
    opts?.region ??
    (opts?.levelId ? regionForLevelId(opts.levelId) : 'default');
  const count = base.length;
  const corrected: Point2[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const theta = (i / count) * Math.PI * 2;
    const factor = shapeCorrectionFactor(theta, region, sex);
    corrected[i] = {
      x: base[i].x * factor,
      z: base[i].z * factor,
    };
  }
  const poly = polygonPerimeter(corrected);
  if (!(poly > 0)) {
    return corrected;
  }
  const scale = (perimeterM > 0 ? perimeterM : 1e-3) / poly;
  for (let i = 0; i < count; i += 1) {
    corrected[i] = {
      x: corrected[i].x * scale,
      z: corrected[i].z * scale,
    };
  }
  return corrected;
}
