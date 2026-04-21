// Prompt #106 §5 — reconciliation three-way diff tests.

import { describe, it, expect } from 'vitest';
import { reconcileThreeWay, groupByType } from '@/lib/shopRefresh/reconciliation/threeWayDiff';
import type { CanonicalSkuRow, CatalogRow } from '@/lib/shopRefresh/types';

function canon(sku: string, name: string, category: string, msrp: number): CanonicalSkuRow {
  return { sku, name, category, msrp };
}
function cat(sku: string, name: string, category: string, price: number, active = true): CatalogRow {
  return { sku, name, category, price, image_url: null, active };
}

describe('reconcileThreeWay', () => {
  it('flags canonical SKUs missing from catalog', () => {
    const findings = reconcileThreeWay({
      canonical: [canon('MTHFR-PLUS', 'MTHFR+', 'SNP', 39.99)],
      pricingTiersBySku: { 'MTHFR-PLUS': 39.99 },
      catalog: [],
      genex360Skus: new Set(),
      peptideSkus: new Set(),
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.findingType).toBe('missing_in_catalog');
    expect(findings[0]!.sku).toBe('MTHFR-PLUS');
  });

  it('flags catalog SKUs without canonical backing (not GeneX360, not peptide)', () => {
    const findings = reconcileThreeWay({
      canonical: [],
      pricingTiersBySku: {},
      catalog: [cat('STALE-SKU', 'Stale Product', 'advanced', 29.99)],
      genex360Skus: new Set(),
      peptideSkus: new Set(),
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.findingType).toBe('catalog_not_in_canonical');
  });

  it('does NOT flag GeneX360 catalog rows as retirement candidates', () => {
    const findings = reconcileThreeWay({
      canonical: [],
      pricingTiersBySku: {},
      catalog: [cat('GENEX-KIT-A', 'Genetic Kit A', 'genetic', 299.00)],
      genex360Skus: new Set(['GENEX-KIT-A']),
      peptideSkus: new Set(),
    });
    expect(findings).toEqual([]);
  });

  it('does NOT flag catalog rows with category "genetic" or "Testing" even if sku not in genex360_products', () => {
    // Defense in depth against data drift — even without the sku in
    // genex360_products, the category label indicates out-of-scope.
    const findings = reconcileThreeWay({
      canonical: [],
      pricingTiersBySku: {},
      catalog: [
        cat('ORPHAN-GENETIC', 'Orphan Testing Product', 'genetic', 249.00),
        cat('ORPHAN-TESTING', 'Orphan Test Kit', 'Testing', 149.00),
        cat('ORPHAN-TESTKIT', 'Orphan Kit', 'test_kit', 199.00),
      ],
      genex360Skus: new Set(),
      peptideSkus: new Set(),
    });
    expect(findings).toEqual([]);
  });

  it('does NOT flag peptide catalog rows', () => {
    const findings = reconcileThreeWay({
      canonical: [],
      pricingTiersBySku: {},
      catalog: [cat('RETAT-001', 'Retatrutide', 'advanced', 499.00)],
      genex360Skus: new Set(),
      peptideSkus: new Set(['RETAT-001']),
    });
    expect(findings).toEqual([]);
  });

  it('detects name mismatch', () => {
    const findings = reconcileThreeWay({
      canonical: [canon('MTHFR-PLUS', 'MTHFR+', 'SNP', 39.99)],
      pricingTiersBySku: { 'MTHFR-PLUS': 39.99 },
      catalog: [cat('MTHFR-PLUS', 'MTHFR Plus (Old Name)', 'SNP', 39.99)],
      genex360Skus: new Set(),
      peptideSkus: new Set(),
    });
    expect(findings.some((f) => f.findingType === 'mismatched_name')).toBe(true);
  });

  it('does NOT flag category mismatch when both normalize to the same canonical slug', () => {
    // "SNP" (short master_skus) vs "snp-support-formulations" (catalog) should
    // normalize to the same canonical slug.
    const findings = reconcileThreeWay({
      canonical: [canon('FOO', 'Foo', 'SNP', 10)],
      pricingTiersBySku: { FOO: 10 },
      catalog: [cat('FOO', 'Foo', 'GENITC SNP METHYLATION SUPPORT', 10)],
      genex360Skus: new Set(),
      peptideSkus: new Set(),
    });
    expect(findings.filter((f) => f.findingType === 'mismatched_category')).toEqual([]);
  });

  it('detects price mismatch using pricing_tiers.msrp as source of truth', () => {
    const findings = reconcileThreeWay({
      canonical: [canon('BAR', 'Bar', 'Base', 29.99)],
      pricingTiersBySku: { BAR: 39.99 }, // pricing_tiers says 39.99 — canonical
      catalog: [cat('BAR', 'Bar', 'Base', 29.99)],
      genex360Skus: new Set(),
      peptideSkus: new Set(),
    });
    expect(findings.some((f) => f.findingType === 'mismatched_price')).toBe(true);
  });

  it('groupByType buckets findings correctly', () => {
    const findings = reconcileThreeWay({
      canonical: [
        canon('MISSING-1', 'M1', 'SNP', 10),
        canon('MISSING-2', 'M2', 'SNP', 20),
        canon('MISMATCH-P', 'MP', 'SNP', 30),
      ],
      pricingTiersBySku: { 'MISSING-1': 10, 'MISSING-2': 20, 'MISMATCH-P': 30 },
      catalog: [
        cat('MISMATCH-P', 'MP', 'SNP', 40), // price mismatch
        cat('STALE-X', 'Stale', 'advanced', 15), // retirement candidate
      ],
      genex360Skus: new Set(),
      peptideSkus: new Set(),
    });
    const grouped = groupByType(findings);
    expect(grouped.missing_in_catalog).toHaveLength(2);
    expect(grouped.mismatched_price).toHaveLength(1);
    expect(grouped.catalog_not_in_canonical).toHaveLength(1);
  });
});
