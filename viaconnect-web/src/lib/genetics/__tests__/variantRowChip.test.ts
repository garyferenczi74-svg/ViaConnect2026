import { describe, expect, it } from 'vitest';
import { VARIANT_ROW_CHIP_LABEL, variantRowChip } from '../variantRowChip';

describe('variantRowChip', () => {
  it('labels sample rows Demo, never Your variant', () => {
    expect(variantRowChip({ is_sample: true, genotype: 'CT', status: '+/-' })).toBe('demo');
    expect(VARIANT_ROW_CHIP_LABEL.demo).toBe('Demo');
    expect(Object.values(VARIANT_ROW_CHIP_LABEL)).not.toContain('Your variant');
  });

  it('labels a real call Result', () => {
    expect(
      variantRowChip({ is_sample: false, genotype: 'CT', status: '+/-' }),
    ).toBe('result');
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

  it('keeps a reference panel with a real call as Result', () => {
    expect(
      variantRowChip({
        is_sample: false,
        stored_panel_key: 'reference',
        genotype: 'CC',
      }),
    ).toBe('result');
  });
});
