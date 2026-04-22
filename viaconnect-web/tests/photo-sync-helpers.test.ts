// Photo Sync prompt: pure-helper tests covering classification,
// normalization, Levenshtein distance, and the priority-1..5 matcher.

import { describe, it, expect } from 'vitest';
import { classifyImageUrl } from '@/lib/photoSync/classifyImageUrl';
import { normalizeFilename, normalizePathToKey, basename, folderOf, isAcceptableObject } from '@/lib/photoSync/normalizeFilename';
import { levenshteinDistance } from '@/lib/photoSync/levenshtein';
import { matchProductToFile } from '@/lib/photoSync/matchProductToFile';
import { classifyOutcome, ERROR_OUTCOMES } from '@/lib/photoSync/reconcileOutcome';
import { rowPassesScope } from '@/lib/photoSync/scopeFilter';
import {
  isInScopeCategory, expectedServicePath, legacyServiceSubfolderPath,
  IN_SCOPE_CATEGORIES, IN_SCOPE_CATEGORY_SLUGS,
} from '@/lib/photoSync/snpTargets';
import { PUBLIC_PREFIX, type BucketObject } from '@/lib/photoSync/types';

const PRESENT = new Set(['snp-support-formulations/mthfr-plus-folate-metabolism.png']);

describe('classifyImageUrl', () => {
  it('classifies null + empty as NULL', () => {
    expect(classifyImageUrl({ image_url: null, bucket_object_paths_set: PRESENT })).toBe('NULL');
    expect(classifyImageUrl({ image_url: '', bucket_object_paths_set: PRESENT })).toBe('NULL');
    expect(classifyImageUrl({ image_url: '   ', bucket_object_paths_set: PRESENT })).toBe('NULL');
  });
  it('classifies VALID_SUPABASE when path is in the bucket set', () => {
    expect(classifyImageUrl({
      image_url: `${PUBLIC_PREFIX}snp-support-formulations/mthfr-plus-folate-metabolism.png`,
      bucket_object_paths_set: PRESENT,
    })).toBe('VALID_SUPABASE');
  });
  it('classifies STALE_SUPABASE when path missing from bucket set', () => {
    expect(classifyImageUrl({
      image_url: `${PUBLIC_PREFIX}snp-support-formulations/missing.png`,
      bucket_object_paths_set: PRESENT,
    })).toBe('STALE_SUPABASE');
  });
  it('classifies PLACEHOLDER for placeholder/default/coming-soon paths', () => {
    expect(classifyImageUrl({ image_url: 'https://cdn.example.com/placeholder.png', bucket_object_paths_set: PRESENT })).toBe('PLACEHOLDER');
    expect(classifyImageUrl({ image_url: 'https://x.com/images/fallback/foo.jpg', bucket_object_paths_set: PRESENT })).toBe('PLACEHOLDER');
    expect(classifyImageUrl({ image_url: 'https://x.com/coming-soon/foo.jpg', bucket_object_paths_set: PRESENT })).toBe('PLACEHOLDER');
  });
  it('classifies external hosts as EXTERNAL', () => {
    expect(classifyImageUrl({ image_url: 'https://example.com/foo.png', bucket_object_paths_set: PRESENT })).toBe('EXTERNAL');
  });
});

describe('normalizeFilename', () => {
  it('lowercases, strips ext, replaces non-alnum with single dash', () => {
    expect(normalizeFilename('MTHFR Support+.png')).toBe('mthfr-support');
    expect(normalizeFilename('Replenish NAD+.png')).toBe('replenish-nad');
    expect(normalizeFilename('BPC157-INJECTABLE.WEBP')).toBe('bpc157-injectable');
  });
  it('trims leading + trailing dashes', () => {
    expect(normalizeFilename('+++Foo+++.png')).toBe('foo');
  });
  it('handles non-image extensions as part of the name (no strip)', () => {
    expect(normalizeFilename('weird.tiff')).toBe('weird-tiff');
  });
});

describe('normalizePathToKey + basename + folderOf', () => {
  it('strips folder prefix when normalizing', () => {
    expect(normalizePathToKey('snp-support-formulations/mthfr-plus-folate-metabolism.png'))
      .toBe('mthfr-plus-folate-metabolism');
  });
  it('basename + folderOf round-trip', () => {
    expect(basename('snp/x.png')).toBe('x.png');
    expect(folderOf('snp/x.png')).toBe('snp');
    expect(basename('x.png')).toBe('x.png');
    expect(folderOf('x.png')).toBe('');
  });
});

describe('isAcceptableObject', () => {
  it('rejects 0-byte', () => {
    expect(isAcceptableObject({ size_bytes: 0, mime_type: 'image/webp' })).toBe(false);
  });
  it('rejects oversize (>5MB)', () => {
    expect(isAcceptableObject({ size_bytes: 6 * 1024 * 1024, mime_type: 'image/webp' })).toBe(false);
  });
  it('rejects unknown mime', () => {
    expect(isAcceptableObject({ size_bytes: 1024, mime_type: 'application/octet-stream' })).toBe(false);
  });
  it('accepts small webp/png/jpeg/avif', () => {
    expect(isAcceptableObject({ size_bytes: 1024, mime_type: 'image/webp' })).toBe(true);
    expect(isAcceptableObject({ size_bytes: 1024, mime_type: 'image/png' })).toBe(true);
    expect(isAcceptableObject({ size_bytes: 1024, mime_type: 'image/jpeg' })).toBe(true);
    expect(isAcceptableObject({ size_bytes: 1024, mime_type: 'image/avif' })).toBe(true);
  });
});

describe('levenshteinDistance', () => {
  it('returns 0 for identical', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });
  it('returns single-edit distances', () => {
    expect(levenshteinDistance('abc', 'abd')).toBe(1);
    expect(levenshteinDistance('abc', 'ab')).toBe(1);
    expect(levenshteinDistance('abc', 'abcd')).toBe(1);
  });
  it('honors cap by returning cap+1 when exceeded', () => {
    expect(levenshteinDistance('aaaa', 'bbbb', 2)).toBeGreaterThan(2);
  });
  it('returns true distance when cap not provided', () => {
    expect(levenshteinDistance('aaaa', 'bbbb')).toBe(4);
  });
});

function makeObj(full_path: string, mime = 'image/png'): BucketObject {
  return { full_path, name: full_path.split('/').pop() ?? '', size_bytes: 1024, mime_type: mime, created_at: '2026-04-21T00:00:00Z', updated_at: '2026-04-21T00:00:00Z' };
}

function makeIndex(objs: BucketObject[]): Map<string, BucketObject[]> {
  const m = new Map<string, BucketObject[]>();
  for (const o of objs) {
    const k = normalizePathToKey(o.full_path);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(o);
  }
  return m;
}

describe('matchProductToFile', () => {
  const objects = [
    makeObj('mthfr-support.png'),
    makeObj('snp-support-formulations/mthfr-plus-folate-metabolism.png'),
    makeObj('replenish-nad.webp'),
  ];

  it('priority 1: SKU exact match → HIGH', () => {
    const r = matchProductToFile({
      product: { sku: 'MTHFR-SUPPORT', slug: null, category: 'snp_support' },
      bucket_objects: objects,
      bucket_keys_index: makeIndex(objects),
    });
    expect(r.confidence).toBe('HIGH');
    expect(r.chosen?.priority).toBe(1);
    expect(r.chosen?.source).toBe('sku_exact');
  });

  it('priority 5: fuzzy fallback when SKU/slug/category miss → LOW', () => {
    const r = matchProductToFile({
      product: { sku: 'MTHFR-SUPRT', slug: null, category: null },  // typo, distance 1 from "mthfr-support"
      bucket_objects: objects,
      bucket_keys_index: makeIndex(objects),
    });
    expect(r.confidence).toBe('LOW');
    expect(r.chosen?.priority).toBe(5);
    expect(r.chosen?.source).toMatch(/^fuzzy_lev=/);
  });

  it('priority 5 rejects distance > 2 → NONE', () => {
    const r = matchProductToFile({
      product: { sku: 'NOTHING-LIKE-IT', slug: null, category: null },
      bucket_objects: objects,
      bucket_keys_index: makeIndex(objects),
    });
    expect(r.confidence).toBe('NONE');
    expect(r.chosen).toBeNull();
  });

  it('variant rule: parent_sku + delivery_form wins over parent base image', () => {
    const objs = [
      makeObj('bpc157.webp'),
      makeObj('bpc157-injectable.webp'),
    ];
    const r = matchProductToFile({
      product: { sku: 'BPC157', slug: null, category: 'peptides' },
      variant: { sku: 'BPC157-INJ', delivery_form: 'injectable' },
      parent_sku: 'BPC157',
      bucket_objects: objs,
      bucket_keys_index: makeIndex(objs),
    });
    // The variant SKU itself ('BPC157-INJ' normalised → 'bpc157-inj')
    // doesn't match either bucket key directly, so the matcher falls
    // through to priority 4 ({parent_sku}-{delivery_form}).
    expect(r.confidence).toBe('HIGH');
    expect(r.chosen?.full_path).toBe('bpc157-injectable.webp');
    expect(r.chosen?.priority).toBe(4);
  });

  it('confidence never promotes LOW to HIGH (priority 5 stays LOW)', () => {
    const objs = [makeObj('almost-match.png')];
    const r = matchProductToFile({
      product: { sku: 'almost-matc', slug: null, category: null },  // distance 1
      bucket_objects: objs,
      bucket_keys_index: makeIndex(objs),
    });
    expect(r.confidence).toBe('LOW');
  });

  it('tie-break: prefers .webp over .png', () => {
    const objs = [makeObj('foo.png'), makeObj('foo.webp')];
    const r = matchProductToFile({
      product: { sku: 'foo', slug: null, category: null },
      bucket_objects: objs,
      bucket_keys_index: makeIndex(objs),
    });
    expect(r.chosen?.full_path).toBe('foo.webp');
  });

  it('returns NONE for unknown SKU with empty bucket', () => {
    const r = matchProductToFile({
      product: { sku: 'X', slug: null, category: null },
      bucket_objects: [],
      bucket_keys_index: new Map(),
    });
    expect(r.confidence).toBe('NONE');
    expect(r.chosen).toBeNull();
  });
});

describe('classifyOutcome (reconciliation report)', () => {
  it('HIGH plan + post VALID => flipped_to_valid', () => {
    expect(classifyOutcome({ pre: 'NULL', post: 'VALID_SUPABASE', confidence: 'HIGH' })).toBe('flipped_to_valid');
    expect(classifyOutcome({ pre: 'STALE_SUPABASE', post: 'VALID_SUPABASE', confidence: 'HIGH' })).toBe('flipped_to_valid');
    expect(classifyOutcome({ pre: 'PLACEHOLDER', post: 'VALID_SUPABASE', confidence: 'HIGH' })).toBe('flipped_to_valid');
  });

  it('HIGH plan + post NOT VALID => failed_to_flip (ERROR)', () => {
    expect(classifyOutcome({ pre: 'NULL', post: 'NULL', confidence: 'HIGH' })).toBe('failed_to_flip');
    expect(classifyOutcome({ pre: 'STALE_SUPABASE', post: 'STALE_SUPABASE', confidence: 'HIGH' })).toBe('failed_to_flip');
    expect(classifyOutcome({ pre: 'PLACEHOLDER', post: 'PLACEHOLDER', confidence: 'HIGH' })).toBe('failed_to_flip');
  });

  it('LOW plan never auto-applies => unchanged_stale when not VALID', () => {
    expect(classifyOutcome({ pre: 'NULL', post: 'NULL', confidence: 'LOW' })).toBe('unchanged_stale');
    expect(classifyOutcome({ pre: 'STALE_SUPABASE', post: 'STALE_SUPABASE', confidence: 'LOW' })).toBe('unchanged_stale');
  });

  it('LOW plan manually flipped => flipped_to_valid', () => {
    // Admin manually uploaded an image matching the LOW fuzzy match.
    expect(classifyOutcome({ pre: 'NULL', post: 'VALID_SUPABASE', confidence: 'LOW' })).toBe('flipped_to_valid');
  });

  it('NONE plan stays in its pre-bucket', () => {
    expect(classifyOutcome({ pre: 'NULL', post: 'NULL', confidence: 'NONE' })).toBe('unchanged_null');
    expect(classifyOutcome({ pre: 'PLACEHOLDER', post: 'PLACEHOLDER', confidence: 'NONE' })).toBe('unchanged_placeholder');
    expect(classifyOutcome({ pre: 'STALE_SUPABASE', post: 'STALE_SUPABASE', confidence: 'NONE' })).toBe('unchanged_stale');
  });

  it('EXTERNAL pre is always unchanged_external regardless of confidence', () => {
    expect(classifyOutcome({ pre: 'EXTERNAL', post: 'EXTERNAL', confidence: 'NONE' })).toBe('unchanged_external');
    // Even if confidence somehow says HIGH (spec forbids auto-rewrite), still treat as skipped.
    expect(classifyOutcome({ pre: 'EXTERNAL', post: 'EXTERNAL', confidence: 'HIGH' })).toBe('unchanged_external');
  });

  it('VALID pre + non-VALID post ALWAYS => unexpected_regress (ERROR)', () => {
    // Regression dominates confidence entirely — a row that was valid must stay valid.
    expect(classifyOutcome({ pre: 'VALID_SUPABASE', post: 'STALE_SUPABASE', confidence: 'NONE' })).toBe('unexpected_regress');
    expect(classifyOutcome({ pre: 'VALID_SUPABASE', post: 'NULL', confidence: 'HIGH' })).toBe('unexpected_regress');
    expect(classifyOutcome({ pre: 'VALID_SUPABASE', post: 'PLACEHOLDER', confidence: 'LOW' })).toBe('unexpected_regress');
  });

  it('VALID pre + VALID post (no change needed) => already_valid', () => {
    expect(classifyOutcome({ pre: 'VALID_SUPABASE', post: 'VALID_SUPABASE', confidence: 'NONE' })).toBe('already_valid');
  });

  it('audit-only row (no plan entry) => no_plan_entry', () => {
    expect(classifyOutcome({ pre: null, post: 'NULL', confidence: null })).toBe('no_plan_entry');
    expect(classifyOutcome({ pre: null, post: 'VALID_SUPABASE', confidence: null })).toBe('no_plan_entry');
  });

  it('ERROR_OUTCOMES contains exactly the two blocking outcomes', () => {
    expect(ERROR_OUTCOMES.has('failed_to_flip')).toBe(true);
    expect(ERROR_OUTCOMES.has('unexpected_regress')).toBe(true);
    expect(ERROR_OUTCOMES.has('flipped_to_valid')).toBe(false);
    expect(ERROR_OUTCOMES.has('unchanged_external')).toBe(false);
    expect(ERROR_OUTCOMES.size).toBe(2);
  });
});

describe('rowPassesScope (Prompt #110 sync scope flags)', () => {
  const EMPTY = { category: null, product_type: null, service_category: null };

  it('passes everything when no flag is set', () => {
    expect(rowPassesScope({ category: null }, EMPTY)).toBe(true);
    expect(rowPassesScope({ category: 'snp_support' }, EMPTY)).toBe(true);
    expect(rowPassesScope({ category: 'anything' }, EMPTY)).toBe(true);
  });

  it('--category does case-insensitive substring match', () => {
    const f = { ...EMPTY, category: 'SNP' };
    expect(rowPassesScope({ category: 'snp_support' }, f)).toBe(true);   // ergonomic match
    expect(rowPassesScope({ category: 'SNP Support' }, f)).toBe(true);
    expect(rowPassesScope({ category: 'Methylation / SNP' }, f)).toBe(true);
    expect(rowPassesScope({ category: 'base_formulas' }, f)).toBe(false);
    expect(rowPassesScope({ category: null }, f)).toBe(false);
  });

  it('--category preserves the literal-value use case', () => {
    const f = { ...EMPTY, category: 'snp_support' };
    expect(rowPassesScope({ category: 'snp_support' }, f)).toBe(true);
    // Case-insensitive, so caller can pass either casing.
    expect(rowPassesScope({ category: 'SNP_SUPPORT' }, f)).toBe(true);
  });

  it('--service-category substring-matches on category', () => {
    const f = { ...EMPTY, service_category: 'GeneX360' };
    expect(rowPassesScope({ category: 'genex360_testing' }, f)).toBe(true);
    expect(rowPassesScope({ category: 'GeneX360 Panels' }, f)).toBe(true);
    expect(rowPassesScope({ category: 'snp_support' }, f)).toBe(false);
  });

  it('--product-type is tolerant when the column is absent', () => {
    const f = { ...EMPTY, product_type: 'service' };
    // Column absent entirely (undefined): pass.
    expect(rowPassesScope({ category: 'any' }, f)).toBe(true);
    // Column present but null: pass.
    expect(rowPassesScope({ category: 'any', product_type: null }, f)).toBe(true);
    // Column present and matching: pass.
    expect(rowPassesScope({ category: 'any', product_type: 'service' }, f)).toBe(true);
    expect(rowPassesScope({ category: 'any', product_type: 'SERVICE' }, f)).toBe(true);
    // Column present and mismatched: reject.
    expect(rowPassesScope({ category: 'any', product_type: 'supplement' }, f)).toBe(false);
  });

  it('multiple flags AND together', () => {
    const f = { category: 'snp', product_type: null, service_category: null };
    expect(rowPassesScope({ category: 'snp_support', product_type: null }, f)).toBe(true);

    const fMulti = { category: 'snp', product_type: 'supplement', service_category: null };
    expect(rowPassesScope({ category: 'snp_support', product_type: 'supplement' }, fMulti)).toBe(true);
    expect(rowPassesScope({ category: 'snp_support', product_type: 'service' }, fMulti)).toBe(false);
    expect(rowPassesScope({ category: 'base_formulas', product_type: 'supplement' }, fMulti)).toBe(false);
  });
});

describe('isInScopeCategory (Prompt #110 scope-lock guard)', () => {
  it('accepts the two locked display strings', () => {
    expect(isInScopeCategory('Methylation / GeneX360')).toBe(true);
    expect(isInScopeCategory('Testing & Diagnostics')).toBe(true);
  });

  it('accepts the seeded slug variants for transition', () => {
    expect(isInScopeCategory('snp_support')).toBe(true);
    expect(isInScopeCategory('genex360_testing')).toBe(true);
    expect(isInScopeCategory('methylation-genex360')).toBe(true);
    expect(isInScopeCategory('testing-diagnostics')).toBe(true);
  });

  it('accepts MASTER_SKUS CategoryKey values used on /shop', () => {
    // farmceutica_master_skus.json Category field and CategoryKey union
    // in shop/page.tsx use these short forms. product_catalog.category
    // may mirror them.
    expect(isInScopeCategory('SNP')).toBe(true);
    expect(isInScopeCategory('Testing')).toBe(true);
    expect(isInScopeCategory('Methylation')).toBe(true);
    expect(isInScopeCategory('GeneX360')).toBe(true);
    expect(isInScopeCategory('Diagnostics')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isInScopeCategory('methylation / genex360')).toBe(true);
    expect(isInScopeCategory('TESTING & DIAGNOSTICS')).toBe(true);
    expect(isInScopeCategory('Snp_Support')).toBe(true);
  });

  it('rejects every out-of-scope category', () => {
    expect(isInScopeCategory('base_formulas')).toBe(false);              // Proprietary Base
    expect(isInScopeCategory('peptides')).toBe(false);
    expect(isInScopeCategory('functional_mushrooms')).toBe(false);
    expect(isInScopeCategory('womens_health')).toBe(false);
    expect(isInScopeCategory('childrens_methylated')).toBe(false);
    expect(isInScopeCategory('advanced_formulas')).toBe(false);
    expect(isInScopeCategory('anything-else')).toBe(false);
  });

  it('rejects null / empty / whitespace', () => {
    expect(isInScopeCategory(null)).toBe(false);
    expect(isInScopeCategory(undefined)).toBe(false);
    expect(isInScopeCategory('')).toBe(false);
    expect(isInScopeCategory('   ')).toBe(false);
  });

  it('IN_SCOPE_CATEGORIES has exactly two entries', () => {
    expect(IN_SCOPE_CATEGORIES).toHaveLength(2);
    expect(IN_SCOPE_CATEGORIES).toContain('Methylation / GeneX360');
    expect(IN_SCOPE_CATEGORIES).toContain('Testing & Diagnostics');
  });

  it('IN_SCOPE_CATEGORY_SLUGS includes transitional values', () => {
    expect(IN_SCOPE_CATEGORY_SLUGS).toContain('snp_support');
    expect(IN_SCOPE_CATEGORY_SLUGS).toContain('genex360_testing');
  });
});

describe('expectedServicePath (flat-root addendum)', () => {
  it('returns {slug}.webp at bucket root, no subfolder', () => {
    expect(expectedServicePath({ slug: 'genex-m' })).toBe('genex-m.webp');
    expect(expectedServicePath({ slug: 'nutrigendx' })).toBe('nutrigendx.webp');
    expect(expectedServicePath({ slug: 'cannabisiq' })).toBe('cannabisiq.webp');
  });

  it('legacyServiceSubfolderPath keeps services/ for stale-upload detection', () => {
    expect(legacyServiceSubfolderPath({ slug: 'genex-m' })).toBe('services/genex-m.webp');
  });
});
