import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBodyGeometry } from '../buildBodyGeometry';
import { MALE_TEMPLATE } from '../types';
import type { BodyParamVector, BodyRing } from '../types';

// Build a fully-measured male vector, then override individual ring circumferences.
function measuredVector(overrides?: Partial<Record<string, number | null>>): BodyParamVector {
  const rings: BodyRing[] = MALE_TEMPLATE.rings.map((r) => {
    const override = overrides ? overrides[r.id] : undefined;
    const circumferenceM = override === undefined ? r.circumferenceM : override;
    return {
      id: r.id,
      levelN: r.levelN,
      circumferenceM,
      aspectRatio: r.aspectRatio,
      estimated: false,
    };
  });
  return {
    sex: 'male',
    heightM: MALE_TEMPLATE.heightM,
    rings,
    arms: [
      { side: 'r', bicepM: MALE_TEMPLATE.arm.bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
      { side: 'l', bicepM: MALE_TEMPLATE.arm.bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
    ],
  };
}

// Mean radius about the per-leg center axis (xCenter) of vertices near a target Y on
// one side of the body. Sampling only x with the same sign as xCenter isolates the
// correct leg so the left leg does not pollute the right-leg measurement.
function meanRadiusAtYOnSide(
  geometry: THREE.BufferGeometry,
  targetY: number,
  bandM: number,
  xCenter: number,
): number {
  const pos = geometry.getAttribute('position');
  const sideSign = Math.sign(xCenter);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (Math.abs(y - targetY) > bandM) {
      continue;
    }
    const x = pos.getX(i);
    if (Math.sign(x) !== sideSign) {
      continue;
    }
    const z = pos.getZ(i);
    sum += Math.hypot(x - xCenter, z);
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

function boundingBox(geometry: THREE.BufferGeometry): THREE.Box3 {
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

describe('buildBodyGeometry legs', () => {
  it('extends geometry below the hip level toward the floor (legs are present)', () => {
    const hip = MALE_TEMPLATE.rings.find((r) => r.id === 'hip')!;
    const hipY = hip.levelN * MALE_TEMPLATE.heightM;
    const result = buildBodyGeometry(measuredVector());
    const box = boundingBox(result.geometry);
    // The trunk alone bottomed out near the hip; with legs the mesh must reach well
    // below the hip and approach the floor.
    expect(box.min.y).toBeLessThan(hipY * 0.5);
    expect(box.min.y).toBeLessThan(0.1 * MALE_TEMPLATE.heightM);
    result.dispose();
  });

  it('produces two distinct legs offset to the left and right of center', () => {
    const calf = MALE_TEMPLATE.rings.find((r) => r.id === 'rCalf')!;
    const calfY = calf.levelN * MALE_TEMPLATE.heightM;
    const result = buildBodyGeometry(measuredVector());
    const pos = result.geometry.getAttribute('position');
    let hasRight = false;
    let hasLeft = false;
    for (let i = 0; i < pos.count; i += 1) {
      if (Math.abs(pos.getY(i) - calfY) > 0.03) {
        continue;
      }
      if (pos.getX(i) > 0.02) {
        hasRight = true;
      }
      if (pos.getX(i) < -0.02) {
        hasLeft = true;
      }
    }
    expect(hasRight).toBe(true);
    expect(hasLeft).toBe(true);
    result.dispose();
  });

  it('geometry is the data: a thinner right thigh yields a smaller right-thigh radius', () => {
    const thigh = MALE_TEMPLATE.rings.find((r) => r.id === 'rThigh')!;
    const thighY = thigh.levelN * MALE_TEMPLATE.heightM;
    const band = 0.02;

    const lean = buildBodyGeometry(measuredVector({ rThigh: 0.46 }));
    const heavy = buildBodyGeometry(measuredVector({ rThigh: 0.68 }));

    // Find the right-leg center X from the lean build by averaging right-side thigh x.
    function rightCenterX(geometry: THREE.BufferGeometry): number {
      const pos = geometry.getAttribute('position');
      let sum = 0;
      let count = 0;
      for (let i = 0; i < pos.count; i += 1) {
        if (Math.abs(pos.getY(i) - thighY) > band) {
          continue;
        }
        const x = pos.getX(i);
        if (x > 0.02) {
          sum += x;
          count += 1;
        }
      }
      return count > 0 ? sum / count : 0;
    }

    const leanCenter = rightCenterX(lean.geometry);
    const heavyCenter = rightCenterX(heavy.geometry);

    const leanRadius = meanRadiusAtYOnSide(lean.geometry, thighY, band, leanCenter);
    const heavyRadius = meanRadiusAtYOnSide(heavy.geometry, thighY, band, heavyCenter);

    expect(leanRadius).toBeGreaterThan(0);
    expect(heavyRadius).toBeGreaterThan(0);
    expect(leanRadius).toBeLessThan(heavyRadius);

    lean.dispose();
    heavy.dispose();
  });

  it('reports null leg rings as estimated', () => {
    const result = buildBodyGeometry(measuredVector({ rThigh: null, lCalf: null }));
    expect(result.estimatedRingIds).toContain('rThigh');
    expect(result.estimatedRingIds).toContain('lCalf');
    // Measured leg rings are not reported.
    expect(result.estimatedRingIds).not.toContain('lThigh');
    expect(result.estimatedRingIds).not.toContain('rCalf');
    result.dispose();
  });

  it('stays deterministic with legs: identical vector yields identical position buffers', () => {
    const a = buildBodyGeometry(measuredVector());
    const b = buildBodyGeometry(measuredVector());
    const pa = a.geometry.getAttribute('position').array as Float32Array;
    const pb = b.geometry.getAttribute('position').array as Float32Array;
    expect(pa.length).toBe(pb.length);
    expect(Array.from(pa)).toEqual(Array.from(pb));
    a.dispose();
    b.dispose();
  });
});
