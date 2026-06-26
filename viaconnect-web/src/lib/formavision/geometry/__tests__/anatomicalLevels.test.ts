import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBodyGeometry } from '../buildBodyGeometry';
import { MALE_TEMPLATE } from '../types';
import type { BodyParamVector, BodyRing } from '../types';

function measuredVector(overrides?: Partial<Record<string, number | null>>): BodyParamVector {
  const rings: BodyRing[] = MALE_TEMPLATE.rings.map((r) => {
    const override = overrides ? overrides[r.id] : undefined;
    const circumferenceM = override === undefined ? r.circumferenceM : override;
    return { id: r.id, levelN: r.levelN, circumferenceM, aspectRatio: r.aspectRatio, estimated: false };
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

// Mean radius about a per-leg center axis on one side at a target Y. Isolates one
// leg so the other leg and the trunk do not pollute the sample.
function meanLegRadiusAtY(
  geometry: THREE.BufferGeometry,
  targetY: number,
  bandM: number,
  sideSign: 1 | -1,
): number {
  const pos = geometry.getAttribute('position');
  // First find this leg's center X at the target Y.
  let cxSum = 0;
  let cxCount = 0;
  for (let i = 0; i < pos.count; i += 1) {
    if (Math.abs(pos.getY(i) - targetY) > bandM) continue;
    const x = pos.getX(i);
    if (Math.sign(x) !== sideSign) continue;
    cxSum += x;
    cxCount += 1;
  }
  if (cxCount === 0) return 0;
  const cx = cxSum / cxCount;
  let rSum = 0;
  let rCount = 0;
  for (let i = 0; i < pos.count; i += 1) {
    if (Math.abs(pos.getY(i) - targetY) > bandM) continue;
    const x = pos.getX(i);
    if (Math.sign(x) !== sideSign) continue;
    rSum += Math.hypot(x - cx, pos.getZ(i));
    rCount += 1;
  }
  return rCount > 0 ? rSum / rCount : 0;
}

const H = MALE_TEMPLATE.heightM;
function levelY(id: string): number {
  return MALE_TEMPLATE.trunkLevels.find((l) => l.id === id)!.levelN * H;
}

describe('anatomical level taper', () => {
  it('the leg tapers ankle < mid-calf and knee < mid-thigh on the right leg', () => {
    const result = buildBodyGeometry(measuredVector());
    const ankle = meanLegRadiusAtY(result.geometry, levelY('ankle'), 0.02, 1);
    const midCalf = meanLegRadiusAtY(result.geometry, levelY('midCalf'), 0.02, 1);
    const knee = meanLegRadiusAtY(result.geometry, levelY('knee'), 0.02, 1);
    const midThigh = meanLegRadiusAtY(result.geometry, levelY('midThigh'), 0.02, 1);

    expect(ankle).toBeGreaterThan(0);
    expect(midCalf).toBeGreaterThan(0);
    expect(knee).toBeGreaterThan(0);
    expect(midThigh).toBeGreaterThan(0);
    // Ankle is the narrowest; the thigh is wider than the knee.
    expect(ankle).toBeLessThan(midCalf);
    expect(knee).toBeLessThan(midThigh);
    result.dispose();
  });

  it('the silhouette spans the new structural levels between the measured rings', () => {
    const result = buildBodyGeometry(measuredVector());
    const pos = result.geometry.getAttribute('position');
    const ys: number[] = [];
    for (let i = 0; i < pos.count; i += 1) {
      ys.push(pos.getY(i));
    }
    // Geometry exists at the structural knee and low-waist levels (not just at the
    // sparse measured rings), proving the loft is enriched.
    const hasNear = (y: number) => ys.some((yy) => Math.abs(yy - y) < 0.02);
    expect(hasNear(levelY('knee'))).toBe(true);
    expect(hasNear(levelY('lowWaist'))).toBe(true);
    expect(hasNear(levelY('shoulder'))).toBe(true);
    result.dispose();
  });
});

describe('measured anchors hold under enrichment', () => {
  it('navel-waist radius tracks the waist circumference', () => {
    const lean = buildBodyGeometry(measuredVector({ waist: 0.7 }));
    const heavy = buildBodyGeometry(measuredVector({ waist: 1.1 }));
    const y = levelY('navelWaist');
    // Sample only the trunk near center (within the body half-width) to avoid arms.
    function trunkRadius(g: THREE.BufferGeometry): number {
      const pos = g.getAttribute('position');
      let sum = 0;
      let count = 0;
      for (let i = 0; i < pos.count; i += 1) {
        if (Math.abs(pos.getY(i) - y) > 0.015) continue;
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const r = Math.hypot(x, z);
        // Trunk waist radius is well under 0.3 m; arm columns sit far out in X.
        if (Math.abs(x) > 0.35) continue;
        sum += r;
        count += 1;
      }
      return count > 0 ? sum / count : 0;
    }
    expect(trunkRadius(lean.geometry)).toBeGreaterThan(0);
    expect(trunkRadius(lean.geometry)).toBeLessThan(trunkRadius(heavy.geometry));
    lean.dispose();
    heavy.dispose();
  });

  it('mid-thigh radius tracks the quad circumference on the right leg', () => {
    const lean = buildBodyGeometry(measuredVector({ rThigh: 0.46 }));
    const heavy = buildBodyGeometry(measuredVector({ rThigh: 0.68 }));
    const y = levelY('midThigh');
    const leanR = meanLegRadiusAtY(lean.geometry, y, 0.02, 1);
    const heavyR = meanLegRadiusAtY(heavy.geometry, y, 0.02, 1);
    expect(leanR).toBeGreaterThan(0);
    expect(leanR).toBeLessThan(heavyR);
    lean.dispose();
    heavy.dispose();
  });

  it('mid-upper-arm extent tracks the bicep circumference', () => {
    // A bigger bicep widens the arm ring at the mid-upper-arm level, pushing the
    // body's maximum X outward at that band. The arms are the outermost geometry in
    // X, so the max X extent at the arm band is a clean proxy for the arm girth.
    const shoulderY = levelY('chest');
    const wristY = MALE_TEMPLATE.rings.find((r) => r.id === 'hip')!.levelN * H;
    const armY = shoulderY + (wristY - shoulderY) * 0.28;

    function maxXAt(bicepM: number): number {
      const v = measuredVector();
      v.arms = [
        { side: 'r', bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
        { side: 'l', bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
      ];
      const result = buildBodyGeometry(v);
      const pos = result.geometry.getAttribute('position');
      let maxX = 0;
      for (let i = 0; i < pos.count; i += 1) {
        if (Math.abs(pos.getY(i) - armY) > 0.03) continue;
        maxX = Math.max(maxX, pos.getX(i));
      }
      result.dispose();
      return maxX;
    }

    const lean = maxXAt(0.27);
    const heavy = maxXAt(0.45);
    expect(lean).toBeGreaterThan(0);
    expect(lean).toBeLessThan(heavy);
  });
});

describe('structural levels are not flagged estimated', () => {
  it('a fully measured body reports no estimated ids, including no structural ids', () => {
    const result = buildBodyGeometry(measuredVector());
    expect(result.estimatedRingIds).toEqual([]);
    // Structural level ids never appear in the estimated list.
    for (const id of ['ankle', 'knee', 'glute', 'lowWaist', 'shoulder']) {
      expect(result.estimatedRingIds).not.toContain(id);
    }
    result.dispose();
  });

  it('a null waist still flags waist but never the structural low-waist level', () => {
    const result = buildBodyGeometry(measuredVector({ waist: null }));
    expect(result.estimatedRingIds).toContain('waist');
    expect(result.estimatedRingIds).not.toContain('lowWaist');
    expect(result.estimatedRingIds).not.toContain('navelWaist');
    result.dispose();
  });
});

describe('40 radial points per ring', () => {
  it('uses 40 radial segments by default', () => {
    const result = buildBodyGeometry(measuredVector());
    const pos = result.geometry.getAttribute('position');
    // Every part is a multiple of the radial segment count, so the total vertex
    // count is divisible by 40.
    expect(pos.count % 40).toBe(0);
    result.dispose();
  });
});
