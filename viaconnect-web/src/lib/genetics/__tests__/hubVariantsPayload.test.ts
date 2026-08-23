import { describe, expect, it } from 'vitest';
import {
  buildHubVariantsPayload,
  countDistinctEpigeneticMarkers,
  emptyOkHubPayload,
  errorHubPayload,
  groupVariantsByObservedPanel,
  unauthorizedHubPayload,
} from '../hubVariantsPayload';
import { isHonestEmptyObserved, isUnknownObserved } from '../observedPanelCounts';

describe('groupVariantsByObservedPanel', () => {
  it('groups GENEX-M and genex_m rows onto Genetic Methylation', () => {
    const grouped = groupVariantsByObservedPanel([
      { panel_key: 'GENEX-M', rsid: 'rs1801133' },
      { panel_key: 'genex_m', rsid: 'rs4680' },
      { panel_key: 'methylation', rsid: 'rs1801131' },
    ]);
    expect(grouped.methylation).toHaveLength(3);
    expect(grouped.methylation?.every((row) => row.panel_key === 'methylation')).toBe(true);
  });

  it('leaves unknown keys ungrouped instead of inventing a pill', () => {
    const grouped = groupVariantsByObservedPanel([
      { panel_key: 'GENEX-N', rsid: 'rs999' },
    ]);
    expect(grouped.methylation).toBeUndefined();
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});

describe('buildHubVariantsPayload', () => {
  it('does not let HormoneIQ use user_variants SNP length', () => {
    const payload = buildHubVariantsPayload({
      variantRows: Array.from({ length: 9 }, (_, i) => ({
        panel_key: 'hormone',
        rsid: `rs${i}`,
      })),
      variantsReadFailed: false,
      hormoneRows: [
        { name: 'Cortisol', source_type: 'dutch' },
        { name: 'Estradiol', lab_name: 'DUTCH Complete' },
      ],
      hormoneReadFailed: false,
      epigeneticRows: [],
      epigeneticReadFailed: false,
      brandedPanels: [],
    });
    expect(payload.observedByPanel.hormone.count).toBe(2);
    expect(payload.observedByPanel.hormone.count).not.toBe(9);
    expect(payload.observedByPanel.hormone.source).toBe('hormone_markers');
    expect(payload.observedByPanel.hormone.unit).toBe('markers');
    expect(payload.variantsByPanel.hormone).toHaveLength(9);
  });

  it('counts EpigenHQ from epigenetic marker keys, not SNP pills', () => {
    const payload = buildHubVariantsPayload({
      variantRows: [{ panel_key: 'epigenetic', rsid: 'rs1' }],
      variantsReadFailed: false,
      hormoneRows: [],
      hormoneReadFailed: false,
      epigeneticRows: [
        { markerKey: 'epigenetic-age', valueNum: 51, valueText: null, unit: 'years' },
        { markerKey: 'pace-of-aging', valueNum: 1.1, valueText: null, unit: 'years per year' },
      ],
      epigeneticReadFailed: false,
      brandedPanels: [],
    });
    expect(payload.observedByPanel.epigenetic.count).toBe(2);
    expect(payload.observedByPanel.epigenetic.count).not.toBe(1);
    expect(payload.observedByPanel.epigenetic.source).toBe('epigenetic_markers');
    expect(payload.observedByPanel.epigenetic.unit).toBe('clocks');
  });

  it('keeps a 401 / error payload distinct from honest empty', () => {
    const empty = emptyOkHubPayload();
    const unauthorized = unauthorizedHubPayload();
    const errored = errorHubPayload();

    expect(empty.loadStatus).toBe('ok');
    expect(empty.totalVariants).toBe(0);
    expect(isHonestEmptyObserved(empty.observedByPanel.methylation)).toBe(true);

    expect(unauthorized.loadStatus).toBe('unauthorized');
    expect(errored.loadStatus).toBe('error');
    expect(unauthorized.totalVariants).toBeNull();
    expect(errored.totalVariants).toBeNull();
    expect(isUnknownObserved(unauthorized.observedByPanel.methylation)).toBe(true);
    expect(isUnknownObserved(errored.observedByPanel.hormone)).toBe(true);
    expect(unauthorized.observedByPanel.methylation.count).not.toBe(0);
    expect(errored.observedByPanel.methylation.count).not.toBe(0);
  });

  it('marks only the failed source UNKNOWN when other sources succeed', () => {
    const payload = buildHubVariantsPayload({
      variantRows: [{ panel_key: 'GENEX-M', rsid: 'rs1801133' }],
      variantsReadFailed: false,
      hormoneRows: [],
      hormoneReadFailed: true,
      epigeneticRows: [{ markerKey: 'epigenetic-age', valueNum: 48, valueText: null, unit: 'years' }],
      epigeneticReadFailed: false,
      brandedPanels: [],
    });
    expect(payload.loadStatus).toBe('ok');
    expect(payload.observedByPanel.methylation.count).toBe(1);
    expect(payload.observedByPanel.hormone.count).toBeNull();
    expect(payload.observedByPanel.epigenetic.count).toBe(1);
  });
});

describe('countDistinctEpigeneticMarkers', () => {
  it('dedupes marker keys and ignores blanks', () => {
    expect(
      countDistinctEpigeneticMarkers(['epigenetic-age', 'epigenetic-age', '', null, 'pace-of-aging']),
    ).toBe(2);
  });
});
