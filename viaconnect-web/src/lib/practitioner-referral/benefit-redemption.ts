// Prompt #98 Phase 3: Pure benefit-redemption logic.
//
// Two pure functions: subscription discount + certification discount.
// Both take pre-fetched signals (tier id, price, already_redeemed
// flag, attribution_active flag) and return a discount-amount +
// eligibility result. The DB wrappers (Phase 3 API routes) load the
// signals, call these, and persist the redemption flags.
//
// Per spec (locked at Phase 1 schema-types):
//   - Subscription discount: 15% on first month, eligible for
//     Standard Portal + White-Label Platform tiers only.
//   - Certification discount: 15% on Level 2 Precision Protocol only.

import {
  REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT,
  REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT,
} from './schema-types';

export const ELIGIBLE_SUBSCRIPTION_TIERS = ['standard_portal', 'white_label_platform'] as const;
export type EligibleSubscriptionTier = (typeof ELIGIBLE_SUBSCRIPTION_TIERS)[number];

export const ELIGIBLE_CERT_LEVEL_ID = 'precision_protocol' as const;

export function isSubscriptionTierEligible(tierId: string): boolean {
  return (ELIGIBLE_SUBSCRIPTION_TIERS as readonly string[]).includes(tierId);
}

export function isCertificationLevelEligible(levelId: string): boolean {
  return levelId === ELIGIBLE_CERT_LEVEL_ID;
}

// ---------------------------------------------------------------------------
// Subscription discount
// ---------------------------------------------------------------------------

export interface SubscriptionDiscountInput {
  tier_id: string;
  monthly_price_cents: number;
  already_redeemed: boolean;
  attribution_active: boolean;
  /** Phase 7 wires this from practitioner_referral_parameters; default 15. */
  discount_percent?: number;
}

export interface SubscriptionDiscountResult {
  eligible: boolean;
  reason?: string;
  discount_cents: number;
  discounted_price_cents: number;
  applied_discount_percent: number;
}

export function computeReferredSubscriptionDiscount(
  input: SubscriptionDiscountInput,
): SubscriptionDiscountResult {
  const percent = input.discount_percent ?? REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT;

  if (!input.attribution_active) {
    return {
      eligible: false,
      reason: 'No active attribution; this practitioner is not in the referral program.',
      discount_cents: 0,
      discounted_price_cents: input.monthly_price_cents,
      applied_discount_percent: percent,
    };
  }

  if (!isSubscriptionTierEligible(input.tier_id)) {
    return {
      eligible: false,
      reason: 'Discount applies only to Standard Portal and White-Label Platform tiers.',
      discount_cents: 0,
      discounted_price_cents: input.monthly_price_cents,
      applied_discount_percent: percent,
    };
  }

  if (input.already_redeemed) {
    return {
      eligible: false,
      reason: 'First-month subscription discount already redeemed.',
      discount_cents: 0,
      discounted_price_cents: input.monthly_price_cents,
      applied_discount_percent: percent,
    };
  }

  const discount = Math.round(Math.max(0, input.monthly_price_cents) * percent / 100);
  return {
    eligible: true,
    discount_cents: discount,
    discounted_price_cents: input.monthly_price_cents - discount,
    applied_discount_percent: percent,
  };
}

// ---------------------------------------------------------------------------
// Certification discount
// ---------------------------------------------------------------------------

export interface CertDiscountInput {
  certification_level_id: string;
  base_fee_cents: number;
  already_redeemed: boolean;
  attribution_active: boolean;
  discount_percent?: number;
}

export interface CertDiscountResult {
  eligible: boolean;
  reason?: string;
  discount_cents: number;
  discounted_fee_cents: number;
  applied_discount_percent: number;
}

export function computeReferredCertDiscount(input: CertDiscountInput): CertDiscountResult {
  const percent = input.discount_percent ?? REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT;

  if (!input.attribution_active) {
    return {
      eligible: false,
      reason: 'No active attribution; this practitioner is not in the referral program.',
      discount_cents: 0,
      discounted_fee_cents: input.base_fee_cents,
      applied_discount_percent: percent,
    };
  }

  if (!isCertificationLevelEligible(input.certification_level_id)) {
    return {
      eligible: false,
      reason: 'Discount applies only to Level 2 Precision Protocol certification.',
      discount_cents: 0,
      discounted_fee_cents: input.base_fee_cents,
      applied_discount_percent: percent,
    };
  }

  if (input.already_redeemed) {
    return {
      eligible: false,
      reason: 'Certification discount already redeemed.',
      discount_cents: 0,
      discounted_fee_cents: input.base_fee_cents,
      applied_discount_percent: percent,
    };
  }

  const discount = Math.round(Math.max(0, input.base_fee_cents) * percent / 100);
  return {
    eligible: true,
    discount_cents: discount,
    discounted_fee_cents: input.base_fee_cents - discount,
    applied_discount_percent: percent,
  };
}
