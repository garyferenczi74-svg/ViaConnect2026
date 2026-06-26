import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBodyGeometry } from '../buildBodyGeometry';
import { MALE_TEMPLATE } from '../types';
import type { BodyParamVector, BodyRing } from '../types';

// Build a measured vector from the male template so every test starts from a
// known plausible body, then override individual rings as needed.
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

// Mean radius of the vertices nearest to a given world Y. Used to compare waist
// girth between a lean and a heavy vector: smaller circumference => smaller radius.
function meanRadiusAtY(geometry: THREE.BufferGeometry, targetY: number, bandM: number): number {
  const pos = geometry.getAttribute('position');
  let sum = 0;
  let count = 0;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (Math.abs(y - targetY) <= bandM) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      sum += Math.hypot(x, z);
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

describe('buildBodyGeometry', () => {
  it('returns a non-empty indexed geometry with matching position, normal and uv counts', () => {
    const result = buildBodyGeometry(measuredVector());
    const geometry = result.geometry;
    const pos = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    expect(geometry.getIndex()).not.toBeNull();
    expect(pos.count).toBeGreaterThan(0);
    expect(geometry.getIndex()!.count).toBeGreaterThan(0);
    expect(normal.count).toBe(pos.count);
    expect(uv.count).toBe(pos.count);
    // UVs are within the unit square so a cell-grain texture tiles cleanly.
    for (let i = 0; i < uv.count; i += 1) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(i)).toBeLessThanOrEqual(1);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(i)).toBeLessThanOrEqual(1);
    }
    result.dispose();
  });

  it('is deterministic: two calls with the same vector produce identical position arrays', () => {
    const a = buildBodyGeometry(measuredVector());
    const b = buildBodyGeometry(measuredVector());
    const pa = a.geometry.getAttribute('position').array as Float32Array;
    const pb = b.geometry.getAttribute('position').array as Float32Array;
    expect(pa.length).toBe(pb.length);
    expect(Array.from(pa)).toEqual(Array.from(pb));
    a.dispose();
    b.dispose();
  });

  it('falls back to the template for a null waist circumference and reports it as estimated', () => {
    const result = buildBodyGeometry(measuredVector({ waist: null }));
    expect(result.estimatedRingIds).toContain('waist');
    // The geometry still builds with finite positions.
    const pos = result.geometry.getAttribute('position');
    expect(pos.count).toBeGreaterThan(0);
    expect(Number.isFinite(pos.getX(0))).toBe(true);
    result.dispose();
  });

  it('does not report measured rings as estimated', () => {
    const result = buildBodyGeometry(measuredVector());
    expect(result.estimatedRingIds).not.toContain('waist');
    expect(result.estimatedRingIds).not.toContain('chest');
    result.dispose();
  });

  it('geometry is the data: a leaner waist produces a smaller waist-level radius', () => {
    const waistRing = MALE_TEMPLATE.rings.find((r) => r.id === 'waist')!;
    const waistY = waistRing.levelN * MALE_TEMPLATE.heightM;
    const band = 0.02;

    const lean = buildBodyGeometry(measuredVector({ waist: 0.7 }));
    const heavy = buildBodyGeometry(measuredVector({ waist: 1.1 }));

    const leanRadius = meanRadiusAtY(lean.geometry, waistY, band);
    const heavyRadius = meanRadiusAtY(heavy.geometry, waistY, band);

    expect(leanRadius).toBeGreaterThan(0);
    expect(heavyRadius).toBeGreaterThan(0);
    expect(leanRadius).toBeLessThan(heavyRadius);

    lean.dispose();
    heavy.dispose();
  });

  it('reports estimated arms when arm circumferences are null', () => {
    const v = measuredVector();
    v.arms = [
      { side: 'r', bicepM: null, forearmM: null, estimated: true },
      { side: 'l', bicepM: MALE_TEMPLATE.arm.bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
    ];
    const result = buildBodyGeometry(v);
    expect(result.estimatedRingIds).toContain('rArm');
    expect(result.estimatedRingIds).not.toContain('lArm');
    result.dispose();
  });

  it('respects a requested radial segment count by raising the vertex count', () => {
    const low = buildBodyGeometry(measuredVector(), { radialSegments: 12 });
    const high = buildBodyGeometry(measuredVector(), { radialSegments: 32 });
    expect(high.geometry.getAttribute('position').count).toBeGreaterThan(
      low.geometry.getAttribute('position').count,
    );
    low.dispose();
    high.dispose();
  });
});
