import { describe, expect, it } from 'vitest';
import { GENEX360_PANELS } from '@/data/genex360/panels';
import {
  CATALOG_MARKER_COUNTS,
  CATALOG_SIZE_LABEL,
  catalogCountForPanel,
  catalogMarkerCountsFromPanels,
  catalogOnFileLine,
  honestEmptyHeaderBadge,
} from '../catalogSizes';

describe('GENEX360 catalog sizes', () => {
  it('locks the six catalog sizes and never invents 500+', () => {
    expect(CATALOG_MARKER_COUNTS).toEqual([20, 27, 29, 12, 14, 10]);
    expect(catalogMarkerCountsFromPanels()).toEqual([...CATALOG_MARKER_COUNTS]);
    expect(GENEX360_PANELS.map((panel) => panel.markerCount)).toEqual([
      20, 27, 29, 12, 14, 10,
    ]);
    expect(CATALOG_SIZE_LABEL).toBe('20 / 27 / 29 / 12 / 14 / 10');
    expect(CATALOG_SIZE_LABEL).not.toContain('500');
    expect(CATALOG_SIZE_LABEL.toLowerCase()).not.toContain('variant');
  });

  it('reads each hub panel from panels.ts, not an invented count', () => {
    expect(catalogCountForPanel('methylation')).toBe(20);
    expect(catalogCountForPanel('nutrition')).toBe(27);
    expect(catalogCountForPanel('hormone')).toBe(29);
    expect(catalogCountForPanel('epigenetic')).toBe(12);
    expect(catalogCountForPanel('peptide')).toBe(14);
    expect(catalogCountForPanel('cannabis')).toBe(10);
  });

  it('voices hub empty as catalog-on-file, never as you have nothing', () => {
    expect(catalogOnFileLine('methylation')).toContain('GeneXM catalog has 20 SNPs');
    expect(catalogOnFileLine('nutrition')).toContain('NutrigenDX catalog has 27 SNPs');
    expect(catalogOnFileLine('hormone')).toContain('HormoneIQ catalog has 29 markers');
    expect(catalogOnFileLine('epigenetic')).toContain('EpigenHQ catalog has 12 clocks');
    expect(catalogOnFileLine('methylation')).toContain('not analyzed');
    expect(catalogOnFileLine('methylation')).not.toMatch(/\b0 SNPs\b/);
    expect(catalogOnFileLine('hormone')).not.toMatch(/\bSNPs\b/);
    expect(catalogOnFileLine('epigenetic')).not.toMatch(/\bSNPs\b/);
  });

  it('prefers Not analyzed over 0 results for an honest empty header', () => {
    expect(honestEmptyHeaderBadge(0)).toBe('Not analyzed');
    expect(honestEmptyHeaderBadge(0)).not.toBe('0 results');
    expect(honestEmptyHeaderBadge(4)).toBeNull();
    expect(honestEmptyHeaderBadge(null)).toBeNull();
  });
});
