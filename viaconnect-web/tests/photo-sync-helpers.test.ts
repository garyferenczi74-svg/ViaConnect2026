// Photo Sync prompt: pure-helper tests covering classification,
// normalization, Levenshtein distance, and the priority-1..5 matcher.

import { describe, it, expect } from 'vitest';
import { classifyImageUrl } from '@/lib/photoSync/classifyImageUrl';
import { normalizeFilename, normalizePathToKey, basename, folderOf, isAcceptableObject } from '@/lib/photoSync/normalizeFilename';
import { levenshteinDistance } from '@/lib/photoSync/levenshtein';
import { matchProductToFile } from '@/lib/photoSync/matchProductToFile';
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
