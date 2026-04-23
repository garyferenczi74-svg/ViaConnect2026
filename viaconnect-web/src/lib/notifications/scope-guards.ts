// Prompt #112 — Scope guard constants consumed by Gate 4 static analysis.

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
  "notifications", // the existing bell-icon table — not touched
];

export const FORBIDDEN_TABLE_PREFIXES: readonly string[] = ["helix_", "peptide_"];

export const PROTECTED_PATHS: readonly string[] = [
  "supabase/config.toml",
  "supabase/templates/",
  "package.json",
  "package-lock.json",
];

export const SAFE_PHI_VALIDATOR_EXPORT = "validateExternalBody";
export const SAFE_EMIT_EXPORT = "emitPractitionerNotificationEvent";

// Marker scanned by the scope-guard test to confirm no direct Twilio / Slack
// / push API call lives outside an approved adapter.
export const APPROVED_CHANNEL_ADAPTERS: readonly string[] = [
  "src/lib/notifications/adapters/sms.ts",
  "src/lib/notifications/adapters/slack.ts",
  "src/lib/notifications/adapters/push.ts",
  "src/lib/notifications/adapters/fcm.ts",
  "src/lib/notifications/adapters/apns.ts",
];

/** External body content MUST pass these static checks at rendering time. */
export const REQUIRED_PHI_CHECK_NAMES: readonly string[] = [
  "unrendered_template_variable",
  "email_address",
  "phone_number",
  "dob_like_date",
  "icd10_code",
  "lab_value",
  "rsid",
  "zygosity",
  "medication_name",
  "gene_symbol",
];
