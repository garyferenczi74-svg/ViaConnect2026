import { describe, it, expect } from 'vitest';
import { parseDnaReportText } from '../parseDnaReportText';

describe('parseDnaReportText', () => {
  it('extracts an rsID and an adjacent plain genotype', () => {
    const rows = parseDnaReportText('MTHFR rs1801133 (C677T) genotype CT');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rsid: 'rs1801133', chromosome: '', position: '', genotype: 'CT' });
  });

  it('carries the verbatim source snippet for verification', () => {
    const rows = parseDnaReportText('MTHFR rs1801133 (C677T) genotype CT');
    expect(rows[0].context).toBe('rs1801133 (C677T) genotype CT');
  });

  it('handles separated genotype formats (C/T, C;T, C T)', () => {
    expect(parseDnaReportText('rs1801133 C/T')[0].genotype).toBe('CT');
    expect(parseDnaReportText('rs1801133 C;T')[0].genotype).toBe('CT');
    expect(parseDnaReportText('rs1801133 C T')[0].genotype).toBe('CT');
  });

  it('uppercases and normalizes the genotype', () => {
    expect(parseDnaReportText('rs9939609 at')[0].genotype).toBe('AT');
  });

  it('parses multiple variants in a report and dedupes repeats', () => {
    const text = 'rs1801133 TT\nrs9939609 AA\nrs1801133 TT again';
    const rows = parseDnaReportText(text);
    expect(rows.map((r) => r.rsid)).toEqual(['rs1801133', 'rs9939609']);
  });

  it('skips an rsID with no clean genotype nearby', () => {
    expect(parseDnaReportText('see variant rs1801133 in the table on page 2')).toEqual([]);
  });

  it('returns an empty array for empty or text without rsIDs', () => {
    expect(parseDnaReportText('')).toEqual([]);
    expect(parseDnaReportText('no genetic markers here')).toEqual([]);
  });
});
