import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBodyGeometry, SEGMENT_INDEX } from '../buildBodyGeometry';
import { MALE_TEMPLATE } from '../types';
import type { BodyParamVector } from '../types';

function vector(): BodyParamVector {
  return {
    sex: 'male',
    heightM: MALE_TEMPLATE.heightM,
    rings: MALE_TEMPLATE.rings.map((r) => ({
      id: r.id,
      levelN: r.levelN,
      circumferenceM: r.circumferenceM,
      aspectRatio: r.aspectRatio,
      estimated: false,
    })),
    arms: [
      { side: 'r', bicepM: MALE_TEMPLATE.arm.bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
      { side: 'l', bicepM: MALE_TEMPLATE.arm.bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
    ],
  };
}

// Find a vertex near a world position and return its segment index. Used to assert a
// region's vertices carry the expected segment.
function segmentNear(
  geometry: THREE.BufferGeometry,
  x: number,
  y: number,
): number | null {
  const pos = geometry.getAttribute('position');
  const seg = geometry.getAttribute('segment');
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    const d = Math.hypot(pos.getX(i) - x, pos.getY(i) - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best >= 0 ? seg.getX(best) : null;
}

describe('buildBodyGeometry segment attribute', () => {
  it('emits a segment attribute with one float per vertex', () => {
    const { geometry, dispose } = buildBodyGeometry(vector());
    const pos = geometry.getAttribute('position');
    const seg = geometry.getAttribute('segment');
    expect(seg).toBeDefined();
    expect(seg.itemSize).toBe(1);
    expect(seg.count).toBe(pos.count);
    dispose();
  });

  it('tags every vertex with a valid segment index in 0..4', () => {
    const { geometry, dispose } = buildBodyGeometry(vector());
    const seg = geometry.getAttribute('segment');
    const seen = new Set<number>();
    for (let i = 0; i < seg.count; i += 1) {
      const s = seg.getX(i);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(4);
      seen.add(s);
    }
    // All five segments are present in a full body.
    expect(seen.size).toBe(5);
    dispose();
  });

  it('tags trunk vertices trunk, arm vertices their arm, leg vertices their leg', () => {
    const v = vector();
    const { geometry, dispose } = buildBodyGeometry(v);

    // A point on the central trunk near the chest height (x near 0).
    const chest = MALE_TEMPLATE.rings.find((r) => r.id === 'chest');
    const chestY = (chest ? chest.levelN : 0.72) * v.heightM;
    expect(segmentNear(geometry, 0, chestY)).toBe(SEGMENT_INDEX.trunk);

    // The right arm hangs at positive x near the hip height; the left at negative x.
    const hip = MALE_TEMPLATE.rings.find((r) => r.id === 'hip');
    const armY = (hip ? hip.levelN : 0.52) * v.heightM + 0.05;
    expect(segmentNear(geometry, 0.4, armY)).toBe(SEGMENT_INDEX.right_arm);
    expect(segmentNear(geometry, -0.4, armY)).toBe(SEGMENT_INDEX.left_arm);

    // The legs are at positive / negative x low on the body.
    const calf = MALE_TEMPLATE.rings.find((r) => r.id === 'rCalf');
    const calfY = (calf ? calf.levelN : 0.22) * v.heightM;
    expect(segmentNear(geometry, 0.1, calfY)).toBe(SEGMENT_INDEX.right_leg);
    expect(segmentNear(geometry, -0.1, calfY)).toBe(SEGMENT_INDEX.left_leg);

    dispose();
  });

  it('is deterministic: same vector yields identical segment arrays', () => {
    const a = buildBodyGeometry(vector());
    const b = buildBodyGeometry(vector());
    const sa = a.geometry.getAttribute('segment').array as Float32Array;
    const sb = b.geometry.getAttribute('segment').array as Float32Array;
    expect(sa.length).toBe(sb.length);
    for (let i = 0; i < sa.length; i += 1) {
      expect(sa[i]).toBe(sb[i]);
    }
    a.dispose();
    b.dispose();
  });

  it('exposes a stable SEGMENT_INDEX ordering', () => {
    expect(SEGMENT_INDEX).toEqual({
      right_arm: 0,
      left_arm: 1,
      trunk: 2,
      right_leg: 3,
      left_leg: 4,
    });
  });
});
