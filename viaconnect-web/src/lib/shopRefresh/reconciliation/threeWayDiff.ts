// Prompt #106 §5.1 — three-way reconciliation: canonical (master_skus +
// pricing_tiers) ↔ product_catalog.
//
// Pure function: takes three pre-fetched datasets and emits a list of
// findings. Wiring to the DB lives in the edge function; the pure
// implementation is unit-testable without network.

import type {
  CatalogRow,
  CanonicalSkuRow,
  ShopFindingType,
  ShopRefreshFindingPayload,
} from '../types';
import {
  isOutOfScopeCategoryRaw,
  normalizeCategoryToSlug,
} from './categoryNormalizer';

export interface ReconciliationInputs {
  /** master_skus rows filtered to in-scope categories (Advanced/Base/Women/Children/SNP/Mushroom). */
  canonical: readonly CanonicalSkuRow[];
  /** pricing_tiers rows keyed by sku — msrp is the price source of truth. */
  pricingTiersBySku: Readonly<Record<string, number>>;
  /** product_catalog rows, full set (we'll filter out out-of-scope ones). */
  catalog: readonly CatalogRow[];
  /** SKUs present in genex360_products — never flagged as retirement candidates. */
  genex360Skus: ReadonlySet<string>;
  /** SKUs present in peptide_registry — never flagged as retirement candidates. */
  peptideSkus: ReadonlySet<string>;
}

/**
 * Pure: run the three-way diff and return findings. Caller persists to
 * shop_refresh_reconciliation_findings.
 */
export function reconcileThreeWay(
  inputs: ReconciliationInputs,
): ShopRefreshFindingPayload[] {
  const findings: ShopRefreshFindingPayload[] = [];
  const canonicalBySku = new Map<string, CanonicalSkuRow>();
  for (const c of inputs.canonical) canonicalBySku.set(c.sku, c);

  const catalogBySku = new Map<string, CatalogRow>();
  for (const cat of inputs.catalog) catalogBySku.set(cat.sku, cat);

  // 1. missing_in_catalog — canonical SKU with no live product_catalog row.
  for (const c of inputs.canonical) {
    if (!catalogBySku.has(c.sku)) {
      findings.push({
        findingType: 'missing_in_catalog',
        sku: c.sku,
        canonical: c,
        catalog: null,
      });
    }
  }

  // 2. catalog_not_in_canonical — live catalog row with no canonical backing.
  //    Explicitly exclude GeneX360 + peptide SKUs (they live in their own
  //    catalogs and are OUT OF SCOPE for #106 retirement review).
  for (const cat of inputs.catalog) {
    if (inputs.genex360Skus.has(cat.sku)) continue;
    if (inputs.peptideSkus.has(cat.sku)) continue;
    // Also skip if the catalog row's own category says it's out of scope —
    // the reconciler must never flag GeneX360 rows as retirement candidates
    // even if their SKU happens to not be in genex360_products.genex360_sku
    // (defense in depth against data drift).
    if (isOutOfScopeCategoryRaw(cat.category)) continue;
    if (!canonicalBySku.has(cat.sku)) {
      findings.push({
        findingType: 'catalog_not_in_canonical',
        sku: cat.sku,
        canonical: null,
        catalog: cat,
      });
    }
  }

  // 3. mismatched — canonical and catalog both present but differ. Compare
  //    normalized categories (so workbook spelling variants aren't spurious
  //    mismatches), compare name strings exactly, and compare price with a
  //    cent-rounded equality (both sources stored as NUMERIC).
  for (const c of inputs.canonical) {
    const cat = catalogBySku.get(c.sku);
    if (!cat) continue;

    if (c.name !== cat.name) {
      findings.push({ findingType: 'mismatched_name', sku: c.sku, canonical: c, catalog: cat });
    }

    const canonicalSlug = normalizeCategoryToSlug(c.category);
    const catalogSlug = normalizeCategoryToSlug(cat.category);
    if (canonicalSlug !== null && catalogSlug !== null && canonicalSlug !== catalogSlug) {
      findings.push({ findingType: 'mismatched_category', sku: c.sku, canonical: c, catalog: cat });
    } else if (canonicalSlug !== null && catalogSlug === null) {
      // Catalog row has a non-canonical category label — mismatch.
      findings.push({ findingType: 'mismatched_category', sku: c.sku, canonical: c, catalog: cat });
    }

    // Price comparison uses pricing_tiers.msrp as the source of truth; if
    // the canonical row's msrp disagrees with pricing_tiers, that's an
    // upstream data issue, not a reconciliation finding.
    const tierPrice = inputs.pricingTiersBySku[c.sku];
    const expectedPrice = tierPrice !== undefined ? tierPrice : c.msrp;
    const catalogPrice = cat.price;
    if (!priceEq(expectedPrice, catalogPrice)) {
      findings.push({ findingType: 'mismatched_price', sku: c.sku, canonical: c, catalog: cat });
    }
  }

  return findings;
}

function priceEq(a: number, b: number): boolean {
  // Compare to the cent — both numeric(x,y) stored with ≤4 decimal places.
  return Math.round(a * 100) === Math.round(b * 100);
}

/** Group findings by type for UI pane rendering. */
export function groupByType(
  findings: readonly ShopRefreshFindingPayload[],
): Record<ShopFindingType, ShopRefreshFindingPayload[]> {
  const out: Record<ShopFindingType, ShopRefreshFindingPayload[]> = {
    missing_in_catalog: [],
    catalog_not_in_canonical: [],
    mismatched_name: [],
    mismatched_category: [],
    mismatched_price: [],
  };
  for (const f of findings) out[f.findingType].push(f);
  return out;
}
