// Prompt #96 Phase 1: White-label schema-types.
//
// Pure TypeScript companion to the SQL data model. Exports the enum
// values that mirror DB CHECK constraints + the small predicate helpers
// (discount tier classifier, hex color validator, manufacturer-line
// integrity check) that downstream phases (eligibility engine, pricing
// calculator, compliance checklist, label designer) reuse.
//
// Numeric constants here are the spec defaults. Phase 7 wires them to
// the white_label_parameters table so governance-approved changes take
// effect at runtime, but Phase 1 hard-codes them so the data layer can
// be tested without governance dependencies.

// ---------------------------------------------------------------------------
// Enums (must match SQL CHECK constraints exactly)
// ---------------------------------------------------------------------------

export const ENROLLMENT_STATUSES = [
  'pending_eligibility',
  'eligibility_verified',
  'brand_setup',
  'first_production_order',
  'active',
  'paused',
  'terminated',
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const QUALIFYING_PATHS = [
  'certification_level_3',
  'white_label_tier_subscription',
  'volume_threshold',
] as const;
export type QualifyingPath = (typeof QUALIFYING_PATHS)[number];

export const LABEL_DESIGN_STATUSES = [
  'draft',
  'ready_for_review',
  'under_compliance_review',
  'revision_requested',
  'approved',
  'production_ready',
  'archived',
] as const;
export type LabelDesignStatus = (typeof LABEL_DESIGN_STATUSES)[number];

export const PRODUCTION_ORDER_STATUSES = [
  'quote',
  'labels_pending_review',
  'labels_approved_pending_deposit',
  'deposit_paid',
  'in_production',
  'quality_control',
  'final_payment_pending',
  'shipped',
  'delivered',
  'canceled',
] as const;
export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number];

export const COMPLIANCE_REVIEW_DECISIONS = [
  'approved',
  'revision_requested',
  'rejected',
] as const;
export type ComplianceReviewDecision = (typeof COMPLIANCE_REVIEW_DECISIONS)[number];

export const REVIEW_TYPES = [
  'automated_checklist',
  'compliance_review',
  'medical_claims_review',
] as const;
export type ReviewType = (typeof REVIEW_TYPES)[number];

export const REVIEWER_ROLES = [
  'automated',
  'compliance_officer',
  'medical_director',
] as const;
export type ReviewerRole = (typeof REVIEWER_ROLES)[number];

export const LAYOUT_TEMPLATES = [
  'classic_vertical',
  'modern_horizontal',
  'premium_wrap',
  'clinical_minimal',
] as const;
export type LayoutTemplate = (typeof LAYOUT_TEMPLATES)[number];

export const PRODUCT_NAMING_SCHEMES = [
  'viacura_name',
  'practice_prefix_plus_viacura',
  'fully_custom',
] as const;
export type ProductNamingScheme = (typeof PRODUCT_NAMING_SCHEMES)[number];

export const STORAGE_LOCATIONS = [
  'viacura_warehouse',
  'practitioner_facility',
] as const;
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export const INVENTORY_STATUSES = [
  'active',
  'depleted',
  'expired',
  'recalled',
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const RECALL_CLASSES = [
  'class_i',
  'class_ii',
  'class_iii',
] as const;
export type RecallClass = (typeof RECALL_CLASSES)[number];

export const RECALL_SCOPES = [
  'single_lot',
  'all_lots_single_sku',
  'multiple_skus_formulation',
  'all_white_label',
] as const;
export type RecallScope = (typeof RECALL_SCOPES)[number];

// ---------------------------------------------------------------------------
// Discount tier classifier
// ---------------------------------------------------------------------------

export const DISCOUNT_TIER_IDS = [
  'tier_100_499',
  'tier_500_999',
  'tier_1000_plus',
] as const;
export type DiscountTierId = (typeof DISCOUNT_TIER_IDS)[number];

export interface DiscountTier {
  tier: DiscountTierId;
  percent: number;
  minUnits: number;
  maxUnits: number | null;
}

const TIERS: DiscountTier[] = [
  { tier: 'tier_100_499',   percent: 60, minUnits: 100,  maxUnits: 499 },
  { tier: 'tier_500_999',   percent: 65, minUnits: 500,  maxUnits: 999 },
  { tier: 'tier_1000_plus', percent: 70, minUnits: 1000, maxUnits: null },
];

/**
 * Picks the discount tier for a TOTAL unit count across all SKUs in a
 * single production order. Returns null when below the 100-unit MOQ.
 */
export function classifyDiscountTier(totalUnits: number): { tier: DiscountTierId; percent: number } | null {
  if (!Number.isFinite(totalUnits) || totalUnits < MOQ_PER_SKU) return null;
  for (const t of TIERS) {
    if (totalUnits >= t.minUnits && (t.maxUnits === null || totalUnits <= t.maxUnits)) {
      return { tier: t.tier, percent: t.percent };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Matches the SQL CHECK constraint exactly (#RRGGBB only, no shorthand). */
export function isValidHexColor(value: string | null | undefined): boolean {
  if (!value) return false;
  return HEX_RE.test(value);
}

export const CANONICAL_MANUFACTURER_LINE = 'Manufactured by FarmCeutica Wellness LLC, Buffalo NY';

/** FDA-required text. Any drift triggers compliance rejection. */
export function isManufacturerLineUnchanged(line: string | null | undefined): boolean {
  return line === CANONICAL_MANUFACTURER_LINE;
}

// ---------------------------------------------------------------------------
// Spec defaults (Phase 7 may move these into white_label_parameters)
// ---------------------------------------------------------------------------

export const MOQ_PER_SKU = 100;
export const MIN_ORDER_VALUE_CENTS = 1_500_000;       // $15,000
export const EXPEDITED_SURCHARGE_PERCENT = 15;
export const STANDARD_PRODUCTION_WEEKS = 8;
export const EXPEDITED_PRODUCTION_WEEKS = 6;
export const FREE_STORAGE_DAYS = 60;
export const STORAGE_FEE_CENTS_PER_UNIT_DAY = 2;      // $0.02
