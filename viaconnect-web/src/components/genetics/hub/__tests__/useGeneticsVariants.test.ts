import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  EMPTY_OK_DATA,
  ERROR_DATA,
  UNAUTHORIZED_DATA,
  normalizeGeneticsVariantsPayload,
} from '../useGeneticsVariants';

const HOOK = path.resolve(__dirname, '..', 'useGeneticsVariants.ts');

describe('useGeneticsVariants normalize', () => {
  it('treats 401-shaped payloads as UNKNOWN, not empty 0', () => {
    const data = normalizeGeneticsVariantsPayload({
      loadStatus: 'unauthorized',
      variantsByPanel: {},
      totalVariants: 0,
    });
    expect(data.loadStatus).toBe('unauthorized');
    expect(data.totalVariants).toBeNull();
    expect(data.observedByPanel.methylation.count).toBeNull();
    expect(data).toEqual(UNAUTHORIZED_DATA);
  });

  it('keeps honest empty at 0 only when loadStatus is ok', () => {
    const data = normalizeGeneticsVariantsPayload({
      loadStatus: 'ok',
      variantsByPanel: {},
      brandedPanels: [],
      observedByPanel: EMPTY_OK_DATA.observedByPanel,
      totalVariants: 0,
      hormoneMarkers: [],
      epigeneticMarkers: [],
    });
    expect(data.loadStatus).toBe('ok');
    expect(data.totalVariants).toBe(0);
    expect(data.observedByPanel.methylation.count).toBe(0);
    expect(data.observedByPanel.methylation.status).toBe('ok');
  });

  it('groups remapped keys from a legacy payload onto methylation', () => {
    const data = normalizeGeneticsVariantsPayload({
      loadStatus: 'ok',
      variantsByPanel: {
        'GENEX-M': [
          {
            panel_key: 'GENEX-M',
            rsid: 'rs1801133',
            gene: 'MTHFR',
            genotype: 'CT',
            status: '+/-',
            clinical_significance: null,
            severity: null,
            is_sample: false,
          },
        ],
      },
      brandedPanels: [],
      observedByPanel: {
        ...EMPTY_OK_DATA.observedByPanel,
        methylation: {
          panel_key: 'methylation',
          count: 1,
          unit: 'SNPs',
          status: 'ok',
          source: 'user_variants',
        },
      },
      totalVariants: 1,
      hormoneMarkers: [],
      epigeneticMarkers: [],
    });
    expect(data.variantsByPanel.methylation).toHaveLength(1);
    expect(data.variantsByPanel.methylation?.[0].panel_key).toBe('methylation');
    expect(data.geneticsUploaded).toBe(true);
    expect(data.variantsByPanel.methylation?.[0].chip).toBe('genexm');
  });

  it('does not mark 12 sample rows as uploaded', () => {
    const data = normalizeGeneticsVariantsPayload({
      loadStatus: 'ok',
      variantsByPanel: {
        methylation: Array.from({ length: 12 }, (_, i) => ({
          panel_key: 'methylation',
          rsid: `rs${i}`,
          gene: 'MTHFR',
          genotype: 'CT',
          status: '+/-',
          clinical_significance: null,
          severity: null,
          is_sample: true,
        })),
      },
      brandedPanels: [],
      observedByPanel: EMPTY_OK_DATA.observedByPanel,
      totalVariants: 12,
      hormoneMarkers: [],
      epigeneticMarkers: [],
    });
    expect(data.geneticsUploadState).toBe('sample_only');
    expect(data.geneticsUploaded).toBe(false);
    expect(data.variantsByPanel.methylation?.every((row) => row.chip === 'demo')).toBe(true);
  });
});

describe('useGeneticsVariants source', () => {
  const source = readFileSync(HOOK, 'utf-8');

  it('does not fail-open 401 or errors to empty 0', () => {
    expect(source).toContain('if (res.status === 401)');
    expect(source).toContain('setData(UNAUTHORIZED_DATA)');
    expect(source).toContain('setData(ERROR_DATA)');
    expect(source).not.toContain('setData(EMPTY_DATA)');
    expect(ERROR_DATA.observedByPanel.methylation.count).toBeNull();
    expect(EMPTY_OK_DATA.observedByPanel.methylation.count).toBe(0);
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
