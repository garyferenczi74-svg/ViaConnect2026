import { describe, it, expect } from 'vitest';
import { scanToParamVector } from '../scanToParamVector';
import { MALE_TEMPLATE, FEMALE_TEMPLATE } from '../types';
import type { CircumferenceMeasurements } from '@/lib/body-tracker/circumference';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';

function ring(vector: ReturnType<typeof scanToParamVector>, id: string) {
  return vector.rings.find((r) => r.id === id)!;
}

function arm(vector: ReturnType<typeof scanToParamVector>, side: 'r' | 'l') {
  return vector.arms.find((a) => a.side === side)!;
}

// A measurements object with only the named keys set, the rest null.
function measure(values: Partial<CircumferenceMeasurements>): CircumferenceMeasurements {
  return { ...emptyMeasurements(), ...values };
}

describe('scanToParamVector unit conversion', () => {
  it('converts inches to meters for a known waist value', () => {
    // 32 inches = 0.8128 meters.
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ waist: 32 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    expect(ring(v, 'waist').circumferenceM).toBeCloseTo(0.8128, 4);
    expect(ring(v, 'waist').estimated).toBe(false);
  });

  it('converts centimeters to meters for a known waist value', () => {
    // 80 cm = 0.80 meters.
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ waist: 80 }),
      sex: 'male',
      heightCm: null,
      unit: 'cm',
    });
    expect(ring(v, 'waist').circumferenceM).toBeCloseTo(0.8, 6);
  });

  it('defaults to inches when no unit is supplied', () => {
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ waist: 32 }),
      sex: 'male',
      heightCm: null,
    });
    expect(ring(v, 'waist').circumferenceM).toBeCloseTo(0.8128, 4);
  });
});

describe('scanToParamVector height', () => {
  it('converts heightCm to meters', () => {
    const v = scanToParamVector({
      snapshot: null,
      circumferences: null,
      sex: 'male',
      heightCm: 180,
    });
    expect(v.heightM).toBeCloseTo(1.8, 6);
  });

  it('uses the sex template height when heightCm is null', () => {
    const male = scanToParamVector({ snapshot: null, circumferences: null, sex: 'male', heightCm: null });
    const female = scanToParamVector({ snapshot: null, circumferences: null, sex: 'female', heightCm: null });
    expect(male.heightM).toBe(MALE_TEMPLATE.heightM);
    expect(female.heightM).toBe(FEMALE_TEMPLATE.heightM);
  });
});

describe('scanToParamVector key mapping', () => {
  it('maps quadriceps and calf keys to the correct leg rings', () => {
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ rightQuadriceps: 24, leftQuadriceps: 23, rightCalf: 15, leftCalf: 14 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    expect(ring(v, 'rThigh').circumferenceM).toBeCloseTo(24 * 0.0254, 5);
    expect(ring(v, 'lThigh').circumferenceM).toBeCloseTo(23 * 0.0254, 5);
    expect(ring(v, 'rCalf').circumferenceM).toBeCloseTo(15 * 0.0254, 5);
    expect(ring(v, 'lCalf').circumferenceM).toBeCloseTo(14 * 0.0254, 5);
  });

  it('maps biceps and forearms to the correct arm sides', () => {
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ rightBicep: 14, rightForearm: 11, leftBicep: 13, leftForearm: 10 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    expect(arm(v, 'r').bicepM).toBeCloseTo(14 * 0.0254, 5);
    expect(arm(v, 'r').forearmM).toBeCloseTo(11 * 0.0254, 5);
    expect(arm(v, 'l').bicepM).toBeCloseTo(13 * 0.0254, 5);
    expect(arm(v, 'l').forearmM).toBeCloseTo(10 * 0.0254, 5);
    expect(arm(v, 'r').estimated).toBe(false);
    expect(arm(v, 'l').estimated).toBe(false);
  });

  it('maps neck, chest and hip', () => {
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ neck: 16, chest: 40, hip: 38 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    expect(ring(v, 'neck').circumferenceM).toBeCloseTo(16 * 0.0254, 5);
    expect(ring(v, 'chest').circumferenceM).toBeCloseTo(40 * 0.0254, 5);
    expect(ring(v, 'hip').circumferenceM).toBeCloseTo(38 * 0.0254, 5);
  });

  it('never uses shoulderWidth as a ring circumference', () => {
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ shoulderWidth: 20, neck: 16 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    // No ring id is shoulderWidth, and the present shoulderWidth must not leak
    // into any ring circumference. neck is the only measured ring here.
    expect(v.rings.some((r) => r.id === 'shoulderWidth')).toBe(false);
    const measured = v.rings.filter((r) => !r.estimated).map((r) => r.id);
    expect(measured).toEqual(['neck']);
  });
});

describe('scanToParamVector UNKNOWN preservation', () => {
  it('keeps a null waist null and marks the ring estimated', () => {
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ chest: 40 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    const waist = ring(v, 'waist');
    expect(waist.circumferenceM).toBeNull();
    expect(waist.estimated).toBe(true);
  });

  it('returns a valid neutral vector for fully null input and does not throw', () => {
    const v = scanToParamVector({ snapshot: null, circumferences: null, sex: 'female', heightCm: null });
    expect(v.sex).toBe('female');
    expect(v.heightM).toBe(FEMALE_TEMPLATE.heightM);
    expect(v.rings.length).toBeGreaterThan(0);
    for (const r of v.rings) {
      expect(r.circumferenceM).toBeNull();
      expect(r.estimated).toBe(true);
    }
    for (const a of v.arms) {
      expect(a.bicepM).toBeNull();
      expect(a.forearmM).toBeNull();
      expect(a.estimated).toBe(true);
    }
  });

  it('marks an arm estimated when either of its measurements is null', () => {
    const v = scanToParamVector({
      snapshot: null,
      circumferences: measure({ rightBicep: 14 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    // Right forearm is null, so the right arm is estimated; bicep value is kept.
    expect(arm(v, 'r').bicepM).toBeCloseTo(14 * 0.0254, 5);
    expect(arm(v, 'r').forearmM).toBeNull();
    expect(arm(v, 'r').estimated).toBe(true);
  });

  it('never fabricates girth from body fat percent in the snapshot', () => {
    const v = scanToParamVector({
      snapshot: {
        entryId: 'e1',
        source: 'scan',
        recordedAt: '2026-06-25T00:00:00.000Z',
        totalBodyFatPct: 35,
        regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
        visceralFatRating: null,
        bodyWaterPct: null,
        regionMuscleLbs: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
        totalMuscleMassLbs: null,
        skeletalMuscleMassLbs: null,
      },
      circumferences: null,
      sex: 'male',
      heightCm: null,
    });
    // High body fat must not invent any waist girth; shape comes from measured
    // circumferences only, which are all absent here.
    expect(ring(v, 'waist').circumferenceM).toBeNull();
    expect(ring(v, 'waist').estimated).toBe(true);
  });
});

describe('scanToParamVector determinism and data drives shape', () => {
  it('produces deeply equal output for the same input', () => {
    const input = {
      snapshot: null,
      circumferences: measure({ waist: 32, chest: 40 }),
      sex: 'male' as const,
      heightCm: 180,
      unit: 'in' as const,
    };
    expect(scanToParamVector(input)).toEqual(scanToParamVector(input));
  });

  it('a smaller waist input yields a smaller waist ring circumference', () => {
    const lean = scanToParamVector({
      snapshot: null,
      circumferences: measure({ waist: 28 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    const heavy = scanToParamVector({
      snapshot: null,
      circumferences: measure({ waist: 40 }),
      sex: 'male',
      heightCm: null,
      unit: 'in',
    });
    expect(ring(lean, 'waist').circumferenceM!).toBeLessThan(ring(heavy, 'waist').circumferenceM!);
  });
});
