import { describe, it, expect } from 'vitest';
import { resolveMealConfidenceTone } from '../mealConfidence';

const flags = (over: Partial<{ partial: string[]; unknown: string[]; downgraded: boolean }> = {}) => ({
  partial: [] as string[],
  unknown: [] as string[],
  downgraded: false,
  ...over,
});

describe('resolveMealConfidenceTone', () => {
  it('full USDA match with no unknowns reads high', () => {
    expect(resolveMealConfidenceTone({ data_source: 'usda', nutrient_flags: flags() })).toBe('high');
  });

  it('mixed match reads estimated, not low', () => {
    expect(resolveMealConfidenceTone({ data_source: 'mixed', nutrient_flags: flags() })).toBe('estimated');
  });

  it('no USDA match reads estimated, not low', () => {
    expect(resolveMealConfidenceTone({ data_source: 'gemini_fallback', nutrient_flags: flags() })).toBe('estimated');
  });

  it('a genuine downgrade reads low even on a full USDA match', () => {
    expect(
      resolveMealConfidenceTone({ data_source: 'usda', nutrient_flags: flags({ downgraded: true }) }),
    ).toBe('low');
  });

  it('downgrade wins over a USDA miss', () => {
    expect(
      resolveMealConfidenceTone({ data_source: 'gemini_fallback', nutrient_flags: flags({ downgraded: true }) }),
    ).toBe('low');
  });

  it('full USDA match but partial/unknown nutrients reads estimated', () => {
    expect(
      resolveMealConfidenceTone({ data_source: 'usda', nutrient_flags: flags({ unknown: ['sodium_mg'] }) }),
    ).toBe('estimated');
  });

  it('missing nutrient_flags on a USDA match reads high', () => {
    expect(resolveMealConfidenceTone({ data_source: 'usda' })).toBe('high');
  });

  it('missing data_source reads estimated', () => {
    expect(resolveMealConfidenceTone({})).toBe('estimated');
  });
});
