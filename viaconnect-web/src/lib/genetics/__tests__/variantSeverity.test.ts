// Prompt 204g (2026-06-19): tests for the validated per-genotype severity SOURCE.
// They lock the Decision Gate outcome: the source ships EMPTY (no invented
// tiers), and an unmapped (rsID, genotype) resolves to null, the honest unscored
// state, never a fabricated tier.

import { describe, it, expect } from 'vitest';
import { VARIANT_SEVERITY, severityFor, normalizeGenotype } from '../variantSeverity';

describe('VARIANT_SEVERITY source', () => {
  it('ships empty until the validated clinical content pass populates it', () => {
    expect(Object.keys(VARIANT_SEVERITY)).toHaveLength(0);
  });
});

describe('severityFor', () => {
  it('returns null for an unmapped variant (honest unscored state)', () => {
    expect(severityFor('rs1801133', 'CT')).toBeNull();
    expect(severityFor('rs4680', 'AG')).toBeNull();
  });

  it('returns null when the rsID or genotype is missing', () => {
    expect(severityFor(null, 'CT')).toBeNull();
    expect(severityFor('rs1801133', null)).toBeNull();
    expect(severityFor('', 'CT')).toBeNull();
  });
});

describe('normalizeGenotype', () => {
  it('strips separators and uppercases so equivalent genotypes match one key', () => {
    expect(normalizeGenotype('C/T')).toBe('CT');
    expect(normalizeGenotype('c t')).toBe('CT');
    expect(normalizeGenotype('CT')).toBe('CT');
    expect(normalizeGenotype('g|g')).toBe('GG');
  });
});
