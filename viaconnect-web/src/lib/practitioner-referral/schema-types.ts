// Prompt #98 Phase 1: Practitioner referral schema-types.
//
// Pure TypeScript companion to the SQL data model. Exports the enum
// values that mirror DB CHECK constraints + the small predicate +
// formatter helpers (referral code generation, name + address +
// phone normalization, Levenshtein distance) that downstream phases
// (code generator, attribution resolver, fraud detection) reuse.
//
// Numeric constants here are the spec defaults. Phase 7 wires them
// to the practitioner_referral_parameters table so governance-
// approved changes take effect at runtime; Phase 1 hard-codes them
// so the data layer can be tested without governance dependencies.

// ---------------------------------------------------------------------------
// Enums (must match SQL CHECK constraints exactly)
// ---------------------------------------------------------------------------

export const ATTRIBUTION_STATUSES = [
  'pending_verification',
  'verified_active',
  'blocked_self_referral',
  'blocked_fraud_suspected',
  'voided',
] as const;
export type AttributionStatus = (typeof ATTRIBUTION_STATUSES)[number];

export const VESTING_STATUSES = [
  'pending_hold',
  'vested',
  'voided_fraud',
  'voided_admin',
] as const;
export type VestingStatus = (typeof VESTING_STATUSES)[number];

export const CREDIT_LEDGER_ENTRY_TYPES = [
  'earned_from_milestone',
  'applied_to_subscription',
  'applied_to_wholesale_order',
  'applied_to_certification_fee',
  'applied_to_level_3_fee',
  'applied_to_level_4_fee',
  'expired',
  'voided_fraud',
  'voided_admin',
  'admin_adjustment',
] as const;
export type CreditLedgerEntryType = (typeof CREDIT_LEDGER_ENTRY_TYPES)[number];

export const FRAUD_FLAG_TYPES = [
  'self_referral_name_match',
  'self_referral_address_match',
  'self_referral_phone_match',
  'self_referral_payment_match',
  'high_velocity_signups',
  'cluster_pattern',
  'ip_overlap',
  'referred_practitioner_terminated_quickly',
  'admin_manual_flag',
] as const;
export type FraudFlagType = (typeof FRAUD_FLAG_TYPES)[number];

export const FRAUD_FLAG_SEVERITIES = ['low', 'medium', 'high', 'blocking'] as const;
export type FraudFlagSeverity = (typeof FRAUD_FLAG_SEVERITIES)[number];

export const FRAUD_FLAG_STATUSES = [
  'pending_review', 'confirmed_fraud', 'cleared_benign', 'admin_override',
] as const;
export type FraudFlagStatus = (typeof FRAUD_FLAG_STATUSES)[number];

export const STATUS_TIERS = [
  'none', 'bronze_referrer', 'silver_referrer', 'gold_referrer',
] as const;
export type StatusTier = (typeof STATUS_TIERS)[number];

export const MILESTONE_IDS = [
  'activation_and_first_purchase',
  'master_certification_complete',
  'level_3_white_label_first_delivery',
  'level_4_first_formulation_approved',
] as const;
export type MilestoneId = (typeof MILESTONE_IDS)[number];

// ---------------------------------------------------------------------------
// Spec defaults (Phase 7 may move these into practitioner_referral_parameters)
// ---------------------------------------------------------------------------

export const MILESTONE_REWARD_DEFAULTS_CENTS: Record<MilestoneId, number> = {
  activation_and_first_purchase:        20_000,    // $200
  master_certification_complete:        50_000,    // $500
  level_3_white_label_first_delivery:   100_000,   // $1,000
  level_4_first_formulation_approved:   200_000,   // $2,000
};

export const ATTRIBUTION_WINDOW_DAYS_DEFAULT = 90;
export const FRAUD_HOLD_DAYS_DEFAULT = 30;
export const CREDIT_EXPIRATION_MONTHS_DEFAULT = 24;
export const TIER_THRESHOLDS_DEFAULT = { bronze: 5, silver: 10, gold: 25 };
export const TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT = 60_000;     // $600
export const REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT = 15;
export const REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT = 15;

// Fraud detection threshold for the high-velocity pattern.
export const HIGH_VELOCITY_THRESHOLD_PER_30_DAYS_DEFAULT = 5;

// ---------------------------------------------------------------------------
// Code generation helpers
// ---------------------------------------------------------------------------

export function sanitizePracticeName(name: string): string {
  return (name ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);
}

// Confusable characters (I, O, 0, 1) excluded so codes stay legible
// when shared verbally or printed at small sizes.
const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRandomSuffix(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return result;
}

export function buildReferralCode(practiceName: string, randomSuffix: string): string {
  return `PRAC-${sanitizePracticeName(practiceName)}-${randomSuffix}`;
}

/**
 * URL-safe lowercase form of a referral code. Replaces every run of
 * non [a-z0-9-] with a single dash.
 */
export function toCodeSlug(code: string): string {
  return code
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Self-referral signal helpers (used by Phase 2 attribution resolver)
// ---------------------------------------------------------------------------

// Legal entity suffixes (lower case). After a dot-stripping pass, both
// dotted ("p.c.") and undotted ("pc") forms collapse to the same token
// so a single \b...\b regex catches them all.
const LEGAL_SUFFIX_RE = /\b(llc|inc|corp|pllc|pc|pa|md|dds|dc|nd|np|lac)\b/g;

export function normalizePracticeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\./g, '')                     // p.c. -> pc; m.d. -> md
    .replace(LEGAL_SUFFIX_RE, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AddressParts {
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
}

export function normalizeAddressParts(parts: AddressParts): string {
  const joined = [parts.street, parts.city, parts.state, parts.postal_code]
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ');
  return joined
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

// ---------------------------------------------------------------------------
// Levenshtein distance + similarity ratio
// ---------------------------------------------------------------------------

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Two-row DP for memory efficiency.
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Similarity ratio in [0, 1]. 1 = identical; 0 = completely different.
 * Both empty strings count as identical.
 */
export function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}
