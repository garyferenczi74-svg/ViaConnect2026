/**
 * Prompt 226: reactive peptide catalog search filter.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { filterPeptideCatalog } from '@/components/peptide-protocol/PeptideCatalogPicker';

const items = [
  { id: '1', slug: 'bpc-157', displayName: 'BPC-157' },
  { id: '2', slug: 'tb-500', displayName: 'TB-500' },
  { id: '3', slug: 'semaglutide', displayName: 'Semaglutide' },
  { id: '4', slug: 'tesamorelin', displayName: 'Tesamorelin' },
];

describe('filterPeptideCatalog', () => {
  it('returns full list when query is empty', () => {
    expect(filterPeptideCatalog(items, '')).toHaveLength(4);
    expect(filterPeptideCatalog(items, '   ')).toHaveLength(4);
  });

  it('filters by display name as the user types', () => {
    const hits = filterPeptideCatalog(items, 'sema');
    expect(hits.map((h) => h.slug)).toEqual(['semaglutide']);
  });

  it('filters by slug and is case-insensitive', () => {
    const hits = filterPeptideCatalog(items, 'BPC');
    expect(hits.map((h) => h.id)).toEqual(['1']);
  });

  it('matches hyphenless typing to hyphenated slugs', () => {
    expect(filterPeptideCatalog(items, 'bpc157').map((h) => h.slug)).toEqual([
      'bpc-157',
    ]);
    expect(filterPeptideCatalog(items, 'tb500').map((h) => h.slug)).toEqual([
      'tb-500',
    ]);
  });

  it('returns empty when nothing matches', () => {
    expect(filterPeptideCatalog(items, 'zzzz')).toHaveLength(0);
  });
});

describe('PeptideCatalogPicker reactive typing guard', () => {
  it('does not wipe query when selection clears during typing', () => {
    const picker = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/PeptideCatalogPicker.tsx',
      ),
      'utf8',
    );
    expect(picker).toContain('typingRef');
    expect(picker).toContain('if (open || typingRef.current) return');
    expect(picker).toContain('do NOT reset query');
    expect(picker).toContain('filterPeptideCatalog(items, query)');
  });
});

describe('PeptideCatalogPicker wiring', () => {
  it('My Protocols and Converter use the reactive search picker', () => {
    const rx = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/MyPrescribedPeptidesClient.tsx',
      ),
      'utf8',
    );
    const converter = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
      ),
      'utf8',
    );
    expect(rx).toContain('PeptideCatalogPicker');
    expect(rx).toContain('Type to search peptides');
    expect(converter).toContain('PeptideCatalogPicker');
    expect(converter).toContain('testId="converter-compound"');
  });

  it('dropdown anchors under the search field with solid catalog panel class', () => {
    const picker = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/PeptideCatalogPicker.tsx',
      ),
      'utf8',
    );
    const css = readFileSync(
      path.join(process.cwd(), 'src/styles/peptide-converter-226b.css'),
      'utf8',
    );
    expect(picker).toContain('pep-catalog-dropdown');
    expect(picker).toContain('top-full');
    expect(picker).toContain("open ? 'z-30'");
    expect(css).toContain('.pep-catalog-dropdown');
    expect(css).toContain('background: var(--card)');
    expect(css).toContain('backdrop-filter: none');
  });
});
