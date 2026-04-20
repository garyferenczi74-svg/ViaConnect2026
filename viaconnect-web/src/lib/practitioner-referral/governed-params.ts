// Prompt #98 Phase 7: Governance-controlled parameter loader.
//
// The pure cores from Phases 1-6 accept optional overrides for every
// spec default. This loader reads the practitioner_referral_parameters
// singleton row and returns them in the shape downstream code expects,
// falling back to the spec defaults when the row is absent or a
// column is null.

import type { SupabaseClient } from '@supabase/supabase-js';
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
  type MilestoneId,
} from './schema-types';

export interface ReferralParameters {
  milestone_rewards_cents: Record<MilestoneId, number>;
  subscription_discount_percent: number;
  cert_discount_percent: number;
  attribution_window_days: number;
  fraud_hold_days: number;
  credit_expiration_months: number;
  tier_thresholds: { bronze: number; silver: number; gold: number };
  tax_form_1099_threshold_cents: number;
  high_velocity_threshold_per_30_days: number;
}

export const DEFAULT_REFERRAL_PARAMETERS: ReferralParameters = {
  milestone_rewards_cents: { ...MILESTONE_REWARD_DEFAULTS_CENTS },
  subscription_discount_percent: REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT,
  cert_discount_percent: REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT,
  attribution_window_days: ATTRIBUTION_WINDOW_DAYS_DEFAULT,
  fraud_hold_days: FRAUD_HOLD_DAYS_DEFAULT,
  credit_expiration_months: CREDIT_EXPIRATION_MONTHS_DEFAULT,
  tier_thresholds: { ...TIER_THRESHOLDS_DEFAULT },
  tax_form_1099_threshold_cents: TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT,
  high_velocity_threshold_per_30_days: HIGH_VELOCITY_THRESHOLD_PER_30_DAYS_DEFAULT,
};

export interface ReferralParametersRow {
  milestone_1_reward_cents?: number;
  milestone_2_reward_cents?: number;
  milestone_3_reward_cents?: number;
  milestone_4_reward_cents?: number;
  subscription_discount_percent?: number;
  cert_discount_percent?: number;
  attribution_window_days?: number;
  fraud_hold_days?: number;
  credit_expiration_months?: number;
  bronze_threshold?: number;
  silver_threshold?: number;
  gold_threshold?: number;
  tax_form_1099_threshold_cents?: number;
  high_velocity_threshold_per_30d?: number;
}

function pick<T>(v: T | undefined | null, fallback: T): T {
  return v === undefined || v === null ? fallback : v;
}

export function coerceReferralParameters(row: ReferralParametersRow | null): ReferralParameters {
  if (!row) return DEFAULT_REFERRAL_PARAMETERS;
  const d = DEFAULT_REFERRAL_PARAMETERS;
  return {
    milestone_rewards_cents: {
      activation_and_first_purchase:        pick(row.milestone_1_reward_cents, d.milestone_rewards_cents.activation_and_first_purchase),
      master_certification_complete:        pick(row.milestone_2_reward_cents, d.milestone_rewards_cents.master_certification_complete),
      level_3_white_label_first_delivery:   pick(row.milestone_3_reward_cents, d.milestone_rewards_cents.level_3_white_label_first_delivery),
      level_4_first_formulation_approved:   pick(row.milestone_4_reward_cents, d.milestone_rewards_cents.level_4_first_formulation_approved),
    },
    subscription_discount_percent:           pick(row.subscription_discount_percent, d.subscription_discount_percent),
    cert_discount_percent:                   pick(row.cert_discount_percent, d.cert_discount_percent),
    attribution_window_days:                 pick(row.attribution_window_days, d.attribution_window_days),
    fraud_hold_days:                         pick(row.fraud_hold_days, d.fraud_hold_days),
    credit_expiration_months:                pick(row.credit_expiration_months, d.credit_expiration_months),
    tier_thresholds: {
      bronze: pick(row.bronze_threshold, d.tier_thresholds.bronze),
      silver: pick(row.silver_threshold, d.tier_thresholds.silver),
      gold:   pick(row.gold_threshold,   d.tier_thresholds.gold),
    },
    tax_form_1099_threshold_cents:           pick(row.tax_form_1099_threshold_cents, d.tax_form_1099_threshold_cents),
    high_velocity_threshold_per_30_days:     pick(row.high_velocity_threshold_per_30d, d.high_velocity_threshold_per_30_days),
  };
}

/**
 * Loads the governance-controlled referral parameters from the
 * singleton table; falls back to spec defaults when the table / row
 * is missing (pre-Phase-7 environments).
 */
export async function loadGovernedReferralParameters(
  supabase: SupabaseClient | unknown,
): Promise<ReferralParameters> {
  const sb = supabase as any;
  try {
    const { data, error } = await sb
      .from('practitioner_referral_parameters')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data) return DEFAULT_REFERRAL_PARAMETERS;
    return coerceReferralParameters(data as ReferralParametersRow);
  } catch {
    return DEFAULT_REFERRAL_PARAMETERS;
  }
}
