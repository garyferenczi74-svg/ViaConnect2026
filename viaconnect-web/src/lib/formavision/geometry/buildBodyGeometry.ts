// Parametric body-mesh builder for FormaVision (Prompt 210b, task P1-T1).
//
// buildBodyGeometry turns a normalized BodyParamVector into a single indexed
// THREE.BufferGeometry: a smooth torso-and-legs skin, two tapered arm tubes, an
// ovoid head, and mitten hand caps. Sparse measured rings are interpolated along
// each radial column with a Catmull-Rom curve so the surface is smooth rather than
// faceted between measurements. The function is pure and deterministic: the same
// vector always yields byte-identical position, normal and uv buffers.

import {
  BufferGeometry,
  BufferAttribute,
  CatmullRomCurve3,
  Vector3,
} from 'three';
import { ellipsePointsForPerimeter } from './ellipse';
import { templateForSex } from './types';
import type {
  ArmLevel,
  ArmParam,
  BodyParamVector,
  BodyRing,
  BodyTemplate,
  TrunkLevel,
} from './types';

export interface BuildOptions {
  // Points around each ring. More segments give a rounder cross-section.
  radialSegments?: number;
  // Interpolated rows produced between the sparse measured rings along the body.
  verticalSegments?: number;
}

// The five body segments the composition data and the 2D heat map use, with their
// stable ordering. This is the single source of the segment ordering: the per-vertex
// `segment` attribute, the material uSegmentTint array, and the OV-T2/T3 tint feeders
// all index by these values so the 3D overlay tints the same regions as the 2D.
// Head and hands follow their parent segment (head -> trunk, hands -> their arm).
export const SEGMENT_INDEX = {
  right_arm: 0,
  left_arm: 1,
  trunk: 2,
  right_leg: 3,
  left_leg: 4,
} as const;

export type SegmentName = keyof typeof SEGMENT_INDEX;

export interface BodyGeometryResult {
  geometry: BufferGeometry;
  // Every ring or limb that fell back to a template default (UNKNOWN measurement),
  // so the render layer can mark it as estimated.
  estimatedRingIds: string[];
  dispose(): void;
}

// 40 radial points per ring per Prompt 210a Section 2.1.
const DEFAULT_RADIAL_SEGMENTS = 40;
const DEFAULT_VERTICAL_SEGMENTS = 48;

// A ring resolved to concrete numbers, with its estimated flag carried through.
interface ResolvedRing {
  id: string;
  levelN: number;
  circumferenceM: number;
  aspectRatio: number;
  estimated: boolean;
}

// Resolve every input ring against the template: a null circumference borrows the
// template default for that id and is flagged estimated.
function resolveRings(
  param: BodyParamVector,
  template: BodyTemplate,
): { rings: ResolvedRing[]; estimatedIds: string[] } {
  const estimatedIds: string[] = [];
  const rings: ResolvedRing[] = param.rings.map((ring: BodyRing) => {
    const templateRing = template.rings.find((t) => t.id === ring.id);
    const fallback = templateRing ? templateRing.circumferenceM : 0.5;
    const measured = ring.circumferenceM;
    const isEstimated = measured === null || measured === undefined || ring.estimated;
    if (isEstimated) {
      estimatedIds.push(ring.id);
    }
    return {
      id: ring.id,
      levelN: ring.levelN,
      circumferenceM: measured === null || measured === undefined ? fallback : measured,
      aspectRatio: ring.aspectRatio,
      estimated: isEstimated,
    };
  });
  // Sort head to foot is not required for the math, but stacking by ascending
  // levelN keeps the loft monotonic along Y.
  rings.sort((a, b) => a.levelN - b.levelN);
  return { rings, estimatedIds };
}

// Look up a measured ring's circumference by id, or null when absent or unmeasured.
// Used to anchor an anatomical trunk/leg level exactly onto a real user number.
function measuredCircumference(rings: ResolvedRing[], ringId: string | undefined): number | null {
  if (!ringId) {
    return null;
  }
  const ring = rings.find((r) => r.id === ringId && !r.estimated);
  return ring ? ring.circumferenceM : null;
}

// Resolve a trunk level to a circumference: a measured anchor ring (if present and
// not estimated) overrides the template circumference exactly; otherwise the
// template/taper default stands. Structural levels (no anchorRingId) are always
// template and are never flagged estimated.
function resolveTrunkLevelCircumference(
  level: TrunkLevel,
  rings: ResolvedRing[],
): number {
  const measured = measuredCircumference(rings, level.anchorRingId);
  return measured !== null ? measured : level.circumferenceM;
}

// The trunk skin is the central column from the hip region up to the neck base. The
// glute level closes the bottom of the trunk just above where the legs split off.
const TRUNK_LEVEL_IDS = [
  'glute',
  'hip',
  'lowWaist',
  'navelWaist',
  'chest',
  'shoulder',
  'neckBase',
];

// The per-leg column runs from the glute down through the thigh, knee, calf and
// ankle. midThigh and midCalf anchor the measured quad and calf circumferences.
const LEG_LEVEL_IDS = ['glute', 'midThigh', 'knee', 'midCalf', 'ankle'];

// Build the smooth trunk skin from the anatomical level set. Each level becomes a
// control ring (measured anchors override the template), and buildLimb lofts a
// Catmull-Rom surface through them at verticalSegments rows.
function buildTrunk(
  rings: ResolvedRing[],
  template: BodyTemplate,
  heightM: number,
  radialSegments: number,
  verticalSegments: number,
): { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number } {
  const levels = TRUNK_LEVEL_IDS.map((id) => template.trunkLevels.find((l) => l.id === id)).filter(
    (l): l is TrunkLevel => l !== undefined,
  );
  // Top (neck base) to bottom (glute) so buildLimb runs head to foot like the arms.
  levels.sort((a, b) => b.levelN - a.levelN);
  const controls: LimbControl[] = levels.map((level) => ({
    center: new Vector3(0, level.levelN * heightM, 0),
    circumferenceM: resolveTrunkLevelCircumference(level, rings),
    aspectRatio: level.aspectRatio,
  }));
  return buildLimb(controls, verticalSegments, radialSegments);
}

interface LimbControl {
  // World position of this control ring's center.
  center: Vector3;
  // Cross-section circumference in meters at this control ring.
  circumferenceM: number;
  // Region-specific front-to-side aspect ratio (depth / width) at this control.
  aspectRatio: number;
}

// Loft a tapered limb or trunk tube through an ordered list of control rings (top to
// bottom). Circumference and aspect ratio are linearly interpolated between adjacent
// controls, and each row's ring is laid flat in world x/z around the interpolated
// center. The trunk, arms and legs all use this so the lofting stays DRY. The
// vertical path between controls is smoothed with a per-column Catmull-Rom curve so
// the skin reads as a body rather than faceting between anatomical levels.
function buildLimb(
  controls: LimbControl[],
  rows: number,
  radialSegments: number,
): { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number } {
  const rowCount = Math.max(2, Math.floor(rows));
  const segments = Math.max(1, controls.length - 1);
  const positions: number[] = [];
  const uvs: number[] = [];

  // Per-control ellipse ring points (each with its own circumference and aspect).
  const controlRings = controls.map((c) =>
    ellipsePointsForPerimeter(c.circumferenceM, c.aspectRatio, radialSegments),
  );

  // One Catmull-Rom curve per radial column through the control centers plus that
  // column's ring offset, so the surface interpolates smoothly along the limb.
  const columnCurves: CatmullRomCurve3[] = [];
  for (let col = 0; col < radialSegments; col += 1) {
    const pts = controls.map(
      (c, ci) =>
        new Vector3(
          c.center.x + controlRings[ci][col].x,
          c.center.y,
          c.center.z + controlRings[ci][col].z,
        ),
    );
    columnCurves.push(new CatmullRomCurve3(pts, false, 'catmullrom', 0.5));
  }

  for (let row = 0; row < rowCount; row += 1) {
    const t = rowCount > 1 ? row / (rowCount - 1) : 0;
    for (let col = 0; col < radialSegments; col += 1) {
      const p = columnCurves[col].getPoint(t);
      positions.push(p.x, p.y, p.z);
      uvs.push(col / radialSegments, t);
    }
  }

  const indices: number[] = [];
  for (let row = 0; row < rowCount - 1; row += 1) {
    for (let col = 0; col < radialSegments; col += 1) {
      const nextCol = (col + 1) % radialSegments;
      const a = row * radialSegments + col;
      const b = row * radialSegments + nextCol;
      const c = (row + 1) * radialSegments + col;
      const d = (row + 1) * radialSegments + nextCol;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // `segments` documents the control-chain length for callers sizing row counts.
  void segments;
  return { positions, uvs, indices, vertexCount: rowCount * radialSegments };
}

// Loft a tapered arm tube from a shoulder anchor down to a wrist anchor through the
// full arm level set (shoulder, mid-upper-arm, elbow, mid-forearm, wrist). The
// measured bicep anchors mid-upper-arm and the measured forearm anchors mid-forearm
// exactly; the structural shoulder, elbow and wrist levels take template taper and
// are not flagged estimated. Levels are placed by their t fraction between the
// shoulder and wrist anchors.
function buildArm(
  arm: ArmParam,
  template: BodyTemplate,
  shoulder: Vector3,
  wrist: Vector3,
  radialSegments: number,
  verticalSegments: number,
): { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number; estimated: boolean } {
  const estimated =
    arm.bicepM === null ||
    arm.bicepM === undefined ||
    arm.forearmM === null ||
    arm.forearmM === undefined ||
    arm.estimated;
  const bicep = arm.bicepM === null || arm.bicepM === undefined ? template.arm.bicepM : arm.bicepM;
  const forearm =
    arm.forearmM === null || arm.forearmM === undefined ? template.arm.forearmM : arm.forearmM;

  const axis = new Vector3().subVectors(wrist, shoulder);
  const controls: LimbControl[] = template.armLevels.map((level: ArmLevel) => {
    let circumference = level.circumferenceM;
    if (level.anchor === 'bicep') {
      circumference = bicep;
    } else if (level.anchor === 'forearm') {
      circumference = forearm;
    }
    return {
      center: new Vector3().copy(shoulder).addScaledVector(axis, level.t),
      circumferenceM: circumference,
      aspectRatio: level.aspectRatio,
    };
  });

  const rows = Math.max(template.armLevels.length, Math.floor(verticalSegments / 3));
  const limb = buildLimb(controls, rows, radialSegments);
  return { ...limb, estimated };
}

// Resolve one leg level to a circumference. The midThigh level anchors the measured
// per-side quad ring and midCalf anchors the per-side calf ring (exact when present
// and not estimated); every other leg level (glute, knee, ankle) is structural taper
// and takes the template circumference, never flagged estimated.
function resolveLegLevelCircumference(
  level: TrunkLevel,
  side: 'r' | 'l',
  rings: ResolvedRing[],
): number {
  let anchorId: string | undefined;
  if (level.id === 'midThigh') {
    anchorId = side === 'r' ? 'rThigh' : 'lThigh';
  } else if (level.id === 'midCalf') {
    anchorId = side === 'r' ? 'rCalf' : 'lCalf';
  }
  const measured = measuredCircumference(rings, anchorId);
  return measured !== null ? measured : level.circumferenceM;
}

// Build one leg: a tapered tube from the glute down through mid-thigh, knee, mid-calf
// and ankle, capped with a foot. mid-thigh and mid-calf anchor the measured quad and
// calf circumferences for that side.
function buildLeg(
  side: 'r' | 'l',
  rings: ResolvedRing[],
  template: BodyTemplate,
  hipAnchor: Vector3,
  heightM: number,
  radialSegments: number,
  verticalSegments: number,
): {
  positions: number[];
  uvs: number[];
  indices: number[];
  vertexCount: number;
  estimatedIds: string[];
} {
  const thighId = side === 'r' ? 'rThigh' : 'lThigh';
  const calfId = side === 'r' ? 'rCalf' : 'lCalf';
  // Report a measured leg ring as estimated only when the user value is absent.
  const thighRing = rings.find((r) => r.id === thighId);
  const calfRing = rings.find((r) => r.id === calfId);
  const estimatedIds: string[] = [];
  if (!thighRing || thighRing.estimated) {
    estimatedIds.push(thighId);
  }
  if (!calfRing || calfRing.estimated) {
    estimatedIds.push(calfId);
  }

  const levels = LEG_LEVEL_IDS.map((id) => template.trunkLevels.find((l) => l.id === id)).filter(
    (l): l is TrunkLevel => l !== undefined,
  );
  // Top (glute) to bottom (ankle).
  levels.sort((a, b) => b.levelN - a.levelN);

  const controls: LimbControl[] = levels.map((level) => {
    // The glute level seats the leg under the hip anchor; lower levels hang straight
    // down from that same x so the leg reads as one limb.
    const y = level.levelN * heightM;
    return {
      center: new Vector3(hipAnchor.x, y, 0),
      circumferenceM: resolveLegLevelCircumference(level, side, rings),
      aspectRatio: level.aspectRatio,
    };
  });

  const rows = Math.max(levels.length, Math.floor(verticalSegments / 2));
  const limb = buildLimb(controls, rows, radialSegments);

  // Foot cap at the ankle (bottom control).
  const ankleControl = controls[controls.length - 1];
  const foot = buildFoot(ankleControl.center, ankleControl.circumferenceM, radialSegments);

  // The leg limb plus its foot are merged here as one part; the body-level append
  // tags the whole leg with its segment, so the local segments buffer is discarded.
  const merged = {
    positions: [...limb.positions],
    uvs: [...limb.uvs],
    indices: [...limb.indices],
    segments: [] as number[],
    vertexOffset: limb.vertexCount,
  };
  appendPart(merged, foot, 0);

  return {
    positions: merged.positions,
    uvs: merged.uvs,
    indices: merged.indices,
    vertexCount: merged.vertexOffset,
    estimatedIds,
  };
}

// Simple foot cap: a low half-ovoid at the ankle that projects forward (+z) and sits
// just above the floor, closing the bottom of the leg tube.
function buildFoot(
  ankle: Vector3,
  ankleCircumferenceM: number,
  radialSegments: number,
): { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number } {
  const radius = ankleCircumferenceM / (2 * Math.PI);
  const length = radius * 2.4;
  const stacks = Math.max(3, Math.floor(radialSegments / 3));
  const positions: number[] = [];
  const uvs: number[] = [];

  for (let stack = 0; stack <= stacks; stack += 1) {
    // phi runs 0 (at the ankle) to PI/2 (toe tip). The foot drops slightly and
    // extends forward in +z so it reads as a foot rather than a ball.
    const phi = (stack / stacks) * (Math.PI / 2);
    const ringRadius = radius * Math.cos(phi);
    const y = Math.max(0, ankle.y - radius * 0.6 * Math.sin(phi));
    const zShift = length * Math.sin(phi);
    for (let col = 0; col < radialSegments; col += 1) {
      const theta = (col / radialSegments) * Math.PI * 2;
      positions.push(
        ankle.x + ringRadius * Math.cos(theta),
        y,
        ankle.z + zShift + ringRadius * Math.sin(theta),
      );
      uvs.push(col / radialSegments, stack / stacks);
    }
  }

  const indices: number[] = [];
  for (let stack = 0; stack < stacks; stack += 1) {
    for (let col = 0; col < radialSegments; col += 1) {
      const nextCol = (col + 1) % radialSegments;
      const a = stack * radialSegments + col;
      const b = stack * radialSegments + nextCol;
      const c = (stack + 1) * radialSegments + col;
      const d = (stack + 1) * radialSegments + nextCol;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return { positions, uvs, indices, vertexCount: (stacks + 1) * radialSegments };
}

// Build an ovoid head above the neck ring, sized from the neck circumference and the
// template head ratios.
function buildHead(
  rings: ResolvedRing[],
  template: BodyTemplate,
  heightM: number,
  radialSegments: number,
): { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number } {
  const neck = rings.find((r) => r.id === 'neck');
  const neckCircumference = neck ? neck.circumferenceM : template.rings[0].circumferenceM;
  const headCircumference = neckCircumference * template.head.circumferenceFromNeck;
  const neckY = (neck ? neck.levelN : 0.87) * heightM;

  // Equatorial radius from the head circumference treated as a circle.
  const radius = headCircumference / (2 * Math.PI);
  // Vertical half-height from the head aspect ratio (taller than wide).
  const halfHeight = radius / template.head.aspectRatio;
  const centerY = neckY + halfHeight;

  const stacks = Math.max(4, Math.floor(radialSegments / 2));
  const positions: number[] = [];
  const uvs: number[] = [];

  for (let stack = 0; stack <= stacks; stack += 1) {
    const phi = (stack / stacks) * Math.PI;
    const ringRadius = radius * Math.sin(phi);
    const y = centerY + halfHeight * Math.cos(phi);
    for (let col = 0; col < radialSegments; col += 1) {
      const theta = (col / radialSegments) * Math.PI * 2;
      positions.push(ringRadius * Math.cos(theta), y, ringRadius * Math.sin(theta));
      uvs.push(col / radialSegments, stack / stacks);
    }
  }

  const indices: number[] = [];
  for (let stack = 0; stack < stacks; stack += 1) {
    for (let col = 0; col < radialSegments; col += 1) {
      const nextCol = (col + 1) % radialSegments;
      const a = stack * radialSegments + col;
      const b = stack * radialSegments + nextCol;
      const c = (stack + 1) * radialSegments + col;
      const d = (stack + 1) * radialSegments + nextCol;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return { positions, uvs, indices, vertexCount: (stacks + 1) * radialSegments };
}

// Simple mitten cap: a half-ovoid centered at the wrist so the arm tube ends in a
// rounded hand rather than an open hole.
function buildHand(
  wrist: Vector3,
  forearmM: number,
  radialSegments: number,
): { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number } {
  const radius = forearmM / (2 * Math.PI);
  const length = radius * 2.2;
  const stacks = Math.max(3, Math.floor(radialSegments / 3));
  const positions: number[] = [];
  const uvs: number[] = [];

  for (let stack = 0; stack <= stacks; stack += 1) {
    // phi runs 0 (at the wrist) to PI/2 (the rounded tip below the wrist).
    const phi = (stack / stacks) * (Math.PI / 2);
    const ringRadius = radius * Math.cos(phi);
    const y = wrist.y - length * Math.sin(phi);
    for (let col = 0; col < radialSegments; col += 1) {
      const theta = (col / radialSegments) * Math.PI * 2;
      positions.push(wrist.x + ringRadius * Math.cos(theta), y, wrist.z + ringRadius * Math.sin(theta));
      uvs.push(col / radialSegments, stack / stacks);
    }
  }

  const indices: number[] = [];
  for (let stack = 0; stack < stacks; stack += 1) {
    for (let col = 0; col < radialSegments; col += 1) {
      const nextCol = (col + 1) % radialSegments;
      const a = stack * radialSegments + col;
      const b = stack * radialSegments + nextCol;
      const c = (stack + 1) * radialSegments + col;
      const d = (stack + 1) * radialSegments + nextCol;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return { positions, uvs, indices, vertexCount: (stacks + 1) * radialSegments };
}

// Append one part's buffers into the running merged arrays, offsetting its indices
// by the number of vertices already placed and tagging every appended vertex with
// the part's segment index (additive: positions, uvs, indices and normals are
// untouched). The segment tag is what the overlay material reads to tint per region.
function appendPart(
  target: {
    positions: number[];
    uvs: number[];
    indices: number[];
    segments: number[];
    vertexOffset: number;
  },
  part: { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number },
  segmentIndex: number,
): void {
  for (const value of part.positions) {
    target.positions.push(value);
  }
  for (const value of part.uvs) {
    target.uvs.push(value);
  }
  for (const index of part.indices) {
    target.indices.push(index + target.vertexOffset);
  }
  for (let i = 0; i < part.vertexCount; i += 1) {
    target.segments.push(segmentIndex);
  }
  target.vertexOffset += part.vertexCount;
}

export function buildBodyGeometry(
  param: BodyParamVector,
  opts?: BuildOptions,
): BodyGeometryResult {
  const radialSegments = Math.max(6, Math.floor(opts?.radialSegments ?? DEFAULT_RADIAL_SEGMENTS));
  const verticalSegments = Math.max(
    4,
    Math.floor(opts?.verticalSegments ?? DEFAULT_VERTICAL_SEGMENTS),
  );
  const template = templateForSex(param.sex);
  const { rings, estimatedIds } = resolveRings(param, template);
  const estimatedRingIds = [...estimatedIds];

  const merged = {
    positions: [] as number[],
    uvs: [] as number[],
    indices: [] as number[],
    segments: [] as number[],
    vertexOffset: 0,
  };

  // Trunk: the central column from the glute up to the neck base, lofted through the
  // full anatomical level set with measured anchors.
  const trunk = buildTrunk(rings, template, param.heightM, radialSegments, verticalSegments);
  appendPart(merged, trunk, SEGMENT_INDEX.trunk);

  // Head follows the trunk segment.
  const head = buildHead(rings, template, param.heightM, radialSegments);
  appendPart(merged, head, SEGMENT_INDEX.trunk);

  // Arms and hands. Shoulder anchors sit just below the chest ring, offset left and
  // right by roughly half the chest width; wrists hang near the hip level.
  const chest = rings.find((r) => r.id === 'chest');
  const hip = rings.find((r) => r.id === 'hip');
  const chestY = (chest ? chest.levelN : 0.72) * param.heightM;
  const wristY = (hip ? hip.levelN : 0.52) * param.heightM;
  const chestPoints = ellipsePointsForPerimeter(
    chest ? chest.circumferenceM : template.rings[1].circumferenceM,
    chest ? chest.aspectRatio : template.rings[1].aspectRatio,
    radialSegments,
  );
  const shoulderHalfWidth = Math.max(...chestPoints.map((p) => Math.abs(p.x))) * 1.15;

  for (const arm of param.arms) {
    const sign = arm.side === 'r' ? 1 : -1;
    const armSegment = arm.side === 'r' ? SEGMENT_INDEX.right_arm : SEGMENT_INDEX.left_arm;
    const shoulder = new Vector3(sign * shoulderHalfWidth, chestY, 0);
    const wrist = new Vector3(sign * shoulderHalfWidth, wristY, 0);
    const built = buildArm(arm, template, shoulder, wrist, radialSegments, verticalSegments);
    if (built.estimated) {
      estimatedRingIds.push(arm.side === 'r' ? 'rArm' : 'lArm');
    }
    appendPart(merged, built, armSegment);
    const forearm =
      arm.forearmM === null || arm.forearmM === undefined ? template.arm.forearmM : arm.forearmM;
    // The hand follows its arm segment.
    const hand = buildHand(wrist, forearm, radialSegments);
    appendPart(merged, hand, armSegment);
  }

  // Legs: below the glute the body splits into two lofted leg tubes through the leg
  // level set (glute -> mid-thigh -> knee -> mid-calf -> ankle), each offset in X by
  // a quarter of the glute width so the two legs read as separate limbs.
  const gluteLevel = template.trunkLevels.find((l) => l.id === 'glute');
  const gluteCircumference = gluteLevel
    ? resolveTrunkLevelCircumference(gluteLevel, rings)
    : (hip ? hip.circumferenceM : template.rings[3].circumferenceM);
  const gluteAspect = gluteLevel ? gluteLevel.aspectRatio : 0.74;
  const glutePoints = ellipsePointsForPerimeter(gluteCircumference, gluteAspect, radialSegments);
  const gluteHalfWidth = Math.max(...glutePoints.map((p) => Math.abs(p.x)));
  const legOffsetX = gluteHalfWidth * 0.5;

  for (const side of ['r', 'l'] as const) {
    const sign = side === 'r' ? 1 : -1;
    const legSegment = side === 'r' ? SEGMENT_INDEX.right_leg : SEGMENT_INDEX.left_leg;
    const hipAnchor = new Vector3(sign * legOffsetX, 0, 0);
    const leg = buildLeg(side, rings, template, hipAnchor, param.heightM, radialSegments, verticalSegments);
    for (const id of leg.estimatedIds) {
      estimatedRingIds.push(id);
    }
    appendPart(merged, leg, legSegment);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(merged.positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(merged.uvs), 2));
  // Per-vertex segment tag (additive). One float per vertex, indexing SEGMENT_INDEX.
  // The overlay material reads this to tint each region; at overlay mix 0 it is unused.
  geometry.setAttribute('segment', new BufferAttribute(new Float32Array(merged.segments), 1));
  geometry.setIndex(merged.indices);
  geometry.computeVertexNormals();

  return {
    geometry,
    // Dedupe: a null leg ring is flagged once by resolveRings and again by buildLeg.
    estimatedRingIds: Array.from(new Set(estimatedRingIds)),
    dispose() {
      geometry.dispose();
    },
  };
}
