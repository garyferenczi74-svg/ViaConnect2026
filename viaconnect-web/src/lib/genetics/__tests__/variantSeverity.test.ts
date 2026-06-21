// Prompt 204g + go-live (2026-06-20): tests for the validated per-genotype
// severity SOURCE. After Gary's clinical and compliance sign-off the source is
// PANEL-SCOPED and wired for the two SNP panels that passed the gate. They lock
// the panel-scoping (a shared rsID never crosses panels), the honest unscored null
// for an unmapped (panel, rsID, genotype), and that methylation is absent (it is
// scored by zygosity, not genotype).

import { describe, it, expect } from 'vitest';
import {
  VARIANT_SEVERITY,
  severityFor,
  normalizeGenotype,
  methylationSeverityFor,
} from '../variantSeverity';

describe('VARIANT_SEVERITY source (panel-scoped, go-live)', () => {
  it('is keyed by panel slug and wired for the two gate-approved SNP panels', () => {
    expect(Object.keys(VARIANT_SEVERITY).sort()).toEqual(['hormone-iq', 'nutrigen-dx']);
  });

  it('does NOT include the methylation panel (it is scored by zygosity, not genotype)', () => {
    expect(VARIANT_SEVERITY['genex-m']).toBeUndefined();
  });
});

describe('severityFor (panel-scoped)', () => {
  it('scores a validated (panel, rsID, genotype) from that panel only', () => {
    expect(severityFor('nutrigen-dx', 'rs1801133', 'CT')).toBe('moderate');
    expect(severityFor('nutrigen-dx', 'rs1801133', 'TT')).toBe('high');
    expect(severityFor('nutrigen-dx', 'rs1801133', 'CC')).toBe('low');
    expect(severityFor('hormone-iq', 'rs4680', 'AA')).toBe('moderate');
  });

  it('panel-scopes a shared rsID: the same rsID is not scored on another panel', () => {
    // rs1801198 (TCN2) is validated on NutrigenDX but the methylation panel has no
    // genotype source, so it stays null there (no cross-panel contamination).
    expect(severityFor('nutrigen-dx', 'rs1801198', 'GG')).toBe('moderate');
    expect(severityFor('genex-m', 'rs1801198', 'GG')).toBeNull();
    expect(severityFor('hormone-iq', 'rs1801198', 'GG')).toBeNull();
  });

  it('returns null for an unmapped panel, variant, or genotype (honest unscored state)', () => {
    expect(severityFor('nutrigen-dx', 'rs00000000', 'CT')).toBeNull();
    expect(severityFor('epigen-hq', 'rs1801133', 'CT')).toBeNull();
    expect(severityFor('nutrigen-dx', 'rs1801133', 'GG')).toBeNull();
  });

  it('returns null when the panel, rsID, or genotype is missing', () => {
    expect(severityFor(null, 'rs1801133', 'CT')).toBeNull();
    expect(severityFor('nutrigen-dx', null, 'CT')).toBeNull();
    expect(severityFor('nutrigen-dx', 'rs1801133', null)).toBeNull();
    expect(severityFor('', 'rs1801133', 'CT')).toBeNull();
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
