// Prompt #113 — Scope guard constants consumed by Gate 4 static analysis.

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
  "notifications",
  "notification_event_registry",
  "notification_preferences",
  "notification_channel_credentials",
  "notifications_dispatched",
  "notification_sms_opt_in_log",
  "notification_phi_redaction_failures",
  "ingredients",
];

export const FORBIDDEN_TABLE_PREFIXES: readonly string[] = ["helix_", "peptide_"];

export const PROTECTED_PATHS: readonly string[] = [
  "supabase/config.toml",
  "supabase/templates/",
  "package.json",
  "package-lock.json",
];

// Forbidden claim verbs in ANY published surface. Kelsey may CONDITIONAL
// a claim that contains these, but an APPROVED verdict with any of these
// in the rendered body is an invariant violation.
export const FORBIDDEN_CLAIM_VERBS: readonly string[] = [
  "treat", "cure", "prevent", "mitigate", "diagnose",
  "reverse", "eliminate", "eradicate",
];

// Must never be mentioned in code paths that render to practitioner or consumer.
// Semaglutide is explicitly verboten per standing rule §1.
export const FORBIDDEN_INGREDIENT_MENTIONS: readonly string[] = [
  "semaglutide",
];

export const SAFE_DETECTOR_EXPORT = "detectDiseaseClaim";
export const SAFE_KELSEY_REVIEW_EXPORT = "kelseyReview";
export const SAFE_AUDIT_WRITER_EXPORT = "recordRegulatoryAudit";

// Retatrutide: injectable-only, never stacked, never consumer-surfaced.
export const RETATRUTIDE_INVARIANTS = {
  sku_id: "retatrutide",
  expected_compliance_class: "not_approved",
  expected_injectable_only: true,
  expected_can_make_sf_claims: false,
};
