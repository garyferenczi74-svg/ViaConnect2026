// Prompt #106 §5.2 — workbook-spelling → canonical taxonomy mapping.
//
// The Strategic Pricing workbook contains the typo "GENITC SNP METHYLATION
// SUPPORT" and historical short labels (Advanced / Base / Women). The
// canonical taxonomy is #103's product_categories slugs. This module is
// the single source of truth for the mapping; every layer (reconciliation,
// gap-fill insert, image upload, shop card render) routes through it so
// workbook typos NEVER propagate into product_catalog.category per §3.7.

import type { InScopeCategorySlug } from '../types';
import { IN_SCOPE_CATEGORY_SLUGS } from '../types';

export type WorkbookCategoryKey = string;

interface CategoryMapEntry {
  canonicalSlug: InScopeCategorySlug;
  canonicalLabel: string; // UI display label (title-case, not raw slug)
  brandIdentityMark: string; // #103 §14
}

/**
 * Workbook spelling → canonical mapping. Key is uppercased + whitespace-
 * normalized workbook text; value is the canonical triple that downstream
 * code consumes.
 */
const MAP: Record<WorkbookCategoryKey, CategoryMapEntry> = {
  // Long-form workbook spellings (as in the Strategic Pricing Final 8 workbook)
  'BASE FORMULATIONS': {
    canonicalSlug: 'base-formulations',
    canonicalLabel: 'Base Formulations',
    brandIdentityMark: 'Methylated Formula',
  },
  'ADVANCED FORMULATIONS': {
    canonicalSlug: 'advanced-formulations',
    canonicalLabel: 'Advanced Formulations',
    brandIdentityMark: 'Dual Delivery Technology',
  },
  "WOMEN'S HEALTH": {
    canonicalSlug: 'womens-health',
    canonicalLabel: "Women's Health",
    brandIdentityMark: 'Dual Delivery Technology',
  },
  "CHILDREN'S MULTIVITAMINS": {
    canonicalSlug: 'sproutables-childrens',
    canonicalLabel: "Sproutables (Children's)",
    brandIdentityMark: 'Methylated Formula',
  },
  // Workbook typo — normalized to the canonical #103 slug.
  'GENITC SNP METHYLATION SUPPORT': {
    canonicalSlug: 'snp-support-formulations',
    canonicalLabel: 'SNP Support Formulations',
    brandIdentityMark: 'Dual Delivery Technology',
  },
  'GENETIC SNP METHYLATION SUPPORT': {
    canonicalSlug: 'snp-support-formulations',
    canonicalLabel: 'SNP Support Formulations',
    brandIdentityMark: 'Dual Delivery Technology',
  },
  'FUNCTIONAL MUSHROOMS': {
    canonicalSlug: 'functional-mushrooms',
    canonicalLabel: 'Functional Mushrooms',
    brandIdentityMark: 'Dual Delivery Technology',
  },

  // Short labels (master_skus.category uses these today)
  ADVANCED: {
    canonicalSlug: 'advanced-formulations',
    canonicalLabel: 'Advanced Formulations',
    brandIdentityMark: 'Dual Delivery Technology',
  },
  BASE: {
    canonicalSlug: 'base-formulations',
    canonicalLabel: 'Base Formulations',
    brandIdentityMark: 'Methylated Formula',
  },
  WOMEN: {
    canonicalSlug: 'womens-health',
    canonicalLabel: "Women's Health",
    brandIdentityMark: 'Dual Delivery Technology',
  },
  CHILDREN: {
    canonicalSlug: 'sproutables-childrens',
    canonicalLabel: "Sproutables (Children's)",
    brandIdentityMark: 'Methylated Formula',
  },
  SNP: {
    canonicalSlug: 'snp-support-formulations',
    canonicalLabel: 'SNP Support Formulations',
    brandIdentityMark: 'Dual Delivery Technology',
  },
  MUSHROOM: {
    canonicalSlug: 'functional-mushrooms',
    canonicalLabel: 'Functional Mushrooms',
    brandIdentityMark: 'Dual Delivery Technology',
  },
};

function keyOf(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function isInScopeCategoryRaw(raw: string): boolean {
  return keyOf(raw) in MAP;
}

export function isOutOfScopeCategoryRaw(raw: string): boolean {
  // Explicit rejection for out-of-scope categories — GeneX360 testing and
  // anything else we saw in the observe step. Used by scope guards to halt
  // processing early on a mismatched row.
  const k = keyOf(raw);
  const OUT_OF_SCOPE = new Set([
    'TESTING', 'GENEX360', 'PEPTIDES', 'PEPTIDE',
    'GENETIC', // product_catalog has this — it's the GeneX360 category
    'TEST_KIT', 'TEST KIT',
  ]);
  return OUT_OF_SCOPE.has(k);
}

/**
 * Normalize any raw category string to its canonical slug. Returns null
 * when the input is not in the in-scope map — callers MUST treat null as
 * an out-of-scope signal and halt (per §3.7 "never propagate workbook
 * typos into canonical names").
 */
export function normalizeCategoryToSlug(raw: string): InScopeCategorySlug | null {
  const entry = MAP[keyOf(raw)];
  return entry?.canonicalSlug ?? null;
}

export function canonicalLabelForSlug(slug: InScopeCategorySlug): string {
  for (const e of Object.values(MAP)) if (e.canonicalSlug === slug) return e.canonicalLabel;
  return slug;
}

export function brandIdentityForSlug(slug: InScopeCategorySlug): string {
  for (const e of Object.values(MAP)) if (e.canonicalSlug === slug) return e.brandIdentityMark;
  return '';
}

export function allInScopeSlugs(): readonly InScopeCategorySlug[] {
  return IN_SCOPE_CATEGORY_SLUGS;
}
