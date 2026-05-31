// Parametric body avatar generation.
// This is intentionally a stylized anatomical mannequin, not a photoreal
// body scan. It is built from primitives (sphere, ellipsoid, cylinder) so
// no external mesh assets are required. Proportions are driven directly
// by the 9 measurement parameters so changes are visibly accurate.

import type { BodyModelParameters } from './types';

export interface AvatarSegmentSpec {
  kind: 'head' | 'neck' | 'torso' | 'upper_arm' | 'forearm' | 'thigh' | 'calf' | 'hand' | 'foot' | 'joint';
  /** Anchor position in Three.js units. Up axis is +Y. 1 unit = 10 cm. */
  position: [number, number, number];
  /** Rotation in radians [x, y, z]. */
  rotation: [number, number, number];
  /** Three radii for ellipsoids, or [radius, radius, length] for cylinders. */
  radii: [number, number, number];
  /** Side label for asymmetry visualization (left/right/center). */
  side: 'left' | 'right' | 'center';
  label: string;
}

export interface AvatarMeshSpec {
  segments: AvatarSegmentSpec[];
  heightUnits: number;   // Full height, units
  bodyFatPct: number;
}

const CM_PER_UNIT = 10;
const toU = (cm: number): number => cm / CM_PER_UNIT;
const rFromCirc = (circCm: number): number => toU(circCm / (2 * Math.PI));

/** Generate all segments of the avatar from measurement parameters. */
export function generateAvatarMesh(p: BodyModelParameters): AvatarMeshSpec {
  const heightU = toU(p.heightCm);

  // Vertical placement anchors as fractions of height (standard anthropometry)
  const yTopOfHead = heightU * 0.5;                // avatar is centered around y=0
  const yChin      = yTopOfHead - heightU * 0.13;
  const yShoulder  = yTopOfHead - heightU * 0.18;
  const yChest     = yTopOfHead - heightU * 0.26;
  const yWaist     = yTopOfHead - heightU * 0.38;
  const yHip       = yTopOfHead - heightU * 0.48;
  const yMidThigh  = yTopOfHead - heightU * 0.62;
  const yKnee      = yTopOfHead - heightU * 0.74;
  const yMidCalf   = yTopOfHead - heightU * 0.85;
  const yAnkle     = -heightU * 0.5;

  const shoulderHalfWidth = toU(p.shoulderCircCm) / (2 * Math.PI) * 1.6; // shoulders are wider than ellipse radius
  const hipHalfWidth      = toU(p.hipCircCm) / (2 * Math.PI) * 1.4;
  const armOffsetX        = shoulderHalfWidth + rFromCirc(p.bicepCircCm) * 0.7;
  const legOffsetX        = hipHalfWidth * 0.55;

  const torsoDepth = rFromCirc(p.chestCircCm) * 0.9;
  const waistDepth = rFromCirc(p.waistCircCm) * 0.9;
  const hipDepth   = rFromCirc(p.hipCircCm) * 0.9;

  const segments: AvatarSegmentSpec[] = [];

  // Head (slight ellipsoid)
  segments.push({
    kind: 'head',
    position: [0, yTopOfHead - heightU * 0.065, 0],
    rotation: [0, 0, 0],
    radii: [toU(9), toU(11), toU(9.5)],
    side: 'center',
    label: 'Head',
  });

  // Neck
  segments.push({
    kind: 'neck',
    position: [0, (yChin + yShoulder) / 2, 0],
    rotation: [0, 0, 0],
    radii: [rFromCirc(p.neckCircCm), rFromCirc(p.neckCircCm), Math.abs(yChin - yShoulder)],
    side: 'center',
    label: 'Neck',
  });

  // Torso as 3 stacked ellipsoids: chest, waist, hip, blended smoothly
  segments.push({
    kind: 'torso',
    position: [0, (yShoulder + yChest) / 2, 0],
    rotation: [0, 0, 0],
    radii: [shoulderHalfWidth * 0.9, Math.abs(yShoulder - yChest) / 2, torsoDepth],
    side: 'center',
    label: 'Upper chest',
  });
  segments.push({
    kind: 'torso',
    position: [0, (yChest + yWaist) / 2, 0],
    rotation: [0, 0, 0],
    radii: [rFromCirc(p.chestCircCm), Math.abs(yChest - yWaist) / 2, torsoDepth],
    side: 'center',
    label: 'Chest',
  });
  segments.push({
    kind: 'torso',
    position: [0, (yWaist + yHip) / 2, 0],
    rotation: [0, 0, 0],
    radii: [rFromCirc(p.waistCircCm), Math.abs(yWaist - yHip) / 2, waistDepth],
    side: 'center',
    label: 'Waist',
  });
  segments.push({
    kind: 'torso',
    position: [0, yHip - heightU * 0.02, 0],
    rotation: [0, 0, 0],
    radii: [hipHalfWidth, heightU * 0.04, hipDepth],
    side: 'center',
    label: 'Hips',
  });

  const armLength = Math.abs(yShoulder - (yHip - heightU * 0.04));

  // Arms
  for (const side of ['left','right'] as const) {
    const sign = side === 'left' ? -1 : 1;
    segments.push({
      kind: 'upper_arm',
      position: [sign * armOffsetX, yShoulder - armLength * 0.25, 0],
      rotation: [0, 0, 0],
      radii: [rFromCirc(p.bicepCircCm), rFromCirc(p.bicepCircCm), armLength * 0.45],
      side,
      label: `${side} upper arm`,
    });
    segments.push({
      kind: 'forearm',
      position: [sign * armOffsetX, yShoulder - armLength * 0.70, 0],
      rotation: [0, 0, 0],
      radii: [rFromCirc(p.bicepCircCm) * 0.75, rFromCirc(p.bicepCircCm) * 0.75, armLength * 0.40],
      side,
      label: `${side} forearm`,
    });
  }

  // Legs
  const thighLength = Math.abs(yHip - yKnee);
  const calfLength  = Math.abs(yKnee - yAnkle);

  for (const side of ['left','right'] as const) {
    const sign = side === 'left' ? -1 : 1;
    segments.push({
      kind: 'thigh',
      position: [sign * legOffsetX, yMidThigh, 0],
      rotation: [0, 0, 0],
      radii: [rFromCirc(p.thighCircCm), rFromCirc(p.thighCircCm), thighLength / 2],
      side,
      label: `${side} thigh`,
    });
    segments.push({
      kind: 'calf',
      position: [sign * legOffsetX, yMidCalf, 0],
      rotation: [0, 0, 0],
      radii: [rFromCirc(p.calfCircCm), rFromCirc(p.calfCircCm), calfLength / 2],
      side,
      label: `${side} calf`,
    });
  }

  return { segments, heightUnits: heightU, bodyFatPct: p.bodyFatPct };
}

// The four regional buckets the Phase 1 regional composition overlay
// (Prompt #169e(a)) colors by. A region color map is keyed by these. Kept here
// (rather than imported) so this Three-adjacent module stays free of the pure
// service's imports; the region keys are a tiny stable contract.
export type AvatarRegion = 'trunk' | 'arms' | 'legs' | 'head_neck';

/** Per-region CSS color map supplied by the regional overlay (optional). */
export type AvatarRegionColorMap = Partial<Record<AvatarRegion, string>>;

/**
 * Map a segment kind to its regional bucket. Mirrors regionForKind in
 * regional-fat-distribution.ts (hands fold into arms, feet into legs, the
 * connective joint into trunk). Duplicated intentionally to avoid a cross-module
 * import into the Three render path; the two must stay in sync (both are trivial
 * switches over the same kinds).
 */
export function regionForSegment(segment: AvatarSegmentSpec): AvatarRegion {
  switch (segment.kind) {
    case 'torso':
    case 'joint':
      return 'trunk';
    case 'head':
    case 'neck':
      return 'head_neck';
    case 'upper_arm':
    case 'forearm':
    case 'hand':
      return 'arms';
    case 'thigh':
    case 'calf':
    case 'foot':
      return 'legs';
    default:
      return 'trunk';
  }
}

/** Color code a segment based on composition and per region heatmap.
 *  Returns an HSL/hex string. Higher body fat shifts toward orange/red overlay.
 *
 *  Phase 1 regional overlay (Prompt #169e(a)): when `regionColorMap` is provided
 *  AND heatmap is on, the segment is colored by its REGION (per-region adiposity
 *  density) instead of the single whole-body bodyFat tint. This is purely
 *  ADDITIVE: with no map (the default), the legacy uniform-tint behavior is
 *  unchanged, and solid/wireframe modes are never affected. Phase 2's SMPL-X
 *  avatar can later supply true per-region values through this same seam. */
export function segmentColor(
  segment: AvatarSegmentSpec,
  bodyFatPct: number,
  heatmap: boolean,
  regionColorMap?: AvatarRegionColorMap | null,
): string {
  if (!heatmap) return '#2DA5A0';
  if (regionColorMap) {
    const regionHex = regionColorMap[regionForSegment(segment)];
    if (regionHex) return regionHex;
  }
  // Legacy whole-body tint: map bodyFat 5 to 35 onto hue 170 (teal) to 15 (warm orange).
  const clamped = Math.max(5, Math.min(35, bodyFatPct));
  const t = (clamped - 5) / 30;
  const hue = 170 - t * 155;
  return `hsl(${Math.round(hue)}, 60%, 50%)`;
}
