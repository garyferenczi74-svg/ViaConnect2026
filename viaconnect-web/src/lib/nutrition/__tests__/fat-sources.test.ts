import { describe, it, expect, vi } from 'vitest';
import {
  resolveFatBreakdown,
  cookingOilToFatSourceSlug,
  loadFatSourceBySlug,
  type FatSourceProfile,
} from '../fat-sources';

const oliveOil: FatSourceProfile = {
  slug: 'olive_oil',
  displayName: 'Olive oil',
  saturatedGPerG: 0.14,
  monounsaturatedGPerG: 0.73,
  polyunsaturatedGPerG: 0.11,
  transGPerG: 0,
  omega3GPerG: 0.008,
  omega6GPerG: 0.098,
  healthTier: 'favorable',
  fatQualityValue: 85,
};

describe('cookingOilToFatSourceSlug', () => {
  it('maps oil types to fat_sources slugs', () => {
    expect(cookingOilToFatSourceSlug('evoo')).toBe('extra_virgin_olive_oil');
    expect(cookingOilToFatSourceSlug('vegetable_canola_oil')).toBe('canola_oil');
    expect(cookingOilToFatSourceSlug('butter')).toBe('butter');
    expect(cookingOilToFatSourceSlug('none')).toBeNull();
    expect(cookingOilToFatSourceSlug('other')).toBe('not_specified');
  });
});

describe('resolveFatBreakdown', () => {
  it('intrinsic only (no added fat): saturated is the intrinsic value', () => {
    const b = resolveFatBreakdown({
      intrinsicTotalFatG: 15,
      intrinsicSaturatedG: 2.1,
      addedFatG: 0,
      source: null,
    });
    expect(b.saturated_g).toBe(2.1);
    expect(b.added_fat_g).toBe(0);
    expect(b.added_saturated_g).toBeNull();
    expect(b.fat_source_slug).toBeNull();
  });

  it('added fat with a known source: saturated = intrinsic + source times added', () => {
    const b = resolveFatBreakdown({
      intrinsicTotalFatG: 5,
      intrinsicSaturatedG: 1,
      addedFatG: 10,
      source: oliveOil,
    });
    expect(b.added_saturated_g).toBeCloseTo(1.4);
    expect(b.saturated_g).toBeCloseTo(2.4);
    expect(b.added_monounsaturated_g).toBeCloseTo(7.3);
    expect(b.fat_quality_value).toBe(85);
    expect(b.fat_source_slug).toBe('olive_oil');
    expect(b.added_fat_g).toBe(10);
  });

  it('added fat with an unknown source: total saturated is NULL, not 0', () => {
    const b = resolveFatBreakdown({
      intrinsicTotalFatG: 5,
      intrinsicSaturatedG: 1,
      addedFatG: 10,
      source: null,
    });
    expect(b.saturated_g).toBeNull();
    expect(b.added_saturated_g).toBeNull();
  });

  it('a source with a NULL profile (not_specified) is treated as unknown', () => {
    const notSpecified: FatSourceProfile = {
      ...oliveOil,
      slug: 'not_specified',
      saturatedGPerG: null,
      monounsaturatedGPerG: null,
      polyunsaturatedGPerG: null,
      transGPerG: null,
      omega3GPerG: null,
      omega6GPerG: null,
      healthTier: 'neutral',
      fatQualityValue: null,
    };
    const b = resolveFatBreakdown({
      intrinsicTotalFatG: 5,
      intrinsicSaturatedG: 1,
      addedFatG: 10,
      source: notSpecified,
    });
    expect(b.saturated_g).toBeNull();
    expect(b.fat_source_slug).toBe('not_specified');
  });
});

describe('loadFatSourceBySlug', () => {
  it('maps a DB row to a profile', async () => {
    const row = {
      slug: 'butter',
      display_name: 'Butter',
      saturated_g_per_g: 0.63,
      monounsaturated_g_per_g: 0.26,
      polyunsaturated_g_per_g: 0.04,
      trans_g_per_g: 0.03,
      omega3_g_per_g: 0.005,
      omega6_g_per_g: 0.022,
      health_tier: 'limit',
      fat_quality_value: 32,
      is_active: true,
      sort_order: 160,
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as Parameters<typeof loadFatSourceBySlug>[0];

    const profile = await loadFatSourceBySlug(client, 'butter');
    expect(from).toHaveBeenCalledWith('fat_sources');
    expect(profile?.slug).toBe('butter');
    expect(profile?.saturatedGPerG).toBe(0.63);
    expect(profile?.healthTier).toBe('limit');
    expect(profile?.fatQualityValue).toBe(32);
  });

  it('returns null on error (fail-open)', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as Parameters<typeof loadFatSourceBySlug>[0];
    expect(await loadFatSourceBySlug(client, 'missing')).toBeNull();
  });
});
