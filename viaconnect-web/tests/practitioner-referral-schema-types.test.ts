// Prompt #98 Phase 1: Practitioner referral schema-types tests.

import { describe, it, expect } from 'vitest';
import {
  ATTRIBUTION_STATUSES,
  VESTING_STATUSES,
  CREDIT_LEDGER_ENTRY_TYPES,
  FRAUD_FLAG_TYPES,
  FRAUD_FLAG_SEVERITIES,
  FRAUD_FLAG_STATUSES,
  STATUS_TIERS,
  MILESTONE_IDS,
  MILESTONE_REWARD_DEFAULTS_CENTS,
  ATTRIBUTION_WINDOW_DAYS_DEFAULT,
  FRAUD_HOLD_DAYS_DEFAULT,
  CREDIT_EXPIRATION_MONTHS_DEFAULT,
  TIER_THRESHOLDS_DEFAULT,
  TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT,
  REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT,
  REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT,
  sanitizePracticeName,
  generateRandomSuffix,
  normalizePracticeName,
  normalizeAddressParts,
  normalizePhone,
  levenshteinDistance,
  levenshteinRatio,
  buildReferralCode,
  toCodeSlug,
} from '@/lib/practitioner-referral/schema-types';

describe('Status enums', () => {
  it('exposes the five attribution statuses', () => {
    expect(new Set(ATTRIBUTION_STATUSES)).toEqual(new Set([
      'pending_verification', 'verified_active',
      'blocked_self_referral', 'blocked_fraud_suspected', 'voided',
    ]));
  });

  it('exposes the four vesting statuses', () => {
    expect(new Set(VESTING_STATUSES)).toEqual(new Set([
      'pending_hold', 'vested', 'voided_fraud', 'voided_admin',
    ]));
  });

  it('exposes all credit ledger entry types', () => {
    expect(new Set(CREDIT_LEDGER_ENTRY_TYPES)).toEqual(new Set([
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
    ]));
  });

  it('exposes all nine fraud flag types', () => {
    expect(new Set(FRAUD_FLAG_TYPES)).toEqual(new Set([
      'self_referral_name_match',
      'self_referral_address_match',
      'self_referral_phone_match',
      'self_referral_payment_match',
      'high_velocity_signups',
      'cluster_pattern',
      'ip_overlap',
      'referred_practitioner_terminated_quickly',
      'admin_manual_flag',
    ]));
  });

  it('exposes the four fraud severities and four statuses', () => {
    expect(new Set(FRAUD_FLAG_SEVERITIES)).toEqual(new Set(['low', 'medium', 'high', 'blocking']));
    expect(new Set(FRAUD_FLAG_STATUSES)).toEqual(new Set([
      'pending_review', 'confirmed_fraud', 'cleared_benign', 'admin_override',
    ]));
  });

  it('exposes the four status tiers (private)', () => {
    expect(new Set(STATUS_TIERS)).toEqual(new Set([
      'none', 'bronze_referrer', 'silver_referrer', 'gold_referrer',
    ]));
  });

  it('exposes the four spec milestone ids in the spec order', () => {
    expect(MILESTONE_IDS).toEqual([
      'activation_and_first_purchase',
      'master_certification_complete',
      'level_3_white_label_first_delivery',
      'level_4_first_formulation_approved',
    ]);
  });
});

describe('Spec defaults', () => {
  it('milestone reward ladder $200 / $500 / $1,000 / $2,000', () => {
    expect(MILESTONE_REWARD_DEFAULTS_CENTS.activation_and_first_purchase).toBe(20_000);
    expect(MILESTONE_REWARD_DEFAULTS_CENTS.master_certification_complete).toBe(50_000);
    expect(MILESTONE_REWARD_DEFAULTS_CENTS.level_3_white_label_first_delivery).toBe(100_000);
    expect(MILESTONE_REWARD_DEFAULTS_CENTS.level_4_first_formulation_approved).toBe(200_000);
  });

  it('total possible per arc is $3,700', () => {
    const total = Object.values(MILESTONE_REWARD_DEFAULTS_CENTS).reduce((s, v) => s + v, 0);
    expect(total).toBe(370_000);
  });

  it('attribution window is 90 days', () => expect(ATTRIBUTION_WINDOW_DAYS_DEFAULT).toBe(90));
  it('fraud hold is 30 days', () => expect(FRAUD_HOLD_DAYS_DEFAULT).toBe(30));
  it('credit expiration is 24 months', () => expect(CREDIT_EXPIRATION_MONTHS_DEFAULT).toBe(24));

  it('tier thresholds 5 / 10 / 25', () => {
    expect(TIER_THRESHOLDS_DEFAULT).toEqual({ bronze: 5, silver: 10, gold: 25 });
  });

  it('1099 threshold is $600 in cents', () => {
    expect(TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT).toBe(60_000);
  });

  it('referred-practitioner discount defaults are both 15%', () => {
    expect(REFERRED_SUBSCRIPTION_DISCOUNT_PERCENT_DEFAULT).toBe(15);
    expect(REFERRED_CERT_DISCOUNT_PERCENT_DEFAULT).toBe(15);
  });
});

describe('sanitizePracticeName', () => {
  it('uppercases + strips non-alphanumerics + truncates to 10 chars', () => {
    // "Smith Wellness, LLC" -> "SMITHWELLNESSLLC" -> first 10 -> "SMITHWELLN"
    expect(sanitizePracticeName('Smith Wellness, LLC')).toBe('SMITHWELLN');
  });

  it('truncates to 10 characters', () => {
    expect(sanitizePracticeName('Comprehensive Integrative Medicine').length).toBeLessThanOrEqual(10);
  });

  it('handles empty + special-only input', () => {
    expect(sanitizePracticeName('')).toBe('');
    expect(sanitizePracticeName('   ,,, --- ')).toBe('');
  });
});

describe('generateRandomSuffix', () => {
  it('returns a string of the requested length', () => {
    expect(generateRandomSuffix(4)).toHaveLength(4);
    expect(generateRandomSuffix(8)).toHaveLength(8);
  });

  it('excludes confusable characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const s = generateRandomSuffix(20);
      expect(s).not.toMatch(/[IO01]/);
    }
  });

  it('uses only allowed alphanumeric chars', () => {
    const s = generateRandomSuffix(100);
    expect(s).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });
});

describe('buildReferralCode + toCodeSlug', () => {
  it('builds a code in the spec format', () => {
    // "Smith Wellness" -> "SMITHWELLNESS" -> first 10 -> "SMITHWELLN"
    const code = buildReferralCode('Smith Wellness', 'A7X2');
    expect(code).toBe('PRAC-SMITHWELLN-A7X2');
  });

  it('toCodeSlug produces a URL-safe lowercase form', () => {
    expect(toCodeSlug('PRAC-SMITHWELLN-A7X2')).toBe('prac-smithwelln-a7x2');
  });

  it('handles characters that must be replaced for URL safety', () => {
    expect(toCodeSlug('PRAC-A!B@C-X')).toBe('prac-a-b-c-x');
  });
});

describe('normalizePracticeName', () => {
  it('strips legal entity suffixes', () => {
    expect(normalizePracticeName('Smith Wellness LLC')).toBe('smith wellness');
    expect(normalizePracticeName('Smith Wellness, P.C.')).toBe('smith wellness');
    expect(normalizePracticeName('Smith MD, Inc.')).toBe('smith');
  });

  it('lowercases + collapses whitespace', () => {
    expect(normalizePracticeName('  Smith   Wellness  ')).toBe('smith wellness');
  });

  it('strips punctuation', () => {
    expect(normalizePracticeName('Dr. Smith - Wellness & Co.')).toBe('dr smith wellness co');
  });
});

describe('normalizeAddressParts', () => {
  it('joins + lowercases + collapses whitespace', () => {
    expect(normalizeAddressParts({
      street: '123 Main St',
      city: 'Buffalo', state: 'NY', postal_code: '14203',
    })).toBe('123 main st buffalo ny 14203');
  });

  it('handles missing fields gracefully', () => {
    expect(normalizeAddressParts({ street: null, city: null, state: null, postal_code: null })).toBe('');
  });
});

describe('normalizePhone', () => {
  it('strips all non-digits', () => {
    expect(normalizePhone('+1 (716) 555-0100')).toBe('17165550100');
    expect(normalizePhone('716.555.0100')).toBe('7165550100');
  });

  it('handles null + empty', () => {
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone('')).toBe('');
  });
});

describe('levenshteinDistance + levenshteinRatio', () => {
  it('distance is zero for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
    expect(levenshteinRatio('hello', 'hello')).toBe(1);
  });

  it('distance increases with edits', () => {
    expect(levenshteinDistance('cat', 'cut')).toBe(1);
    expect(levenshteinDistance('cat', 'dog')).toBe(3);
  });

  it('ratio is bounded [0, 1]', () => {
    const r1 = levenshteinRatio('smith wellness', 'smith wellness');
    const r2 = levenshteinRatio('smith wellness', 'smyth wellnes');
    const r3 = levenshteinRatio('smith wellness', 'completely different name');
    expect(r1).toBe(1);
    expect(r2).toBeGreaterThan(0.8);
    expect(r2).toBeLessThan(1);
    expect(r3).toBeGreaterThanOrEqual(0);
    expect(r3).toBeLessThan(0.5);
  });

  it('ratio for empty pair is 1 (both empty == identical)', () => {
    expect(levenshteinRatio('', '')).toBe(1);
  });
});
