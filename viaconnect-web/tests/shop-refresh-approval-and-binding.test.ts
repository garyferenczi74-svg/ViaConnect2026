// Prompt #106 §13 — typed-confirmation + binding resolver + category
// normalizer tests.

import { describe, it, expect } from 'vitest';
import {
  validateBulkImageRefreshConfirmation,
  validatePublishBatchConfirmation,
  validateRetirementConfirmation,
  validatePrimarySwapConfirmation,
  validateRetirementReason,
} from '@/lib/shopRefresh/approval/typedConfirmation';
import {
  resolveBinding,
  placeholderObjectPath,
  isPlaceholderImageUrl,
} from '@/lib/shopRefresh/upload/bindingResolver';
import {
  normalizeCategoryToSlug,
  isOutOfScopeCategoryRaw,
  canonicalLabelForSlug,
  brandIdentityForSlug,
} from '@/lib/shopRefresh/reconciliation/categoryNormalizer';

describe('typed-confirmation phrases', () => {
  it('bulk image refresh requires exact case + whitespace', () => {
    expect(validateBulkImageRefreshConfirmation('APPROVE IMAGE REFRESH')).toBe(true);
    expect(validateBulkImageRefreshConfirmation('approve image refresh')).toBe(false);
    expect(validateBulkImageRefreshConfirmation('APPROVE IMAGE REFRESH ')).toBe(false);
    expect(validateBulkImageRefreshConfirmation('APPROVE  IMAGE REFRESH')).toBe(false);
  });

  it('publish batch requires exact SKU count', () => {
    expect(validatePublishBatchConfirmation('PUBLISH 5 SKUS', 5)).toBe(true);
    expect(validatePublishBatchConfirmation('PUBLISH 5 SKUS', 6)).toBe(false);
    expect(validatePublishBatchConfirmation('PUBLISH 5 SKU', 5)).toBe(false);
    expect(validatePublishBatchConfirmation('publish 5 skus', 5)).toBe(false);
  });

  it('publish batch rejects zero or negative counts', () => {
    expect(validatePublishBatchConfirmation('PUBLISH 0 SKUS', 0)).toBe(false);
    expect(validatePublishBatchConfirmation('PUBLISH -1 SKUS', -1)).toBe(false);
  });

  it('retirement + primary swap phrases', () => {
    expect(validateRetirementConfirmation('APPROVE RETIREMENT')).toBe(true);
    expect(validateRetirementConfirmation('APPROVE')).toBe(false);
    expect(validatePrimarySwapConfirmation('APPROVE PRIMARY SWAP')).toBe(true);
    expect(validatePrimarySwapConfirmation('APPROVE')).toBe(false);
  });

  it('retirement reason requires ≥ 20 chars after trim', () => {
    expect(validateRetirementReason(null)).toBe(false);
    expect(validateRetirementReason('')).toBe(false);
    expect(validateRetirementReason('too short')).toBe(false);
    expect(validateRetirementReason('   short   ')).toBe(false); // trim → 5 chars
    expect(validateRetirementReason('this is a proper explanation, twenty plus chars'))
      .toBe(true);
  });
});

describe('binding resolver', () => {
  it('finds unique match by slugified sku', () => {
    const r = resolveBinding({
      parsedSkuSlug: 'mthfr-plus',
      candidates: [
        { sku: 'MTHFR+', name: 'MTHFR+ Folate Metabolism' },
        { sku: 'CREATINE-HCL+', name: 'Creatine HCL+' },
      ],
    });
    expect(r.kind).toBe('unique');
    if (r.kind === 'unique') expect(r.sku).toBe('MTHFR+');
  });

  it('finds unique match by slugified name when sku does not slugify to same', () => {
    // Uploader used the full-name slug; sku alone slugifies differently.
    const r = resolveBinding({
      parsedSkuSlug: 'replenish-nad-plus',
      candidates: [
        { sku: 'REPL-NAD', name: 'Replenish NAD+' },
      ],
    });
    expect(r.kind).toBe('unique');
    if (r.kind === 'unique') expect(r.sku).toBe('REPL-NAD');
  });

  it('returns none when no candidate matches', () => {
    const r = resolveBinding({
      parsedSkuSlug: 'foobar',
      candidates: [{ sku: 'MTHFR+', name: 'MTHFR+ Folate' }],
    });
    expect(r.kind).toBe('none');
  });

  it('returns ambiguous when multiple candidates match', () => {
    const r = resolveBinding({
      parsedSkuSlug: 'calm-plus',
      candidates: [
        { sku: 'CALM+', name: 'Calm+' },
        { sku: 'CALM-PLUS', name: 'Calm Plus' },
      ],
    });
    expect(r.kind).toBe('ambiguous');
  });

  it('placeholder path builds correctly', () => {
    expect(placeholderObjectPath('base-formulations'))
      .toBe('placeholders/base-formulations-placeholder.png');
    expect(isPlaceholderImageUrl('https://xxx.supabase.co/storage/v1/object/public/supplement-photos/placeholders/base-formulations-placeholder.png'))
      .toBe(true);
    expect(isPlaceholderImageUrl('https://xxx.supabase.co/storage/v1/object/public/supplement-photos/base-formulations/foo.png'))
      .toBe(false);
  });
});

describe('category normalizer', () => {
  it('maps workbook typo GENITC to snp-support-formulations', () => {
    expect(normalizeCategoryToSlug('GENITC SNP METHYLATION SUPPORT'))
      .toBe('snp-support-formulations');
  });

  it('maps short master_skus labels', () => {
    expect(normalizeCategoryToSlug('SNP')).toBe('snp-support-formulations');
    expect(normalizeCategoryToSlug('Women')).toBe('womens-health');
    expect(normalizeCategoryToSlug('Children')).toBe('sproutables-childrens');
    expect(normalizeCategoryToSlug('Mushroom')).toBe('functional-mushrooms');
    expect(normalizeCategoryToSlug('Advanced')).toBe('advanced-formulations');
    expect(normalizeCategoryToSlug('Base')).toBe('base-formulations');
  });

  it('flags GeneX360 testing labels as out-of-scope', () => {
    expect(isOutOfScopeCategoryRaw('Testing')).toBe(true);
    expect(isOutOfScopeCategoryRaw('genetic')).toBe(true);
    expect(isOutOfScopeCategoryRaw('test_kit')).toBe(true);
    expect(normalizeCategoryToSlug('Testing')).toBeNull();
  });

  it('canonicalLabelForSlug returns display label', () => {
    expect(canonicalLabelForSlug('snp-support-formulations')).toBe('SNP Support Formulations');
    expect(canonicalLabelForSlug('sproutables-childrens')).toBe("Sproutables (Children's)");
  });

  it('brandIdentityForSlug returns non-empty', () => {
    expect(brandIdentityForSlug('advanced-formulations')).toBe('Dual Delivery Technology');
    expect(brandIdentityForSlug('base-formulations')).toBe('Methylated Formula');
  });
});
