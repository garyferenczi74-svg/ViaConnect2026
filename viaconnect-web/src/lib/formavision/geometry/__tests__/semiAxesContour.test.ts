// Prompt 210h Rev C: two different measured semi-axis sets must produce different meshes.
import { describe, it, expect } from 'vitest';
import { buildBodyGeometry } from '../buildBodyGeometry';
import { MALE_TEMPLATE } from '../types';
import type { BodyParamVector, BodyRing } from '../types';

function vectorWithAxes(
  chestA: number,
  chestB: number,
  hipA: number,
  hipB: number,
): BodyParamVector {
  const rings: BodyRing[] = MALE_TEMPLATE.rings.map((r) => {
    const base: BodyRing = {
      id: r.id,
      levelN: r.levelN,
      circumferenceM: r.circumferenceM,
      aspectRatio: r.aspectRatio,
      estimated: false,
    };
    if (r.id === 'chest') {
      base.aM = chestA;
      base.bM = chestB;
      base.aspectRatio = chestB / chestA;
    }
    if (r.id === 'hip') {
      base.aM = hipA;
      base.bM = hipB;
      base.aspectRatio = hipB / hipA;
    }
    return base;
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

describe('210h measured semi-axes shape the body', () => {
  it('a wide-shallow chest differs from a narrow-deep chest at chest height', () => {
    const wide = buildBodyGeometry(vectorWithAxes(0.2, 0.1, 0.16, 0.12));
    const deep = buildBodyGeometry(vectorWithAxes(0.12, 0.18, 0.16, 0.12));
    const y = 0.72 * MALE_TEMPLATE.heightM;
    function meanAbsX(g: typeof wide) {
      const pos = g.geometry.getAttribute('position');
      let s = 0;
      let n = 0;
      for (let i = 0; i < pos.count; i += 1) {
        if (Math.abs(pos.getY(i) - y) > 0.03) continue;
        s += Math.abs(pos.getX(i));
        n += 1;
      }
      return n > 0 ? s / n : 0;
    }
    expect(meanAbsX(wide)).toBeGreaterThan(meanAbsX(deep));
    wide.dispose();
    deep.dispose();
  });
});
