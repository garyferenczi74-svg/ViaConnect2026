import { describe, it, expect } from 'vitest';
import { normalizeUnit, ageSexRange, type AgeSexRangeTable } from '../normalize';

describe('normalizeUnit', () => {
  it('converts glucose mmol/L to canonical mg/dL', () => {
    const r = normalizeUnit('glucose', 5.5, 'mmol/L');
    expect(r.unit).toBe('mg/dL');
    expect(r.converted).toBe(true);
    expect(r.value).toBeCloseTo(99.1, 0);
  });

  it('leaves a value already in the canonical unit unchanged', () => {
    const r = normalizeUnit('glucose', 90, 'mg/dL');
    expect(r.value).toBe(90);
    expect(r.unit).toBe('mg/dL');
    expect(r.converted).toBe(false);
  });

  it('returns unchanged for an unknown source unit (never guesses)', () => {
    const r = normalizeUnit('glucose', 5, 'g/L');
    expect(r.value).toBe(5);
    expect(r.converted).toBe(false);
  });

  it('returns unchanged for a biomarker with no conversion spec', () => {
    const r = normalizeUnit('some-unmapped-marker', 42, 'iu/ml');
    expect(r.value).toBe(42);
    expect(r.converted).toBe(false);
  });

  it('converts LDL mmol/L to mg/dL', () => {
    const r = normalizeUnit('LDL', 3, 'mmol/L');
    expect(r.unit).toBe('mg/dL');
    expect(r.converted).toBe(true);
    expect(r.value).toBeCloseTo(116, 0);
  });
});

describe('ageSexRange', () => {
  it('returns null with the default (empty clinical-seed) table', () => {
    expect(ageSexRange('homocysteine', 40, 'female')).toBeNull();
  });

  it('returns a matching range from an injected table', () => {
    const table: AgeSexRangeTable = {
      vitamin_d: [{ sex: 'any', range: { low: 40, high: 80 } }],
    };
    expect(ageSexRange('vitamin_d', 35, 'male', table)).toEqual({ low: 40, high: 80 });
  });

  it('respects sex and age filters', () => {
    const table: AgeSexRangeTable = {
      ferritin: [
        { sex: 'female', minAge: 18, maxAge: 50, range: { low: 15, high: 150 } },
        { sex: 'male', range: { low: 30, high: 400 } },
      ],
    };
    expect(ageSexRange('ferritin', 30, 'female', table)).toEqual({ low: 15, high: 150 });
    expect(ageSexRange('ferritin', 30, 'male', table)).toEqual({ low: 30, high: 400 });
    // female out of the age window falls through to no female match, then male entry
    // does not match sex female -> null
    expect(ageSexRange('ferritin', 60, 'female', table)).toBeNull();
  });
});
