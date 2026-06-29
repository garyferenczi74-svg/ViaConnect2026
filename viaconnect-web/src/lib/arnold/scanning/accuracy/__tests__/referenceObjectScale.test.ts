import { describe, it, expect } from 'vitest';
import { scaleFromReference } from '../referenceObjectScale';

describe('scaleFromReference', () => {
  it('returns cm/px for a credit card long edge (8.56 cm) at 100 px', () => {
    const result = scaleFromReference(8.56, 100);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.0856, 6);
  });

  it('returns null when measuredPx is 0 (no divide-by-zero / no Infinity)', () => {
    expect(scaleFromReference(8.56, 0)).toBeNull();
  });

  it('returns null when knownSizeCm is 0', () => {
    expect(scaleFromReference(0, 100)).toBeNull();
  });

  it('returns null when knownSizeCm is negative', () => {
    expect(scaleFromReference(-5, 100)).toBeNull();
  });

  it('returns null when measuredPx is negative', () => {
    expect(scaleFromReference(8.56, -10)).toBeNull();
  });

  it('returns null when knownSizeCm is NaN', () => {
    expect(scaleFromReference(NaN, 100)).toBeNull();
  });

  it('returns null when measuredPx is NaN', () => {
    expect(scaleFromReference(8.56, NaN)).toBeNull();
  });

  it('returns null when knownSizeCm is Infinity', () => {
    expect(scaleFromReference(Infinity, 100)).toBeNull();
  });

  it('returns null when measuredPx is Infinity', () => {
    expect(scaleFromReference(8.56, Infinity)).toBeNull();
  });

  it('round-trip: scale * measuredPx recovers knownSizeCm', () => {
    const knownSizeCm = 8.56;
    const measuredPx = 213;
    const scale = scaleFromReference(knownSizeCm, measuredPx);
    expect(scale).not.toBeNull();
    expect(scale! * measuredPx).toBeCloseTo(knownSizeCm, 10);
  });
});
