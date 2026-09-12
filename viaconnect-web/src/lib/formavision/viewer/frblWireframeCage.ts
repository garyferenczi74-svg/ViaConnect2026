// Brief 65 — dense cyan neon cage from a processSilhouette mask/contour.
// 2.5D extrusion of THAT person's FRBL silhouette. Not generateAvatarMesh,
// not AnatomicalFloor, not Picasso PNGs, not a sparse cardboard loft.
// Visual depth is display-only — never published as girth or Muscle lbs.

import type { Point2D } from '@/lib/arnold/scanning/types';

/** Same plasma cyan as Brief 64 FRBL_READY_STAGE_SPEC.plasmaCyan. */
export const FRBL_WIREFRAME_CYAN = '#2EE6D6';

/** Display-only extrusion vs local half-width. Not a measurement. */
export const FRBL_WIREFRAME_EXTRUSION = 0.26;

export const FRBL_WIREFRAME_TARGET_RINGS = 92;
export const FRBL_WIREFRAME_RING_POINTS = 20;
export const FRBL_WIREFRAME_MIN_RINGS = 36;
export const FRBL_WIREFRAME_MIN_MERIDIANS = 16;
export const FRBL_WIREFRAME_MIN_BODY_COVERAGE = 0.012;
export const FRBL_WIREFRAME_MIN_BODY_HEIGHT_FRAC = 0.22;
export const FRBL_WIREFRAME_MIN_CONTOUR = 16;

export interface FrblWireframePoint {
  x: number;
  y: number;
}

export interface FrblWireframePolyline {
  points: FrblWireframePoint[];
  layer: 'near' | 'far';
}

export interface FrblWireframeCageSpec {
  width: number;
  height: number;
  bodyPixelCount: number;
  tubeCount: number;
  ringCount: number;
  meridianCount: number;
  farPolylineCount: number;
  nearPolylineCount: number;
  polylines: FrblWireframePolyline[];
  voidSpans: Array<{ y: number; x0: number; x1: number }>;
}

interface MaskSpan {
  y: number;
  x0: number;
  x1: number;
}

interface MaskTube {
  spans: MaskSpan[];
}

function maskAt(mask: Uint8Array, width: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= width) return false;
  const i = y * width + x;
  return i >= 0 && i < mask.length && mask[i] > 127;
}

function rowSpans(mask: Uint8Array, width: number, y: number): MaskSpan[] {
  const spans: MaskSpan[] = [];
  let x = 0;
  while (x < width) {
    while (x < width && !maskAt(mask, width, x, y)) x += 1;
    if (x >= width) break;
    const x0 = x;
    while (x < width && maskAt(mask, width, x, y)) x += 1;
    const x1 = x - 1;
    if (x1 >= x0) spans.push({ y, x0, x1 });
  }
  return spans;
}

function spansOverlap(a: MaskSpan, b: MaskSpan): boolean {
  return a.x0 <= b.x1 && b.x0 <= a.x1;
}

function collectTubes(sampled: MaskSpan[][]): MaskTube[] {
  const tubes: MaskTube[] = [];
  const open: Array<{ tube: MaskTube; last: MaskSpan }> = [];

  for (const row of sampled) {
    const used = new Set<number>();
    const nextOpen: Array<{ tube: MaskTube; last: MaskSpan }> = [];
    for (const span of row) {
      let bestIdx = -1;
      let bestOverlap = -1;
      for (let i = 0; i < open.length; i += 1) {
        if (used.has(i)) continue;
        const prev = open[i].last;
        if (!spansOverlap(prev, span)) continue;
        const overlap = Math.min(prev.x1, span.x1) - Math.max(prev.x0, span.x0);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        used.add(bestIdx);
        open[bestIdx].tube.spans.push(span);
        nextOpen.push({ tube: open[bestIdx].tube, last: span });
      } else {
        const tube: MaskTube = { spans: [span] };
        tubes.push(tube);
        nextOpen.push({ tube, last: span });
      }
    }
    open.length = 0;
    open.push(...nextOpen);
  }
  return tubes.filter((tube) => tube.spans.length >= 3);
}

function projectRingPoint(
  cx: number,
  y: number,
  rx: number,
  theta: number,
): { near: FrblWireframePoint; far: FrblWireframePoint } {
  const depth = rx * FRBL_WIREFRAME_EXTRUSION;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const x = cx + rx * cos;
  const z = depth * sin;
  return {
    near: { x: x + z * 0.18, y: y - z * 0.22 },
    far: { x: x + z * 0.72, y: y - z * 0.42 },
  };
}

function boundsOf(mask: Uint8Array, width: number, height: number): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  bodyPixelCount: number;
} {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let bodyPixelCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!maskAt(mask, width, x, y)) continue;
      bodyPixelCount += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY, bodyPixelCount };
}

export function silhouetteMaskIsBodyMatched(input: {
  mask?: Uint8Array;
  width: number;
  height: number;
  contour?: Point2D[];
}): boolean {
  const { mask, width, height, contour } = input;
  if (!mask || mask.length !== width * height) return false;
  if (width < 8 || height < 8) return false;
  if (contour && contour.length < FRBL_WIREFRAME_MIN_CONTOUR) return false;
  const { minY, maxY, bodyPixelCount } = boundsOf(mask, width, height);
  if (bodyPixelCount <= 0) return false;
  const coverage = bodyPixelCount / (width * height);
  if (coverage < FRBL_WIREFRAME_MIN_BODY_COVERAGE) return false;
  const bodyHeight = maxY - minY + 1;
  if (bodyHeight / height < FRBL_WIREFRAME_MIN_BODY_HEIGHT_FRAC) return false;
  return true;
}

/**
 * Build a dense 2.5D neon cage from a processSilhouette mask.
 * Returns null when the mask cannot be body-matched — caller must be honest.
 */
export function buildDenseCageFromMask(
  mask: Uint8Array,
  width: number,
  height: number,
  contour: Point2D[] = [],
): FrblWireframeCageSpec | null {
  if (
    !silhouetteMaskIsBodyMatched({
      mask,
      width,
      height,
      ...(contour.length > 0 ? { contour } : {}),
    })
  ) {
    return null;
  }

  const { minX, maxX, minY, maxY, bodyPixelCount } = boundsOf(mask, width, height);
  const bodyHeight = maxY - minY + 1;

  const rowStride = Math.max(2, Math.floor(bodyHeight / FRBL_WIREFRAME_TARGET_RINGS));
  const sampled: MaskSpan[][] = [];
  const voidSpans: Array<{ y: number; x0: number; x1: number }> = [];
  for (let y = minY; y <= maxY; y += 1) {
    const spans = rowSpans(mask, width, y);
    for (const span of spans) voidSpans.push({ y: span.y, x0: span.x0, x1: span.x1 });
    if ((y - minY) % rowStride === 0 || y === maxY) {
      if (spans.length > 0) sampled.push(spans);
    }
  }

  const tubes = collectTubes(sampled);
  if (tubes.length === 0) return null;

  const polylines: FrblWireframePolyline[] = [];
  let ringCount = 0;

  for (const tube of tubes) {
    const ringsNear: FrblWireframePoint[][] = [];
    const ringsFar: FrblWireframePoint[][] = [];
    for (const span of tube.spans) {
      const cx = (span.x0 + span.x1) / 2;
      const rx = Math.max((span.x1 - span.x0) / 2, 1);
      const near: FrblWireframePoint[] = [];
      const far: FrblWireframePoint[] = [];
      for (let i = 0; i < FRBL_WIREFRAME_RING_POINTS; i += 1) {
        const theta = (i / FRBL_WIREFRAME_RING_POINTS) * Math.PI * 2;
        const projected = projectRingPoint(cx, span.y, rx, theta);
        near.push(projected.near);
        far.push(projected.far);
      }
      near.push(near[0]);
      far.push(far[0]);
      ringsNear.push(near);
      ringsFar.push(far);
      ringCount += 1;
      polylines.push({ points: far, layer: 'far' });
      polylines.push({ points: near, layer: 'near' });
    }

    for (let m = 0; m < FRBL_WIREFRAME_RING_POINTS; m += 1) {
      const farMeridian: FrblWireframePoint[] = [];
      const nearMeridian: FrblWireframePoint[] = [];
      for (let r = 0; r < ringsNear.length; r += 1) {
        farMeridian.push(ringsFar[r][m]);
        nearMeridian.push(ringsNear[r][m]);
      }
      if (farMeridian.length >= 2) {
        polylines.push({ points: farMeridian, layer: 'far' });
      }
      if (nearMeridian.length >= 2) {
        polylines.push({ points: nearMeridian, layer: 'near' });
      }
    }
  }

  // Image-space grid clipped to the mask — extra density so a single-tube
  // silhouette still reads as a SuperGrok void cage, not a thin outline.
  const bodyWidth = Math.max(maxX - minX + 1, 1);
  const colStride = Math.max(3, Math.floor(bodyWidth / 18));
  for (let x = minX; x <= maxX; x += colStride) {
    const near: FrblWireframePoint[] = [];
    const far: FrblWireframePoint[] = [];
    for (let y = minY; y <= maxY; y += rowStride) {
      if (!maskAt(mask, width, x, y)) {
        if (near.length >= 2) {
          polylines.push({ points: [...near], layer: 'near' });
          polylines.push({ points: [...far], layer: 'far' });
        }
        near.length = 0;
        far.length = 0;
        continue;
      }
      const local = rowSpans(mask, width, y).find((s) => x >= s.x0 && x <= s.x1);
      const rx = local ? Math.max((local.x1 - local.x0) / 2, 1) : 1;
      const projected = projectRingPoint(x, y, rx, Math.PI * 0.5);
      near.push(projected.near);
      far.push(projected.far);
    }
    if (near.length >= 2) {
      polylines.push({ points: near, layer: 'near' });
      polylines.push({ points: far, layer: 'far' });
    }
  }

  const farPolylineCount = polylines.filter((p) => p.layer === 'far').length;
  const nearPolylineCount = polylines.filter((p) => p.layer === 'near').length;
  const meridianCount = FRBL_WIREFRAME_RING_POINTS * tubes.length;

  if (ringCount < FRBL_WIREFRAME_MIN_RINGS || meridianCount < FRBL_WIREFRAME_MIN_MERIDIANS) {
    return null;
  }

  return {
    width,
    height,
    bodyPixelCount,
    tubeCount: tubes.length,
    ringCount,
    meridianCount,
    farPolylineCount,
    nearPolylineCount,
    polylines,
    voidSpans,
  };
}

export function polylineToPath(points: FrblWireframePoint[]): string {
  if (points.length === 0) return '';
  const head = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  const rest = points
    .slice(1)
    .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  return `${head} ${rest}`;
}
