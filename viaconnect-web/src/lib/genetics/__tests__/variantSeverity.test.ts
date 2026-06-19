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
  METHYLATION_SEVERITY,
  METHYLATION_SEVERITY_NOTES,
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

describe('methylationSeverityFor (validated per-zygosity tiers, Prompt 204g)', () => {
  it('scores the well-established high-impact variant by zygosity', () => {
    // MTHFR C677T: homozygous high, heterozygous moderate.
    expect(methylationSeverityFor('rs1801133', '+/+')).toBe('high');
    expect(methylationSeverityFor('rs1801133', '+/-')).toBe('moderate');
  });

  it('does NOT auto-map homozygous to high for a functionally minor variant', () => {
    // COMT V158M slow state is a normal polymorphism, capped at moderate.
    expect(methylationSeverityFor('rs4680', '+/+')).toBe('moderate');
    expect(methylationSeverityFor('rs4680', '+/-')).toBe('low');
  });

  it('returns null (UNSCORED) for synonymous variants with no validated function', () => {
    // MTHFR P39P, COMT H62H, COMT P199P, CBS A360A/N212N, MTRR A664A.
    for (const rsid of ['rs2066470', 'rs4633', 'rs769224', 'rs1801181', 'rs2298758', 'rs1802059']) {
      expect(methylationSeverityFor(rsid, '+/+')).toBeNull();
      expect(methylationSeverityFor(rsid, '+/-')).toBeNull();
    }
  });

  it('returns null for a heterozygous result on a minor variant scored only homozygous', () => {
    // VDR Taq1 is scored low at +/+ only; +/- is unscored.
    expect(methylationSeverityFor('rs731236', '+/+')).toBe('low');
    expect(methylationSeverityFor('rs731236', '+/-')).toBeNull();
  });

  it('never returns a tier for the -/- baseline or an unknown status', () => {
    expect(methylationSeverityFor('rs1801133', '-/-')).toBeNull();
    expect(methylationSeverityFor('rs1801133', 'CT')).toBeNull();
    expect(methylationSeverityFor('rs1801133', '')).toBeNull();
    expect(methylationSeverityFor(null, '+/+')).toBeNull();
  });

  it('keeps the zygosity tokens distinct (does not collapse +/+ and +/- via normalizeGenotype)', () => {
    // The genotype normalizer would strip "/" and "-" and merge these; the
    // zygosity resolver must not.
    expect(methylationSeverityFor('rs1801131', '+/+')).toBe('moderate');
    expect(methylationSeverityFor('rs1801131', '+/-')).toBe('low');
  });

  it('documents every scored variant with a rationale, evidence grade, and confidence', () => {
    for (const rsid of Object.keys(METHYLATION_SEVERITY)) {
      const note = METHYLATION_SEVERITY_NOTES[rsid];
      expect(note, `missing note for ${rsid}`).toBeDefined();
      expect(note.rationale.length).toBeGreaterThan(0);
      expect(['well-established', 'limited', 'synonymous-no-clear-function']).toContain(note.evidence);
      expect(['high', 'medium', 'low']).toContain(note.confidence);
    }
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
