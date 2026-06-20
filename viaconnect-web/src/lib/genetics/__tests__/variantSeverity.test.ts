// Prompt 204g (2026-06-19): tests for the validated per-genotype severity SOURCE.
// They lock the Decision Gate outcome: the source ships EMPTY (no invented
// tiers), and an unmapped (rsID, genotype) resolves to null, the honest unscored
// state, never a fabricated tier.

import { describe, it, expect } from 'vitest';
import {
  VARIANT_SEVERITY,
  severityFor,
  normalizeGenotype,
  methylationSeverityFor,
} from '../variantSeverity';

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

describe('methylationSeverityFor (zygosity-direct scoring, Gary 2026-06-19)', () => {
  it('scores a homozygous mutation High and a heterozygous mutation Moderate', () => {
    expect(methylationSeverityFor('rs1801133', '+/+')).toBe('high');
    expect(methylationSeverityFor('rs1801133', '+/-')).toBe('moderate');
  });

  it('applies the zygosity rule uniformly, regardless of the specific variant', () => {
    // The score is the zygosity, not a per-variant judgment, so any rsID maps the
    // same way: +/+ High, +/- Moderate.
    for (const rsid of ['rs4680', 'rs731236', 'rs6323', 'rs234706', 'rs1802059']) {
      expect(methylationSeverityFor(rsid, '+/+')).toBe('high');
      expect(methylationSeverityFor(rsid, '+/-')).toBe('moderate');
    }
  });

  it('never returns low (Low scoring removed; only Moderate and High)', () => {
    for (const rsid of ['rs1801133', 'rs4680', 'rs731236', 'rs234706']) {
      expect(methylationSeverityFor(rsid, '+/+')).not.toBe('low');
      expect(methylationSeverityFor(rsid, '+/-')).not.toBe('low');
    }
  });

  it('returns null for the -/- baseline, an unknown status, or missing input', () => {
    expect(methylationSeverityFor('rs1801133', '-/-')).toBeNull();
    expect(methylationSeverityFor('rs1801133', 'CT')).toBeNull();
    expect(methylationSeverityFor('rs1801133', '')).toBeNull();
    expect(methylationSeverityFor(null, '+/+')).toBeNull();
    expect(methylationSeverityFor('rs1801133', null)).toBeNull();
  });

  it('keeps the zygosity tokens distinct (does not collapse +/+ and +/- via normalizeGenotype)', () => {
    // The genotype normalizer would strip "/" and "-" and merge these; the
    // zygosity resolver must not.
    expect(methylationSeverityFor('rs1801131', '+/+')).toBe('high');
    expect(methylationSeverityFor('rs1801131', '+/-')).toBe('moderate');
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
