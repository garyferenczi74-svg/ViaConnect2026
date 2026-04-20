// Prompt #98 Phase 7: Governed-params loader tests.
//
// The DB-facing loader is tested indirectly via a minimal stub; the
// real value here is the defaulting behavior (spec values when the
// DB row is absent) and the shape of the returned config.

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_REFERRAL_PARAMETERS,
  coerceReferralParameters,
  type ReferralParametersRow,
} from '@/lib/practitioner-referral/governed-params';
import {
  MILESTONE_REWARD_DEFAULTS_CENTS,
  ATTRIBUTION_WINDOW_DAYS_DEFAULT,
  FRAUD_HOLD_DAYS_DEFAULT,
  CREDIT_EXPIRATION_MONTHS_DEFAULT,
  TIER_THRESHOLDS_DEFAULT,
  TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT,
  REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT,
  REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT,
  HIGH_VELOCITY_THRESHOLD_PER_30_DAYS_DEFAULT,
} from '@/lib/practitioner-referral/schema-types';

describe('DEFAULT_REFERRAL_PARAMETERS', () => {
  it('exposes every governed parameter at the spec default', () => {
    expect(DEFAULT_REFERRAL_PARAMETERS.milestone_rewards_cents.activation_and_first_purchase)
      .toBe(MILESTONE_REWARD_DEFAULTS_CENTS.activation_and_first_purchase);
    expect(DEFAULT_REFERRAL_PARAMETERS.milestone_rewards_cents.master_certification_complete)
      .toBe(MILESTONE_REWARD_DEFAULTS_CENTS.master_certification_complete);
    expect(DEFAULT_REFERRAL_PARAMETERS.milestone_rewards_cents.level_3_white_label_first_delivery)
      .toBe(MILESTONE_REWARD_DEFAULTS_CENTS.level_3_white_label_first_delivery);
    expect(DEFAULT_REFERRAL_PARAMETERS.milestone_rewards_cents.level_4_first_formulation_approved)
      .toBe(MILESTONE_REWARD_DEFAULTS_CENTS.level_4_first_formulation_approved);

    expect(DEFAULT_REFERRAL_PARAMETERS.subscription_discount_percent).toBe(REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT);
    expect(DEFAULT_REFERRAL_PARAMETERS.cert_discount_percent).toBe(REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT);
    expect(DEFAULT_REFERRAL_PARAMETERS.attribution_window_days).toBe(ATTRIBUTION_WINDOW_DAYS_DEFAULT);
    expect(DEFAULT_REFERRAL_PARAMETERS.fraud_hold_days).toBe(FRAUD_HOLD_DAYS_DEFAULT);
    expect(DEFAULT_REFERRAL_PARAMETERS.credit_expiration_months).toBe(CREDIT_EXPIRATION_MONTHS_DEFAULT);
    expect(DEFAULT_REFERRAL_PARAMETERS.tier_thresholds).toEqual(TIER_THRESHOLDS_DEFAULT);
    expect(DEFAULT_REFERRAL_PARAMETERS.tax_form_1099_threshold_cents).toBe(TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT);
    expect(DEFAULT_REFERRAL_PARAMETERS.high_velocity_threshold_per_30_days).toBe(HIGH_VELOCITY_THRESHOLD_PER_30_DAYS_DEFAULT);
  });
});

describe('coerceReferralParameters', () => {
  it('returns spec defaults when row is null', () => {
    const p = coerceReferralParameters(null);
    expect(p).toEqual(DEFAULT_REFERRAL_PARAMETERS);
  });

  it('maps a full DB row into the typed params shape', () => {
    const row: ReferralParametersRow = {
      milestone_1_reward_cents: 25_000,
      milestone_2_reward_cents: 60_000,
      milestone_3_reward_cents: 120_000,
      milestone_4_reward_cents: 240_000,
      subscription_discount_percent: 20,
      cert_discount_percent: 10,
      attribution_window_days: 120,
      fraud_hold_days: 21,
      credit_expiration_months: 18,
      bronze_threshold: 3,
      silver_threshold: 8,
      gold_threshold: 20,
      tax_form_1099_threshold_cents: 50_000,
      high_velocity_threshold_per_30d: 7,
    };
    const p = coerceReferralParameters(row);
    expect(p.milestone_rewards_cents.activation_and_first_purchase).toBe(25_000);
    expect(p.milestone_rewards_cents.master_certification_complete).toBe(60_000);
    expect(p.milestone_rewards_cents.level_3_white_label_first_delivery).toBe(120_000);
    expect(p.milestone_rewards_cents.level_4_first_formulation_approved).toBe(240_000);
    expect(p.subscription_discount_percent).toBe(20);
    expect(p.cert_discount_percent).toBe(10);
    expect(p.attribution_window_days).toBe(120);
    expect(p.fraud_hold_days).toBe(21);
    expect(p.credit_expiration_months).toBe(18);
    expect(p.tier_thresholds).toEqual({ bronze: 3, silver: 8, gold: 20 });
    expect(p.tax_form_1099_threshold_cents).toBe(50_000);
    expect(p.high_velocity_threshold_per_30_days).toBe(7);
  });

  it('falls back field-by-field on undefined keys (partial rows)', () => {
    const row = {
      subscription_discount_percent: 25,
      // all other fields missing
    } as unknown as ReferralParametersRow;
    const p = coerceReferralParameters(row);
    expect(p.subscription_discount_percent).toBe(25);
    expect(p.cert_discount_percent).toBe(REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT);
    expect(p.milestone_rewards_cents.activation_and_first_purchase)
      .toBe(MILESTONE_REWARD_DEFAULTS_CENTS.activation_and_first_purchase);
  });
});
