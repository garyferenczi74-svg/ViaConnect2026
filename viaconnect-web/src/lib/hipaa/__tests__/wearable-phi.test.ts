import { describe, it, expect } from 'vitest';
import { filterSamplesForPhiConsent, isBodyMetricType, isPhiMetricType } from '../wearable-phi';

describe('wearable PHI gate', () => {
  it('lets composition and weight through without consent', () => {
    expect(isBodyMetricType('HKQuantityTypeIdentifierBodyMass')).toBe(true);
    expect(isPhiMetricType('HKCategoryTypeIdentifierSleepAnalysis')).toBe(true);
    const kept = filterSamplesForPhiConsent(
      [
        { type: 'HKQuantityTypeIdentifierBodyMass' },
        { type: 'HKCategoryTypeIdentifierSleepAnalysis' },
        { type: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' },
      ],
      false,
    );
    expect(kept.map((s) => s.type)).toEqual(['HKQuantityTypeIdentifierBodyMass']);
  });

  it('keeps sleep when consent is present', () => {
    const kept = filterSamplesForPhiConsent(
      [{ type: 'HKCategoryTypeIdentifierSleepAnalysis' }],
      true,
    );
    expect(kept).toHaveLength(1);
  });
});
