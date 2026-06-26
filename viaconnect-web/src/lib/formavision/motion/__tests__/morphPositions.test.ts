import { describe, it, expect } from 'vitest';
import { assertSameTopology, lerpPositionsInto } from '../morphPositions';
import { buildBodyGeometry } from '@/lib/formavision/geometry/buildBodyGeometry';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

function vec(heightM: number, chest: number): BodyParamVector {
  return {
    sex: 'male',
    heightM,
    rings: [
      { id: 'neck', levelN: 0.87, circumferenceM: 0.38, aspectRatio: 0.9, estimated: false },
      { id: 'chest', levelN: 0.72, circumferenceM: chest, aspectRatio: 0.7, estimated: false },
      { id: 'hip', levelN: 0.52, circumferenceM: 0.95, aspectRatio: 0.7, estimated: false },
    ],
    arms: [
      { side: 'r', bicepM: 0.32, forearmM: 0.27, estimated: false },
      { side: 'l', bicepM: 0.32, forearmM: 0.27, estimated: false },
    ],
  };
}

describe('assertSameTopology', () => {
  it('passes for two different param vectors built with the same options (real geometry)', () => {
    const opts = { radialSegments: 28, verticalSegments: 28 };
    const a = buildBodyGeometry(vec(1.7, 0.95), opts);
    const b = buildBodyGeometry(vec(1.85, 1.2), opts);
    const aPos = a.geometry.getAttribute('position').array;
    const bPos = b.geometry.getAttribute('position').array;
    // The real correctness check: differing measurements, identical buffer length.
    expect(aPos.length).toBe(bPos.length);
    expect(() => assertSameTopology(aPos, bPos)).not.toThrow();
    a.dispose();
    b.dispose();
  });

  it('throws on a length mismatch', () => {
    expect(() => assertSameTopology(new Float32Array(6), new Float32Array(9))).toThrow(
      /topology mismatch/,
    );
  });
});

describe('lerpPositionsInto', () => {
  it('writes the from endpoint at t=0 and the to endpoint at t=1', () => {
    const from = new Float32Array([0, 0, 0, 1, 1, 1]);
    const to = new Float32Array([2, 2, 2, 5, 5, 5]);
    const out = new Float32Array(6);

    lerpPositionsInto(out, from, to, 0);
    expect(Array.from(out)).toEqual([0, 0, 0, 1, 1, 1]);

    lerpPositionsInto(out, from, to, 1);
    expect(Array.from(out)).toEqual([2, 2, 2, 5, 5, 5]);
  });

  it('writes the per-component midpoint at t=0.5', () => {
    const from = new Float32Array([0, 10, -4]);
    const to = new Float32Array([2, 20, 0]);
    const out = new Float32Array(3);
    lerpPositionsInto(out, from, to, 0.5);
    expect(Array.from(out)).toEqual([1, 15, -2]);
  });

  it('throws when out length does not match', () => {
    expect(() =>
      lerpPositionsInto(new Float32Array(2), new Float32Array(3), new Float32Array(3), 0.5),
    ).toThrow(/topology mismatch/);
  });
});
