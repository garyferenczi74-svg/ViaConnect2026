// Prompt #106 §13 — canonical naming + scope-guard tests.

import { describe, it, expect } from 'vitest';
import {
  parseCanonicalObjectPath,
  slugifyForPath,
  buildObjectPath,
  isPlaceholderPath,
} from '@/lib/shopRefresh/upload/canonicalNaming';

describe('parseCanonicalObjectPath', () => {
  it('accepts a valid {category}/{sku}.png path', () => {
    const r = parseCanonicalObjectPath('advanced-formulations/creatine-hcl-plus.png');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.parsed.categorySlug).toBe('advanced-formulations');
      expect(r.parsed.skuSlug).toBe('creatine-hcl-plus');
      expect(r.parsed.version).toBe(1);
      expect(r.parsed.extension).toBe('png');
    }
  });

  it('accepts versioned filenames -v2, -v3 …', () => {
    const r = parseCanonicalObjectPath('snp-methylation/mthfr-plus-v3.png');
    expect(r.ok).toBe(false); // snp-methylation is NOT a canonical slug
    const r2 = parseCanonicalObjectPath('snp-support-formulations/mthfr-plus-v3.png');
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.parsed.version).toBe(3);
  });

  it('accepts JPEG extensions', () => {
    const r = parseCanonicalObjectPath('base-formulations/methylb-complete.jpeg');
    expect(r.ok).toBe(true);
  });

  it('rejects file at bucket root (no category dir)', () => {
    const r = parseCanonicalObjectPath('creatine-hcl-plus.png');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/two segments/);
  });

  it('rejects unknown category slug', () => {
    const r = parseCanonicalObjectPath('peptides/retatrutide.png');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not in the 6 in-scope/);
  });

  it('rejects genex360/ category slug', () => {
    const r = parseCanonicalObjectPath('genex360/genex360-test-kit.png');
    expect(r.ok).toBe(false);
  });

  it('rejects version 1 with explicit -v1 suffix (bad form)', () => {
    const r = parseCanonicalObjectPath('advanced-formulations/creatine-hcl-plus-v1.png');
    expect(r.ok).toBe(false);
  });

  it('rejects paths with .. traversal', () => {
    const r = parseCanonicalObjectPath('../secrets.png');
    expect(r.ok).toBe(false);
  });

  it('rejects SVG and AVIF and WebP extensions', () => {
    for (const p of [
      'advanced-formulations/foo.svg',
      'advanced-formulations/foo.avif',
      'advanced-formulations/foo.webp',
    ]) {
      const r = parseCanonicalObjectPath(p);
      expect(r.ok).toBe(false);
    }
  });

  it('rejects placeholder paths as non-bindable', () => {
    const r = parseCanonicalObjectPath('placeholders/base-formulations-placeholder.png');
    expect(r.ok).toBe(false);
    expect(isPlaceholderPath('placeholders/foo.png')).toBe(true);
  });

  it('slugifyForPath normalizes SKU text', () => {
    // "+" translates to "-plus" per the §4.2 canonical filename convention.
    expect(slugifyForPath('MTHFR+')).toBe('mthfr-plus');
    expect(slugifyForPath('MTHFR+™ Folate Metabolism')).toBe('mthfr-plus-folate-metabolism');
    expect(slugifyForPath('Creatine HCL+')).toBe('creatine-hcl-plus');
    expect(slugifyForPath("Sproutables Children's Gummies"))
      .toBe('sproutables-childrens-gummies');
  });

  it('buildObjectPath is the inverse for the primary case', () => {
    const p = buildObjectPath({
      categorySlug: 'advanced-formulations',
      skuSlug: 'creatine-hcl-plus',
    });
    expect(p).toBe('advanced-formulations/creatine-hcl-plus.png');
    const v3 = buildObjectPath({
      categorySlug: 'advanced-formulations',
      skuSlug: 'creatine-hcl-plus',
      version: 3,
    });
    expect(v3).toBe('advanced-formulations/creatine-hcl-plus-v3.png');
  });
});
