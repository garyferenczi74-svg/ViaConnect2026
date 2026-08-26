import { describe, expect, it } from 'vitest';
import { VARIANT_ROW_CHIP_LABEL, variantRowChip } from '../variantRowChip';

describe('variantRowChip', () => {
  it('labels sample rows Demo, never Your variant', () => {
    expect(variantRowChip({ is_sample: true, genotype: 'CT', status: '+/-' })).toBe('demo');
    expect(VARIANT_ROW_CHIP_LABEL.demo).toBe('Demo');
    expect(Object.values(VARIANT_ROW_CHIP_LABEL)).not.toContain('Your variant');
    expect(Object.values(VARIANT_ROW_CHIP_LABEL)).not.toContain('GeneX-M');
  });

  it('maps genex_m / GENEX-M / methylation calls to the GeneXM chip', () => {
    expect(
      variantRowChip({
        is_sample: false,
        genotype: 'CT',
        stored_panel_key: 'genex_m',
      }),
    ).toBe('genexm');
    expect(
      variantRowChip({
        is_sample: false,
        genotype: 'CT',
        stored_panel_key: 'GENEX-M',
      }),
    ).toBe('genexm');
    expect(
      variantRowChip({
        is_sample: false,
        status: '+/-',
        stored_panel_key: 'methylation',
      }),
    ).toBe('genexm');
    expect(VARIANT_ROW_CHIP_LABEL.genexm).toBe('GeneXM');
  });

  it('labels a missing call Unanalyzed, never 0 or n/a', () => {
    expect(variantRowChip({ is_sample: false, genotype: null, status: null })).toBe(
      'unanalyzed',
    );
    expect(VARIANT_ROW_CHIP_LABEL.unanalyzed).toBe('Unanalyzed');
    expect(VARIANT_ROW_CHIP_LABEL.unanalyzed).not.toBe('0');
    expect(VARIANT_ROW_CHIP_LABEL.unanalyzed).not.toBe('n/a');
  });

  it('labels a remap miss Unanalyzed', () => {
    expect(
      variantRowChip({
        is_sample: false,
        genotype: 'CT',
        remapMiss: true,
      }),
    ).toBe('unanalyzed');
  });

  it('labels a reference panel without a call Reference', () => {
    expect(
      variantRowChip({
        is_sample: false,
        stored_panel_key: 'reference',
        genotype: null,
        status: null,
      }),
    ).toBe('reference');
  });

  it('maps a reference panel with a real call to GeneXM', () => {
    expect(
      variantRowChip({
        is_sample: false,
        stored_panel_key: 'reference',
        genotype: 'CC',
      }),
    ).toBe('genexm');
  });

  it('labels other GENEX360 panel calls GENEX360 and competitor calls your upload', () => {
    expect(
      variantRowChip({
        is_sample: false,
        genotype: 'AA',
        stored_panel_key: 'nutrigen_dx',
      }),
    ).toBe('genex360');
    expect(
      variantRowChip({
        is_sample: false,
        genotype: 'AA',
        stored_panel_key: '23andme',
      }),
    ).toBe('your_upload');
    expect(VARIANT_ROW_CHIP_LABEL.your_upload).toBe('your upload');
  });
});
