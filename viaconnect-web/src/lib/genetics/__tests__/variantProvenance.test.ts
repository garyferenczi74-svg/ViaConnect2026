import { describe, expect, it } from 'vitest';
import {
  buildVariantProvenance,
  formatVariantProvenance,
  isoDateOnly,
} from '../variantProvenance';

describe('variantProvenance', () => {
  it('formats source, date, and kit when known', () => {
    const provenance = buildVariantProvenance({
      provider: 'LifeMetrics',
      uploadCreatedAt: '2026-08-12T15:04:00Z',
      brandedProductCode: 'GENEX-M',
    });
    expect(formatVariantProvenance(provenance)).toBe('LifeMetrics · 2026-08-12 · GENEX-M');
  });

  it('omits unknown parts instead of inventing them', () => {
    expect(
      formatVariantProvenance(
        buildVariantProvenance({
          provider: '23andMe',
          uploadCreatedAt: null,
          brandedProductCode: null,
        }),
      ),
    ).toBe('23andMe');
    expect(formatVariantProvenance(buildVariantProvenance({}))).toBeNull();
  });

  it('falls back to the variant created_at date', () => {
    expect(isoDateOnly('2026-01-02T00:00:00.000Z')).toBe('2026-01-02');
    expect(
      formatVariantProvenance(
        buildVariantProvenance({
          variantCreatedAt: '2026-01-02T00:00:00.000Z',
        }),
      ),
    ).toBe('2026-01-02');
  });
});
