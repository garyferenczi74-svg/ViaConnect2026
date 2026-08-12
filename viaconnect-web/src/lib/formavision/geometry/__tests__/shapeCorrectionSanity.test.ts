// Prompt 210g anti-regression: geometry must not ship as pure-ellipse barrel.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBodyGeometry } from '../buildBodyGeometry';
import { anatomicalRingPoints, ellipsePointsForPerimeter } from '../ellipse';
import { correctionSpread, shapeCorrectionFactor } from '../shapeCorrection';
import { MALE_TEMPLATE, FEMALE_TEMPLATE } from '../types';
import type { BodyParamVector, BodyRing } from '../types';

function measuredVector(sex: 'male' | 'female' = 'male'): BodyParamVector {
  const template = sex === 'female' ? FEMALE_TEMPLATE : MALE_TEMPLATE;
  const rings: BodyRing[] = template.rings.map((r) => ({
    id: r.id,
    levelN: r.levelN,
    circumferenceM: r.circumferenceM,
    aspectRatio: r.aspectRatio,
    estimated: false,
  }));
  return {
    sex,
    heightM: template.heightM,
    rings,
    arms: [
      { side: 'r', bicepM: template.arm.bicepM, forearmM: template.arm.forearmM, estimated: false },
      { side: 'l', bicepM: template.arm.bicepM, forearmM: template.arm.forearmM, estimated: false },
    ],
  };
}

describe('210g shape-correction sanity', () => {
  it('torso regions have non-zero angular correction spread (not unity ellipse)', () => {
    for (const region of ['chest', 'waist', 'hip', 'glute'] as const) {
      expect(correctionSpread(region, 'male')).toBeGreaterThan(0.05);
      expect(correctionSpread(region, 'female')).toBeGreaterThan(0.05);
    }
  });

  it('anatomical chest ring differs from pure ellipse at the same perimeter', () => {
    const pure = ellipsePointsForPerimeter(1.0, 0.72, 64);
    const anatomical = anatomicalRingPoints(1.0, 0.72, 64, {
      levelId: 'chest',
      sex: 'male',
    });
    let maxDelta = 0;
    for (let i = 0; i < pure.length; i += 1) {
      maxDelta = Math.max(
        maxDelta,
        Math.hypot(pure[i].x - anatomical[i].x, pure[i].z - anatomical[i].z),
      );
    }
    expect(maxDelta).toBeGreaterThan(0.002);
  });

  it('disableShapeCorrection produces a pure ellipse (deliberate degradation path)', () => {
    const pure = ellipsePointsForPerimeter(0.9, 0.78, 64);
    const degraded = anatomicalRingPoints(0.9, 0.78, 64, {
      levelId: 'waist',
      sex: 'male',
      disableShapeCorrection: true,
    });
    for (let i = 0; i < pure.length; i += 1) {
      expect(degraded[i].x).toBeCloseTo(pure[i].x, 8);
      expect(degraded[i].z).toBeCloseTo(pure[i].z, 8);
    }
  });

  it('default build uses 64 radial samples (Rev C density)', () => {
    const result = buildBodyGeometry(measuredVector('male'));
    // One trunk control loft: verticalSegments rows * radialSegments cols is not
    // easy to isolate; assert option default by comparing 64 vs 40 vertex counts.
    const hi = buildBodyGeometry(measuredVector('male'), { radialSegments: 64 });
    const lo = buildBodyGeometry(measuredVector('male'), { radialSegments: 40 });
    expect(hi.geometry.getAttribute('position').count).toBeGreaterThan(
      lo.geometry.getAttribute('position').count,
    );
    // Default should match explicit 64.
    expect(result.geometry.getAttribute('position').count).toBe(
      hi.geometry.getAttribute('position').count,
    );
    result.dispose();
    hi.dispose();
    lo.dispose();
  });

  it('shape-corrected body differs from deliberately degraded pure-ellipse body', () => {
    const good = buildBodyGeometry(measuredVector('female'));
    const barrel = buildBodyGeometry(measuredVector('female'), {
      disableShapeCorrection: true,
    });
    const pa = good.geometry.getAttribute('position').array as Float32Array;
    const pb = barrel.geometry.getAttribute('position').array as Float32Array;
    expect(pa.length).toBe(pb.length);
    let maxDelta = 0;
    for (let i = 0; i < pa.length; i += 1) {
      maxDelta = Math.max(maxDelta, Math.abs(pa[i] - pb[i]));
    }
    expect(maxDelta).toBeGreaterThan(0.001);
    good.dispose();
    barrel.dispose();
  });

  it('head is not a free-floating sphere: base ring sits near neck Y', () => {
    const result = buildBodyGeometry(measuredVector('male'));
    const pos = result.geometry.getAttribute('position') as THREE.BufferAttribute;
    const neckY = MALE_TEMPLATE.rings.find((r) => r.id === 'neck')!.levelN * MALE_TEMPLATE.heightM;
    // Vertices of the head start at neckY and go up; require some near neckY.
    let nearNeck = 0;
    let aboveNeck = 0;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      if (y >= neckY - 0.01 && y <= neckY + 0.03) nearNeck += 1;
      if (y > neckY + 0.05) aboveNeck += 1;
    }
    expect(nearNeck).toBeGreaterThan(8);
    expect(aboveNeck).toBeGreaterThan(8);
    result.dispose();
  });

  it('arms hang with positive abduction (wrists wider than shoulders in X)', () => {
    const result = buildBodyGeometry(measuredVector('male'));
    const pos = result.geometry.getAttribute('position') as THREE.BufferAttribute;
    // Approximate: max |x| in lower-arm band should exceed max |x| near shoulder Y.
    const shoulderY =
      MALE_TEMPLATE.trunkLevels.find((l) => l.id === 'shoulder')!.levelN * MALE_TEMPLATE.heightM;
    const hipY = MALE_TEMPLATE.rings.find((r) => r.id === 'hip')!.levelN * MALE_TEMPLATE.heightM;
    let maxShoulderX = 0;
    let maxWristX = 0;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      const ax = Math.abs(pos.getX(i));
      if (Math.abs(y - shoulderY) < 0.03) maxShoulderX = Math.max(maxShoulderX, ax);
      if (Math.abs(y - hipY) < 0.04) maxWristX = Math.max(maxWristX, ax);
    }
    expect(maxWristX).toBeGreaterThan(maxShoulderX * 1.02);
    result.dispose();
  });

  it('shapeCorrectionFactor is finite and positive for all regions', () => {
    const regions = [
      'chest',
      'waist',
      'hip',
      'glute',
      'shoulder',
      'thigh',
      'arm',
      'head',
    ] as const;
    for (const region of regions) {
      for (let i = 0; i < 16; i += 1) {
        const f = shapeCorrectionFactor((i / 16) * Math.PI * 2, region, 'male');
        expect(f).toBeGreaterThan(0.5);
        expect(f).toBeLessThan(1.5);
        expect(Number.isFinite(f)).toBe(true);
      }
    }
  });
});
