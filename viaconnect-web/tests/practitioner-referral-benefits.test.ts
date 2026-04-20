// Prompt #98 Phase 3: Pure benefit-redemption tests.

import { describe, it, expect } from 'vitest';
import {
  computeReferredSubscriptionDiscount,
  computeReferredCertDiscount,
  isSubscriptionTierEligible,
  isCertificationLevelEligible,
  ELIGIBLE_SUBSCRIPTION_TIERS,
  ELIGIBLE_CERT_LEVEL_ID,
} from '@/lib/practitioner-referral/benefit-redemption';
import {
  REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT,
  REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT,
} from '@/lib/practitioner-referral/schema-types';

describe('Eligibility tuples', () => {
  it('exposes the two eligible subscription tiers', () => {
    expect(new Set(ELIGIBLE_SUBSCRIPTION_TIERS)).toEqual(new Set([
      'standard_portal', 'white_label_platform',
    ]));
  });

  it('exposes the eligible cert level (Level 2 Precision Protocol)', () => {
    expect(ELIGIBLE_CERT_LEVEL_ID).toBe('precision_protocol');
  });
});

describe('isSubscriptionTierEligible', () => {
  it('accepts the two whitelisted tiers', () => {
    expect(isSubscriptionTierEligible('standard_portal')).toBe(true);
    expect(isSubscriptionTierEligible('white_label_platform')).toBe(true);
  });
  it('rejects free tier and Level-specific fees', () => {
    expect(isSubscriptionTierEligible('free')).toBe(false);
    expect(isSubscriptionTierEligible('master_practitioner')).toBe(false);
    expect(isSubscriptionTierEligible('')).toBe(false);
  });
});

describe('isCertificationLevelEligible', () => {
  it('accepts only precision_protocol', () => {
    expect(isCertificationLevelEligible('precision_protocol')).toBe(true);
  });
  it('rejects other certification levels', () => {
    expect(isCertificationLevelEligible('foundation')).toBe(false);
    expect(isCertificationLevelEligible('master_practitioner')).toBe(false);
  });
});

describe('computeReferredSubscriptionDiscount', () => {
  it('applies 15% to a Standard Portal monthly price', () => {
    // $128.88 = 12888 cents; 15% off = 1933 cents (rounded)
    const r = computeReferredSubscriptionDiscount({
      tier_id: 'standard_portal',
      monthly_price_cents: 12_888,
      already_redeemed: false,
      attribution_active: true,
    });
    expect(r.eligible).toBe(true);
    expect(r.discount_cents).toBe(Math.round(12_888 * 0.15));
    expect(r.discounted_price_cents).toBe(12_888 - r.discount_cents);
  });

  it('applies to White-Label Platform tier as well', () => {
    const r = computeReferredSubscriptionDiscount({
      tier_id: 'white_label_platform',
      monthly_price_cents: 28_888,
      already_redeemed: false,
      attribution_active: true,
    });
    expect(r.eligible).toBe(true);
    expect(r.discount_cents).toBe(Math.round(28_888 * 0.15));
  });

  it('returns ineligible for Free tier', () => {
    const r = computeReferredSubscriptionDiscount({
      tier_id: 'free',
      monthly_price_cents: 0,
      already_redeemed: false,
      attribution_active: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/tier/i);
    expect(r.discount_cents).toBe(0);
    expect(r.discounted_price_cents).toBe(0);
  });

  it('returns ineligible when already redeemed', () => {
    const r = computeReferredSubscriptionDiscount({
      tier_id: 'standard_portal',
      monthly_price_cents: 12_888,
      already_redeemed: true,
      attribution_active: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/already redeemed/i);
  });

  it('returns ineligible when attribution is not active', () => {
    const r = computeReferredSubscriptionDiscount({
      tier_id: 'standard_portal',
      monthly_price_cents: 12_888,
      already_redeemed: false,
      attribution_active: false,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/no active attribution/i);
  });

  it('honors a custom discount percent override', () => {
    const r = computeReferredSubscriptionDiscount({
      tier_id: 'standard_portal',
      monthly_price_cents: 10_000,
      already_redeemed: false,
      attribution_active: true,
      discount_percent: 20,
    });
    expect(r.discount_cents).toBe(2_000);
    expect(r.discounted_price_cents).toBe(8_000);
  });

  it('default percent is the spec value (15)', () => {
    expect(REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT).toBe(15);
  });

  it('handles zero price defensively', () => {
    const r = computeReferredSubscriptionDiscount({
      tier_id: 'standard_portal',
      monthly_price_cents: 0,
      already_redeemed: false,
      attribution_active: true,
    });
    expect(r.eligible).toBe(true);
    expect(r.discount_cents).toBe(0);
    expect(r.discounted_price_cents).toBe(0);
  });
});

describe('computeReferredCertDiscount', () => {
  it('applies 15% to Level 2 Precision Protocol fee', () => {
    // $888 = 88800 cents; 15% off = 13320 cents
    const r = computeReferredCertDiscount({
      certification_level_id: 'precision_protocol',
      base_fee_cents: 88_800,
      already_redeemed: false,
      attribution_active: true,
    });
    expect(r.eligible).toBe(true);
    expect(r.discount_cents).toBe(13_320);
    expect(r.discounted_fee_cents).toBe(75_480);
  });

  it('returns ineligible for non-Level-2 certifications', () => {
    const r = computeReferredCertDiscount({
      certification_level_id: 'master_practitioner',
      base_fee_cents: 188_800,
      already_redeemed: false,
      attribution_active: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/level 2|certification/i);
  });

  it('returns ineligible when already redeemed', () => {
    const r = computeReferredCertDiscount({
      certification_level_id: 'precision_protocol',
      base_fee_cents: 88_800,
      already_redeemed: true,
      attribution_active: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/already redeemed/i);
  });

  it('returns ineligible when attribution is not active', () => {
    const r = computeReferredCertDiscount({
      certification_level_id: 'precision_protocol',
      base_fee_cents: 88_800,
      already_redeemed: false,
      attribution_active: false,
    });
    expect(r.eligible).toBe(false);
  });

  it('default percent is the spec value (15)', () => {
    expect(REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT).toBe(15);
  });
});
