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
  ArmParam,
  BodyParamVector,
  BodyRing,
  BodyTemplate,
} from './types';

export interface BuildOptions {
  // Points around each ring. More segments give a rounder cross-section.
  radialSegments?: number;
  // Interpolated rows produced between the sparse measured rings along the body.
  verticalSegments?: number;
}

export interface BodyGeometryResult {
  geometry: BufferGeometry;
  // Every ring or limb that fell back to a template default (UNKNOWN measurement),
  // so the render layer can mark it as estimated.
  estimatedRingIds: string[];
  dispose(): void;
}

const DEFAULT_RADIAL_SEGMENTS = 24;
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

// The torso-and-legs stack uses only the central column rings (neck through hip).
// Thigh and calf rings belong to the legs, which for this foundation pass are folded
// into the same lofted trunk so the silhouette stays a single closed surface.
const TRUNK_RING_IDS = ['hip', 'waist', 'chest', 'neck'];

// Build the smooth trunk skin. For each radial column we sample the measured rings,
// fit a Catmull-Rom curve through them in 3D, then resample the curve at
// verticalSegments rows so the skin interpolates rather than facets.
function buildTrunk(
  rings: ResolvedRing[],
  heightM: number,
  radialSegments: number,
  verticalSegments: number,
): { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number } {
  const trunkRings = TRUNK_RING_IDS.map((id) => rings.find((r) => r.id === id)).filter(
    (r): r is ResolvedRing => r !== undefined,
  );
  // Order trunk rings foot-to-head along Y so the curve runs bottom to top.
  trunkRings.sort((a, b) => a.levelN - b.levelN);

  // Precompute the ellipse ring points for each measured trunk ring.
  const ringPoints = trunkRings.map((r) =>
    ellipsePointsForPerimeter(r.circumferenceM, r.aspectRatio, radialSegments),
  );
  const ringY = trunkRings.map((r) => r.levelN * heightM);

  const positions: number[] = [];
  const uvs: number[] = [];

  // One Catmull-Rom curve per radial column, sampled at verticalSegments rows.
  const rows = verticalSegments;
  const columnCurves: CatmullRomCurve3[] = [];
  for (let col = 0; col < radialSegments; col += 1) {
    const controlPoints: Vector3[] = ringPoints.map(
      (ring, ringIndex) => new Vector3(ring[col].x, ringY[ringIndex], ring[col].z),
    );
    columnCurves.push(new CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5));
  }

  for (let row = 0; row < rows; row += 1) {
    const v = rows > 1 ? row / (rows - 1) : 0;
    for (let col = 0; col < radialSegments; col += 1) {
      const point = columnCurves[col].getPoint(v);
      positions.push(point.x, point.y, point.z);
      const u = col / radialSegments;
      uvs.push(u, v);
    }
  }

  const indices: number[] = [];
  for (let row = 0; row < rows - 1; row += 1) {
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

  return { positions, uvs, indices, vertexCount: rows * radialSegments };
}

interface LimbControl {
  // World position of this control ring's center.
  center: Vector3;
  // Cross-section circumference in meters at this control ring.
  circumferenceM: number;
}

// Loft a tapered limb tube through an ordered list of control rings (top to bottom).
// Cross-section circumferences are linearly interpolated between adjacent controls,
// and each row's ring is laid flat in world x/z around the interpolated center. The
// arms and the legs both use this so the lofting stays DRY.
function buildLimb(
  controls: LimbControl[],
  aspectRatio: number,
  rows: number,
  radialSegments: number,
): { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number } {
  const rowCount = Math.max(2, Math.floor(rows));
  const segments = Math.max(1, controls.length - 1);
  const positions: number[] = [];
  const uvs: number[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    const t = rowCount > 1 ? row / (rowCount - 1) : 0;
    // Map the global parameter t onto the piecewise-linear control chain.
    const scaled = t * segments;
    const seg = Math.min(segments - 1, Math.floor(scaled));
    const local = scaled - seg;
    const top = controls[seg];
    const bottom = controls[seg + 1];
    const circumference = top.circumferenceM + (bottom.circumferenceM - top.circumferenceM) * local;
    const center = new Vector3().copy(top.center).lerp(bottom.center, local);
    const ring = ellipsePointsForPerimeter(circumference, aspectRatio, radialSegments);
    for (let col = 0; col < radialSegments; col += 1) {
      positions.push(center.x + ring[col].x, center.y, center.z + ring[col].z);
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

  return { positions, uvs, indices, vertexCount: rowCount * radialSegments };
}

// Loft a tapered arm tube from a shoulder anchor down to a wrist anchor, using the
// bicep circumference at the top and the forearm circumference at the bottom.
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

  const rows = Math.max(2, Math.floor(verticalSegments / 4));
  const limb = buildLimb(
    [
      { center: shoulder, circumferenceM: bicep },
      { center: wrist, circumferenceM: forearm },
    ],
    0.95,
    rows,
    radialSegments,
  );
  return { ...limb, estimated };
}

// Resolve a leg ring's circumference against the template, tracking whether it fell
// back. side is 'r' or 'l'; region is 'Thigh' or 'Calf'.
function resolveLegRing(
  rings: ResolvedRing[],
  template: BodyTemplate,
  id: string,
): { circumferenceM: number; aspectRatio: number; levelN: number; estimated: boolean } {
  const ring = rings.find((r) => r.id === id);
  if (ring) {
    return {
      circumferenceM: ring.circumferenceM,
      aspectRatio: ring.aspectRatio,
      levelN: ring.levelN,
      estimated: ring.estimated,
    };
  }
  const templateRing = template.rings.find((r) => r.id === id);
  const fallback = templateRing ?? { circumferenceM: 0.45, aspectRatio: 0.92, levelN: 0.3 };
  return {
    circumferenceM: fallback.circumferenceM,
    aspectRatio: fallback.aspectRatio,
    levelN: fallback.levelN,
    estimated: true,
  };
}

// Build one leg: a tapered tube from a hip anchor down through the thigh and calf
// rings to an ankle, capped with a flat-ish foot cap below the ankle.
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
  const thigh = resolveLegRing(rings, template, thighId);
  const calf = resolveLegRing(rings, template, calfId);

  const estimatedIds: string[] = [];
  if (thigh.estimated) {
    estimatedIds.push(thighId);
  }
  if (calf.estimated) {
    estimatedIds.push(calfId);
  }

  const thighY = thigh.levelN * heightM;
  const calfY = calf.levelN * heightM;
  // Ankle sits a short, calf-derived distance below the calf ring, near the floor.
  const ankleY = Math.max(0.04 * heightM, calfY - 0.12 * heightM);
  const ankleCircumference = calf.circumferenceM * 0.62;
  const aspect = (thigh.aspectRatio + calf.aspectRatio) / 2;

  const rows = Math.max(3, Math.floor(verticalSegments / 3));
  const limb = buildLimb(
    [
      { center: hipAnchor, circumferenceM: thigh.circumferenceM },
      { center: new Vector3(hipAnchor.x, thighY, 0), circumferenceM: thigh.circumferenceM },
      { center: new Vector3(hipAnchor.x, calfY, 0), circumferenceM: calf.circumferenceM },
      { center: new Vector3(hipAnchor.x, ankleY, 0), circumferenceM: ankleCircumference },
    ],
    aspect,
    rows,
    radialSegments,
  );

  // Foot cap: a forward-projecting flat ovoid from the ankle toward +z (the front).
  const ankle = new Vector3(hipAnchor.x, ankleY, 0);
  const foot = buildFoot(ankle, ankleCircumference, radialSegments);

  const merged = { positions: [...limb.positions], uvs: [...limb.uvs], indices: [...limb.indices], vertexOffset: limb.vertexCount };
  appendPart(merged, foot);

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
// by the number of vertices already placed.
function appendPart(
  target: { positions: number[]; uvs: number[]; indices: number[]; vertexOffset: number },
  part: { positions: number[]; uvs: number[]; indices: number[]; vertexCount: number },
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

  const merged = { positions: [] as number[], uvs: [] as number[], indices: [] as number[], vertexOffset: 0 };

  // Trunk (torso and legs folded into one lofted skin).
  const trunk = buildTrunk(rings, param.heightM, radialSegments, verticalSegments);
  appendPart(merged, trunk);

  // Head.
  const head = buildHead(rings, template, param.heightM, radialSegments);
  appendPart(merged, head);

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
    const shoulder = new Vector3(sign * shoulderHalfWidth, chestY, 0);
    const wrist = new Vector3(sign * shoulderHalfWidth, wristY, 0);
    const built = buildArm(arm, template, shoulder, wrist, radialSegments, verticalSegments);
    if (built.estimated) {
      estimatedRingIds.push(arm.side === 'r' ? 'rArm' : 'lArm');
    }
    appendPart(merged, built);
    const forearm =
      arm.forearmM === null || arm.forearmM === undefined ? template.arm.forearmM : arm.forearmM;
    const hand = buildHand(wrist, forearm, radialSegments);
    appendPart(merged, hand);
  }

  // Legs: below the hip ring the body splits into two lofted leg tubes. Each leg is
  // anchored under its side of the hip (offset in X by a quarter of the hip width so
  // the two legs read as separate limbs), then lofted hip -> thigh -> calf -> ankle
  // and capped with a foot.
  const hipPoints = ellipsePointsForPerimeter(
    hip ? hip.circumferenceM : template.rings[3].circumferenceM,
    hip ? hip.aspectRatio : template.rings[3].aspectRatio,
    radialSegments,
  );
  const hipHalfWidth = Math.max(...hipPoints.map((p) => Math.abs(p.x)));
  const hipY = (hip ? hip.levelN : 0.52) * param.heightM;
  const legOffsetX = hipHalfWidth * 0.5;

  for (const side of ['r', 'l'] as const) {
    const sign = side === 'r' ? 1 : -1;
    const hipAnchor = new Vector3(sign * legOffsetX, hipY, 0);
    const leg = buildLeg(side, rings, template, hipAnchor, param.heightM, radialSegments, verticalSegments);
    for (const id of leg.estimatedIds) {
      estimatedRingIds.push(id);
    }
    appendPart(merged, leg);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(merged.positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(merged.uvs), 2));
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
