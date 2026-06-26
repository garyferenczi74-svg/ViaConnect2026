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
  const positions: number[] = [];
  const uvs: number[] = [];
  const axis = new Vector3().subVectors(wrist, shoulder);

  for (let row = 0; row < rows; row += 1) {
    const t = rows > 1 ? row / (rows - 1) : 0;
    const circumference = bicep + (forearm - bicep) * t;
    const ring = ellipsePointsForPerimeter(circumference, 0.95, radialSegments);
    const center = new Vector3().copy(shoulder).addScaledVector(axis, t);
    for (let col = 0; col < radialSegments; col += 1) {
      // The arm hangs roughly vertical, so the ring's x and z map straight to world
      // x and z around the center. This keeps the tube cheap for the wireframe pass.
      positions.push(center.x + ring[col].x, center.y, center.z + ring[col].z);
      uvs.push(col / radialSegments, t);
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

  return { positions, uvs, indices, vertexCount: rows * radialSegments, estimated };
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

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(merged.positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(merged.uvs), 2));
  geometry.setIndex(merged.indices);
  geometry.computeVertexNormals();

  return {
    geometry,
    estimatedRingIds,
    dispose() {
      geometry.dispose();
    },
  };
}
