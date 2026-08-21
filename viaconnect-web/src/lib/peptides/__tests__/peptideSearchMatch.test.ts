import { describe, expect, it } from 'vitest';
import { matchesSearchPrefix } from '@/lib/peptides/peptideSearchMatch';
import { filterPeptideCatalog } from '@/components/peptide-protocol/PeptideCatalogPicker';

describe('matchesSearchPrefix', () => {
  it('matches start of the name', () => {
    expect(matchesSearchPrefix('Retatrutide', 'reta')).toBe(true);
    expect(matchesSearchPrefix('BPC-157', 'bpc')).toBe(true);
  });

  it('does not match mid-word letters (Secretagogues / reta)', () => {
    expect(matchesSearchPrefix('GH Axis and Secretagogues', 'reta')).toBe(false);
    expect(matchesSearchPrefix('Secretagogues', 'reta')).toBe(false);
    expect(matchesSearchPrefix('CJC-1295 without DAC', 'reta')).toBe(false);
  });

  it('matches word starts inside a multi-word label', () => {
    expect(matchesSearchPrefix('GH Axis and Secretagogues', 'axis')).toBe(true);
    expect(matchesSearchPrefix('GH Axis and Secretagogues', 'secre')).toBe(true);
  });

  it('matches hyphenless prefixes to hyphenated slugs', () => {
    expect(matchesSearchPrefix('BPC-157', 'bpc157')).toBe(true);
    expect(matchesSearchPrefix('bpc-157', 'bpc157')).toBe(true);
  });
});

describe('filterPeptideCatalog prefix behaviour', () => {
  const items = [
    { id: '1', slug: 'retatrutide', displayName: 'Retatrutide' },
    { id: '2', slug: 'cjc-1295-no-dac', displayName: 'CJC-1295 without DAC' },
    { id: '3', slug: 'tesamorelin', displayName: 'Tesamorelin' },
  ];

  it('returns Retatrutide for reta and not CJC', () => {
    const hits = filterPeptideCatalog(items, 'reta');
    expect(hits.map((h) => h.slug)).toEqual(['retatrutide']);
  });
});
