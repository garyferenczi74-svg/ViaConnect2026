import { describe, it, expect } from 'vitest';
import { lerpParamVector } from '../lerpParamVector';
import { MALE_TEMPLATE, templateForSex } from '../types';
import type { BodyParamVector, BodyRing } from '../types';

function ringsFromTemplate(overrides?: Partial<Record<string, number | null>>): BodyRing[] {
  return MALE_TEMPLATE.rings.map((r) => {
    const o = overrides ? overrides[r.id] : undefined;
    return {
      id: r.id,
      levelN: r.levelN,
      circumferenceM: o === undefined ? r.circumferenceM : o,
      aspectRatio: r.aspectRatio,
      estimated: o === null,
    };
  });
}

function vector(opts: {
  heightM: number;
  ringOverrides?: Partial<Record<string, number | null>>;
  bicepM?: number | null;
  forearmM?: number | null;
}): BodyParamVector {
  return {
    sex: 'male',
    heightM: opts.heightM,
    rings: ringsFromTemplate(opts.ringOverrides),
    arms: [
      {
        side: 'r',
        bicepM: opts.bicepM === undefined ? MALE_TEMPLATE.arm.bicepM : opts.bicepM,
        forearmM: opts.forearmM === undefined ? MALE_TEMPLATE.arm.forearmM : opts.forearmM,
        estimated: opts.bicepM === null || opts.forearmM === null,
      },
      {
        side: 'l',
        bicepM: MALE_TEMPLATE.arm.bicepM,
        forearmM: MALE_TEMPLATE.arm.forearmM,
        estimated: false,
      },
    ],
  };
}

function ring(v: BodyParamVector, id: string): BodyRing {
  return v.rings.find((r) => r.id === id)!;
}

const tpl = templateForSex('male');
function tplCirc(id: string): number {
  return tpl.rings.find((r) => r.id === id)!.circumferenceM;
}

describe('lerpParamVector endpoints', () => {
  it('t=0 returns the from vector with circumferences template-resolved', () => {
    const from = vector({ heightM: 1.7, ringOverrides: { waist: 0.8 } });
    const to = vector({ heightM: 1.9, ringOverrides: { waist: 1.1 } });
    const out = lerpParamVector(from, to, 0);
    expect(out.heightM).toBeCloseTo(1.7, 9);
    expect(ring(out, 'waist').circumferenceM).toBeCloseTo(0.8, 9);
  });

  it('t=1 returns the to vector with circumferences template-resolved', () => {
    const from = vector({ heightM: 1.7, ringOverrides: { waist: 0.8 } });
    const to = vector({ heightM: 1.9, ringOverrides: { waist: 1.1 } });
    const out = lerpParamVector(from, to, 1);
    expect(out.heightM).toBeCloseTo(1.9, 9);
    expect(ring(out, 'waist').circumferenceM).toBeCloseTo(1.1, 9);
  });
});

describe('lerpParamVector midpoint', () => {
  it('t=0.5 is the midpoint of each circumference, height and aspect ratio', () => {
    const from = vector({ heightM: 1.7, ringOverrides: { waist: 0.8, chest: 0.9 } });
    const to = vector({ heightM: 1.9, ringOverrides: { waist: 1.2, chest: 1.1 } });
    const out = lerpParamVector(from, to, 0.5);
    expect(out.heightM).toBeCloseTo(1.8, 9);
    expect(ring(out, 'waist').circumferenceM).toBeCloseTo(1.0, 9);
    expect(ring(out, 'chest').circumferenceM).toBeCloseTo(1.0, 9);
  });

  it('lerps arm bicep and forearm at the midpoint', () => {
    const from = vector({ heightM: 1.75, bicepM: 0.3, forearmM: 0.24 });
    const to = vector({ heightM: 1.75, bicepM: 0.4, forearmM: 0.28 });
    const out = lerpParamVector(from, to, 0.5);
    const rArm = out.arms.find((a) => a.side === 'r')!;
    expect(rArm.bicepM).toBeCloseTo(0.35, 9);
    expect(rArm.forearmM).toBeCloseTo(0.26, 9);
  });
});

describe('lerpParamVector UNKNOWN via template', () => {
  it('resolves a null ring on one side to the template before lerping (no NaN, no hole)', () => {
    const from = vector({ ringOverrides: { waist: null }, heightM: 1.75 });
    const to = vector({ ringOverrides: { waist: 1.1 }, heightM: 1.75 });
    const out = lerpParamVector(from, to, 0.5);
    const waist = ring(out, 'waist');
    const expectedMid = (tplCirc('waist') + 1.1) / 2;
    expect(waist.circumferenceM).not.toBeNull();
    expect(Number.isNaN(waist.circumferenceM as number)).toBe(false);
    expect(waist.circumferenceM).toBeCloseTo(expectedMid, 9);
  });

  it('resolves a null arm via template before lerping', () => {
    const from = vector({ heightM: 1.75, bicepM: null, forearmM: null });
    const to = vector({ heightM: 1.75, bicepM: 0.4, forearmM: 0.3 });
    const out = lerpParamVector(from, to, 0.5);
    const rArm = out.arms.find((a) => a.side === 'r')!;
    expect(rArm.bicepM).toBeCloseTo((tpl.arm.bicepM + 0.4) / 2, 9);
    expect(rArm.forearmM).toBeCloseTo((tpl.arm.forearmM + 0.3) / 2, 9);
  });

  it('never produces a null or NaN circumference anywhere in the result', () => {
    const from = vector({ ringOverrides: { waist: null, chest: null }, heightM: 1.75 });
    const to = vector({ ringOverrides: { hip: null }, heightM: 1.75 });
    const out = lerpParamVector(from, to, 0.3);
    for (const r of out.rings) {
      expect(r.circumferenceM).not.toBeNull();
      expect(Number.isNaN(r.circumferenceM as number)).toBe(false);
    }
    for (const a of out.arms) {
      expect(Number.isNaN(a.bicepM as number)).toBe(false);
      expect(Number.isNaN(a.forearmM as number)).toBe(false);
    }
  });
});

describe('lerpParamVector estimated flags follow the target', () => {
  it('ring estimated flag mirrors the to side, not the from side', () => {
    // from waist measured, to waist null (unknown in the destination scan).
    const from = vector({ ringOverrides: { waist: 0.9 }, heightM: 1.75 });
    const to = vector({ ringOverrides: { waist: null }, heightM: 1.75 });
    const out = lerpParamVector(from, to, 0.5);
    // The destination did not measure the waist, so the result honestly reports it.
    expect(ring(out, 'waist').estimated).toBe(true);

    // Reverse: from null, to measured -> result is not estimated.
    const out2 = lerpParamVector(to, from, 0.5);
    expect(ring(out2, 'waist').estimated).toBe(false);
  });

  it('arm estimated flag mirrors the to side', () => {
    const from = vector({ heightM: 1.75, bicepM: 0.33, forearmM: 0.27 });
    const to = vector({ heightM: 1.75, bicepM: null, forearmM: null });
    const out = lerpParamVector(from, to, 0.5);
    expect(out.arms.find((a) => a.side === 'r')!.estimated).toBe(true);
  });
});

describe('lerpParamVector topology and structure', () => {
  it('preserves ring and arm structure (ids, count, levelN) so a position lerp is valid', () => {
    const from = vector({ heightM: 1.7 });
    const to = vector({ heightM: 1.9 });
    const out = lerpParamVector(from, to, 0.5);
    expect(out.rings.map((r) => r.id)).toEqual(to.rings.map((r) => r.id));
    expect(out.arms.map((a) => a.side)).toEqual(to.arms.map((a) => a.side));
    for (const r of out.rings) {
      const target = to.rings.find((x) => x.id === r.id)!;
      expect(r.levelN).toBe(target.levelN);
    }
    expect(out.sex).toBe(to.sex);
  });
});

describe('lerpParamVector determinism', () => {
  it('same inputs produce deeply equal output', () => {
    const from = vector({ heightM: 1.7, ringOverrides: { waist: 0.8, hip: null } });
    const to = vector({ heightM: 1.9, ringOverrides: { waist: 1.1 } });
    expect(lerpParamVector(from, to, 0.42)).toEqual(lerpParamVector(from, to, 0.42));
  });
});
