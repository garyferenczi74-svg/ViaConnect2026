// Prompt #106 §3.2 + §3.7 — scope-guard helpers.
//
// These pure functions are the runtime half of the scope-isolation
// contract. The static-analysis half lives in test files that grep the
// codebase for forbidden token references (see tests/shop-refresh-
// scope-isolation.test.ts). Every library and edge function that touches
// storage or catalog rows calls the relevant guard first.

import { CANONICAL_BUCKET } from '../types';

/** Forbidden tables — writes here abort the calling function. */
export const FORBIDDEN_WRITE_TABLES = new Set<string>([
  'genex360_products',
  'peptide_registry',
  'peptide_delivery_options',
  'peptide_rules',
  'master_skus',
  'pricing_tiers',
]);

/** Forbidden table prefixes — any table starting with these is off-limits. */
export const FORBIDDEN_TABLE_PREFIXES = ['peptide_', 'user_peptide_', 'helix_'] as const;

export function assertTableIsWritable(tableName: string): void {
  if (FORBIDDEN_WRITE_TABLES.has(tableName)) {
    throw new Error(
      `SCOPE_BREACH: refuse to write to "${tableName}" — out-of-scope for Prompt #106`,
    );
  }
  for (const prefix of FORBIDDEN_TABLE_PREFIXES) {
    if (tableName.startsWith(prefix)) {
      throw new Error(
        `SCOPE_BREACH: refuse to write to "${tableName}" — prefix "${prefix}" is out-of-scope for Prompt #106`,
      );
    }
  }
}

export function assertBucketIsCanonical(bucketName: string): void {
  if (bucketName !== CANONICAL_BUCKET) {
    throw new Error(
      `SCOPE_BREACH: refuse to upload to "${bucketName}" — only "${CANONICAL_BUCKET}" is permitted by Prompt #106`,
    );
  }
}

/**
 * Guard invoked before any retirement flag flips a product_catalog row.
 * Refuses to retire SKUs that belong to GeneX360 or the peptide catalog —
 * those are expected to have no master_skus backing and must NOT be
 * retired via the supplement-refresh flow.
 */
export function assertCanRetireCatalogSku(args: {
  sku: string;
  genex360Skus: ReadonlySet<string>;
  peptideSkus: ReadonlySet<string>;
  catalogCategory: string;
}): void {
  if (args.genex360Skus.has(args.sku)) {
    throw new Error(`SCOPE_BREACH: sku "${args.sku}" is a GeneX360 product; retire via the GeneX360 flow`);
  }
  if (args.peptideSkus.has(args.sku)) {
    throw new Error(`SCOPE_BREACH: sku "${args.sku}" is in peptide_registry; retire via the peptide flow`);
  }
  const k = args.catalogCategory.trim().toUpperCase();
  if (k === 'TESTING' || k === 'GENETIC' || k === 'TEST_KIT' || k === 'TEST KIT') {
    throw new Error(
      `SCOPE_BREACH: catalog row category "${args.catalogCategory}" indicates out-of-scope (GeneX360 testing); retire via the GeneX360 flow`,
    );
  }
}
