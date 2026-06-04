// Prompt 173a Phase 8: LBM resolver math.
//
// Measured precedence: LBM = weight * (1 - body_fat_fraction).
// Boer fallback per 173a 4.1:
//   Male:   LBM = 0.407*kg + 0.267*cm - 19.2
//   Female: LBM = 0.252*kg + 0.473*cm - 48.3
//   Unspecified: average of male + female.

import { describe, it, expect } from 'vitest';
import { resolveLeanBodyMass } from '@/lib/gordon/lbm';

describe('resolveLeanBodyMass: missing inputs', () => {
  it('returns null when weight is missing or non-positive', () => {
    expect(resolveLeanBodyMass({ weightKg: 0, heightCm: 180, biologicalSex: 'male', bodyFatFraction: null })).toBeNull();
    expect(resolveLeanBodyMass({ weightKg: Number.NaN, heightCm: 180, biologicalSex: 'male', bodyFatFraction: null })).toBeNull();
  });

  it('returns null when height is missing or non-positive', () => {
    expect(resolveLeanBodyMass({ weightKg: 80, heightCm: 0, biologicalSex: 'male', bodyFatFraction: null })).toBeNull();
  });
});

describe('resolveLeanBodyMass: measured precedence', () => {
  it('uses weight * (1 - body_fat_fraction) when fraction is in band', () => {
    const r = resolveLeanBodyMass({
      weightKg: 80,
      heightCm: 180,
      biologicalSex: 'male',
      bodyFatFraction: 0.20,
    });
    expect(r).not.toBeNull();
    if (r) {
      expect(r.lbmKg).toBeCloseTo(64, 5);
      expect(r.source).toBe('measured');
      expect(r.bodyFatFraction).toBeCloseTo(0.20, 5);
    }
  });

  it('falls back to Boer when body fat fraction is out of band', () => {
    // Fraction 0.85 is implausible -> resolver routes to Boer estimate.
    const r = resolveLeanBodyMass({
      weightKg: 80,
      heightCm: 180,
      biologicalSex: 'male',
      bodyFatFraction: 0.85,
    });
    expect(r).not.toBeNull();
    if (r) {
      expect(r.source).toBe('estimated');
      expect(r.bodyFatFraction).toBeNull();
    }
  });

  it('falls back to Boer when body fat fraction is null', () => {
    const r = resolveLeanBodyMass({
      weightKg: 80,
      heightCm: 180,
      biologicalSex: 'male',
      bodyFatFraction: null,
    });
    expect(r).not.toBeNull();
    if (r) expect(r.source).toBe('estimated');
  });
});

describe('resolveLeanBodyMass: Boer equation', () => {
  it('male: 0.407*80 + 0.267*180 - 19.2 = 61.42', () => {
    const r = resolveLeanBodyMass({
      weightKg: 80,
      heightCm: 180,
      biologicalSex: 'male',
      bodyFatFraction: null,
    });
    expect(r).not.toBeNull();
    if (r) expect(r.lbmKg).toBeCloseTo(61.42, 2);
  });

  it('female: 0.252*60 + 0.473*165 - 48.3 = 44.865', () => {
    // 15.12 + 78.045 - 48.3 = 44.865
    const r = resolveLeanBodyMass({
      weightKg: 60,
      heightCm: 165,
      biologicalSex: 'female',
      bodyFatFraction: null,
    });
    expect(r).not.toBeNull();
    if (r) expect(r.lbmKg).toBeCloseTo(44.865, 2);
  });

  it('unspecified: averages the male and female estimates', () => {
    const weight = 75;
    const height = 175;
    const male = resolveLeanBodyMass({
      weightKg: weight,
      heightCm: height,
      biologicalSex: 'male',
      bodyFatFraction: null,
    });
    const female = resolveLeanBodyMass({
      weightKg: weight,
      heightCm: height,
      biologicalSex: 'female',
      bodyFatFraction: null,
    });
    const unspec = resolveLeanBodyMass({
      weightKg: weight,
      heightCm: height,
      biologicalSex: 'unspecified',
      bodyFatFraction: null,
    });
    expect(male && female && unspec).toBeTruthy();
    if (male && female && unspec) {
      expect(unspec.lbmKg).toBeCloseTo((male.lbmKg + female.lbmKg) / 2, 5);
    }
  });
});
