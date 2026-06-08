import { describe, it, expect } from 'vitest';
import { cmToIn, inToCm, convertLength, roundForDisplay, displayValue } from '@/lib/body-measurements/units';

describe('units', () => {
  it('converts cm to inches and back', () => {
    expect(roundForDisplay(cmToIn(2.54))).toBe(1);
    expect(roundForDisplay(inToCm(1))).toBe(2.5);
  });

  it('convertLength is identity for the same unit (criterion 8: toggle never mutates stored value)', () => {
    expect(convertLength(50, 'cm', 'cm')).toBe(50);
    expect(convertLength(32, 'in', 'in')).toBe(32);
  });

  it('displayValue converts and rounds to one decimal', () => {
    expect(displayValue(100, 'cm', 'in')).toBe(39.4);
    expect(displayValue(40, 'in', 'cm')).toBe(101.6);
  });
});
