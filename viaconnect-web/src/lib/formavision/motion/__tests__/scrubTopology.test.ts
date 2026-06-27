import { describe, it, expect } from 'vitest';
import { createScrubController, type ScrubTimer } from '../scrubController';
import { sampleBodyPositions } from '@/lib/formavision/geometry/sampleBodyPositions';
import { buildBodyGeometry } from '@/lib/formavision/geometry/buildBodyGeometry';
import { MALE_TEMPLATE } from '@/lib/formavision/geometry/types';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

// A real param vector from the template with a height override so two scrub vectors
// differ in shape but share topology (same ring set, build options).
function vector(heightM: number, chest: number): BodyParamVector {
  return {
    sex: 'male',
    heightM,
    rings: MALE_TEMPLATE.rings.map((r) => ({
      id: r.id,
      levelN: r.levelN,
      circumferenceM: r.id === 'chest' ? chest : r.circumferenceM,
      aspectRatio: r.aspectRatio,
      estimated: false,
    })),
    arms: [
      { side: 'r', bicepM: MALE_TEMPLATE.arm.bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
      { side: 'l', bicepM: MALE_TEMPLATE.arm.bicepM, forearmM: MALE_TEMPLATE.arm.forearmM, estimated: false },
    ],
  };
}

const BUILD = { radialSegments: 28, verticalSegments: 28 };

function passiveTimer(): ScrubTimer {
  return { set: () => 1, clear: () => undefined };
}

describe('scrub topology invariance (position length + segment attribute)', () => {
  it('two different scrub vectors sample equal-length position buffers', () => {
    const a = sampleBodyPositions(vector(1.7, 0.95), BUILD);
    const b = sampleBodyPositions(vector(1.9, 1.2), BUILD);
    expect(a.length).toBe(b.length);
  });

  it('the segment attribute length and values are invariant across scrub vectors', () => {
    const a = buildBodyGeometry(vector(1.7, 0.95), BUILD);
    const b = buildBodyGeometry(vector(1.9, 1.2), BUILD);
    const sa = a.geometry.getAttribute('segment').array as Float32Array;
    const sb = b.geometry.getAttribute('segment').array as Float32Array;
    expect(sa.length).toBe(sb.length);
    for (let i = 0; i < sa.length; i += 1) {
      expect(sa[i]).toBe(sb[i]);
    }
    a.dispose();
    b.dispose();
  });

  it('scrubbing writes equal-length buffers on every change (fixed topology)', () => {
    const writes: number[] = [];
    const controller = createScrubController({
      samplePositions: (v) => sampleBodyPositions(v, BUILD),
      writePositions: (p) => writes.push(p.length),
      recomputeNormals: () => undefined,
      timer: passiveTimer(),
    });
    controller.scrubTo(vector(1.65, 0.9));
    controller.scrubTo(vector(1.85, 1.15));
    controller.scrubTo(vector(2.0, 1.3));
    expect(new Set(writes).size).toBe(1);
  });
});
