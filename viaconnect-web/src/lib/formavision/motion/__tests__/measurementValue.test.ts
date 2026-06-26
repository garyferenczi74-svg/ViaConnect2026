import { describe, it, expect } from 'vitest';
import {
  circumferenceToUnit,
  formatRingValue,
  UNKNOWN_VALUE_MARKER,
} from '../measurementValue';

describe('circumferenceToUnit', () => {
  it('converts meters to centimeters', () => {
    expect(circumferenceToUnit(1.0, 'cm')).toBeCloseTo(100, 6);
    expect(circumferenceToUnit(0.85, 'cm')).toBeCloseTo(85, 6);
  });

  it('converts meters to inches', () => {
    expect(circumferenceToUnit(0.0254, 'in')).toBeCloseTo(1, 6);
    expect(circumferenceToUnit(1.0, 'in')).toBeCloseTo(39.3701, 3);
  });
});

describe('formatRingValue', () => {
  it('shows the real measured value in centimeters', () => {
    expect(formatRingValue(1.0, 'cm', false)).toBe('100 cm');
    expect(formatRingValue(0.853, 'cm', false)).toBe('85.3 cm');
  });

  it('shows the real measured value in inches', () => {
    expect(formatRingValue(1.0, 'in', false)).toBe('39.4 in');
  });

  it('shows the UNKNOWN marker for an estimated region, never 0', () => {
    const label = formatRingValue(0.9, 'cm', true);
    expect(label).toBe(UNKNOWN_VALUE_MARKER);
    expect(label).not.toContain('0');
    expect(label).not.toMatch(/\d/);
  });
});
