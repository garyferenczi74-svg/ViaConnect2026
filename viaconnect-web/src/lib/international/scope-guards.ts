// Prompt #111 — Scope guards used by Gate 4 static analysis.
// This module exports the canonical names + regex patterns that tests assert
// against. Keep these hand-in-hand with the test suite.

/**
 * Files that are forbidden from ALTER TABLE on existing schema per §3.2.
 * Migrations added by Prompt #111 are append-only new tables.
 */
export const FORBIDDEN_ALTER_TARGETS: readonly string[] = [
  "master_skus",
  "pricing_tiers",
  "product_catalog",
  "products",
  "orders",
  "order_items",
  "shop_orders",
  "shop_order_items",
  "genex360_products",
  "genex360_purchases",
  "kit_registrations",
  "genetic_profiles",
  "peptide_registry",
  "peptide_delivery_options",
  "peptide_rules",
  "user_peptide_prescriptions",
];

/**
 * Schema prefixes this prompt MUST NOT read or write (Helix isolation §3.1).
 */
export const FORBIDDEN_TABLE_PREFIXES: readonly string[] = ["helix_"];

/**
 * Files that must not be modified under any circumstance for Prompt #111.
 */
export const PROTECTED_PATHS: readonly string[] = [
  "supabase/config.toml",
  "supabase/templates/",
  "package.json",
  "package-lock.json",
];

/**
 * Canonical name of the currency-conversion helper. Static analysis can grep
 * for SUM(*_cents) patterns that don't route through this symbol when the
 * surrounding query spans >1 currency.
 */
export const SAFE_SUM_HELPERS: readonly string[] = [
  "sumByCurrency",
  "sumToUsdCents",
  "convertToUsdCents",
];

/**
 * PayPal hard-gate: non-US markets MUST NOT route checkout through PayPal
 * at this iteration (§3.2, §7.5). The marker below is grep'd by tests.
 */
export const PAYPAL_NON_US_GUARD_MARKER = "PROMPT_111_PAYPAL_US_ONLY";
