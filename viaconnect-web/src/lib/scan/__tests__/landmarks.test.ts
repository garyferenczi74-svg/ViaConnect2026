import { describe, it, expect } from 'vitest';
import { LM, vis, distX, midpointX } from '../landmarks';
import type { Landmark } from '../types';

const L = (x: number, v = 1): Landmark => ({ x, y: 0, z: 0, visibility: v, presence: v });

describe('landmark helpers', () => {
  it('maps anatomical indices', () => {
    expect(LM.lShoulder).toBe(11);
    expect(LM.rShoulder).toBe(12);
    expect(LM.lAnkle).toBe(27);
  });
  it('reads visibility and horizontal distance', () => {
    const lms = Array.from({ length: 33 }, () => L(0));
    lms[LM.lShoulder] = L(0.3);
    lms[LM.rShoulder] = L(0.7);
    expect(distX(lms[LM.lShoulder], lms[LM.rShoulder])).toBeCloseTo(0.4);
    expect(midpointX(lms[LM.lShoulder], lms[LM.rShoulder])).toBeCloseTo(0.5);
    expect(vis(lms, LM.lShoulder)).toBe(1);
  });
});
