/**
 * src/hooks/journey/__tests__/useMetabolicVitals.test.ts
 *
 * TDD for pure helpers exported from useMetabolicVitals.
 * Prompt 208j Task J-T3.
 *
 * Rules: no em-dashes, no emojis.
 */

import { describe, it, expect } from 'vitest';
import { formatVitalValue } from '../useMetabolicVitals';

// ---------------------------------------------------------------------------
// formatVitalValue
// ---------------------------------------------------------------------------

describe('formatVitalValue', () => {
  it('returns "--" when value is null', () => {
    expect(formatVitalValue(null, 'bpm')).toBe('--');
  });

  it('returns "65 bpm" for value 65 with unit bpm', () => {
    expect(formatVitalValue(65, 'bpm')).toBe('65 bpm');
  });

  it('returns "--" when value is NaN', () => {
    expect(formatVitalValue(NaN, 'ms')).toBe('--');
  });

  it('returns "0 %" for value 0 (zero is a valid reading)', () => {
    expect(formatVitalValue(0, '%')).toBe('0 %');
  });

  it('returns "--" when value is Infinity', () => {
    expect(formatVitalValue(Infinity, 'bpm')).toBe('--');
  });

  it('returns "--" when value is -Infinity', () => {
    expect(formatVitalValue(-Infinity, 'ms')).toBe('--');
  });

  it('returns "98.6 brpm" for fractional value', () => {
    expect(formatVitalValue(98.6, 'brpm')).toBe('98.6 brpm');
  });
});
