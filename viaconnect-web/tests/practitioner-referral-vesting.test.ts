// Prompt #98 Phase 4: Pure milestone + vesting + tax + tier + notification tests.
// Elevated coverage target (90%+) per spec.

import { describe, it, expect } from 'vitest';
import {
  evaluateMilestoneCandidate,
  computeHoldExpiry,
  type MilestoneCandidate,
} from '@/lib/practitioner-referral/milestone-detector';
import {
  evaluateVesting,
  HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG,
  type VestingEvaluationInput,
} from '@/lib/practitioner-referral/vesting-engine';
import {
  applyEarningToTaxYear,
  taxYearForDate,
  type TaxYearAggregate,
} from '@/lib/practitioner-referral/tax-earnings';
import {
  calculateTierForCount,
  detectNewlyEarnedTier,
} from '@/lib/practitioner-referral/tier-calculator';
import {
  routeNotification,
  type NotificationRouteInput,
} from '@/lib/practitioner-referral/notification-router';
import {
  FRAUD_HOLD_DAYS_DEFAULT,
  TIER_THRESHOLDS_DEFAULT,
  TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT,
} from '@/lib/practitioner-referral/schema-types';

// ---------------------------------------------------------------------------
// Milestone detector
// ---------------------------------------------------------------------------

function candidate(over: Partial<MilestoneCandidate> = {}): MilestoneCandidate {
  return {
    milestone_id: 'activation_and_first_purchase',
    referred_practitioner_id: 'prac_referred',
    attribution_status: 'verified_active',
    existing_event_for_milestone: false,
    evidence: { first_order_id: 'order_1', first_order_amount_cents: 50_000 },
    ...over,
  };
}

describe('evaluateMilestoneCandidate', () => {
  it('records when verified_active + no existing event', () => {
    const r = evaluateMilestoneCandidate(candidate());
    expect(r.should_record).toBe(true);
  });

  it('records when status is pending_verification (program-active before fraud screen completes)', () => {
    const r = evaluateMilestoneCandidate(candidate({ attribution_status: 'pending_verification' }));
    expect(r.should_record).toBe(true);
  });

  it('refuses when no attribution exists (null)', () => {
    const r = evaluateMilestoneCandidate(candidate({ attribution_status: null }));
    expect(r.should_record).toBe(false);
    expect(r.reason).toMatch(/no attribution/i);
  });

  it('refuses when attribution is voided', () => {
    const r = evaluateMilestoneCandidate(candidate({ attribution_status: 'voided' }));
    expect(r.should_record).toBe(false);
  });

  it('refuses when attribution is blocked_self_referral', () => {
    const r = evaluateMilestoneCandidate(candidate({ attribution_status: 'blocked_self_referral' }));
    expect(r.should_record).toBe(false);
  });

  it('refuses when attribution is blocked_fraud_suspected', () => {
    const r = evaluateMilestoneCandidate(candidate({ attribution_status: 'blocked_fraud_suspected' }));
    expect(r.should_record).toBe(false);
  });

  it('refuses when an event for this milestone already exists', () => {
    const r = evaluateMilestoneCandidate(candidate({ existing_event_for_milestone: true }));
    expect(r.should_record).toBe(false);
    expect(r.reason).toMatch(/already recorded/i);
  });

  it('preserves the supplied evidence on the result', () => {
    const ev = { certification_id: 'cert_42', certified_at: '2026-04-19' };
    const r = evaluateMilestoneCandidate(candidate({
      milestone_id: 'master_certification_complete', evidence: ev,
    }));
    expect(r.evidence).toEqual(ev);
  });
});

describe('computeHoldExpiry', () => {
  it('adds 30 days by default', () => {
    const now = new Date('2026-04-19T00:00:00.000Z');
    const exp = computeHoldExpiry(now);
    expect(exp.toISOString()).toBe('2026-05-19T00:00:00.000Z');
  });

  it('honors a custom hold-days override', () => {
    const now = new Date('2026-04-19T00:00:00.000Z');
    const exp = computeHoldExpiry(now, 7);
    expect(exp.toISOString()).toBe('2026-04-26T00:00:00.000Z');
  });

  it('exposes the spec default (30 days)', () => {
    expect(FRAUD_HOLD_DAYS_DEFAULT).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Vesting engine
// ---------------------------------------------------------------------------

const NOW = new Date('2026-04-20T00:00:00.000Z');

function vestingInput(over: Partial<VestingEvaluationInput> = {}): VestingEvaluationInput {
  return {
    now: NOW,
    hold_expires_at: '2026-04-19T00:00:00.000Z',
    attribution_status: 'verified_active',
    pending_blocking_fraud_flags: 0,
    pending_non_blocking_fraud_flags: 0,
    ...over,
  };
}

describe('evaluateVesting', () => {
  it('vests when hold expired + attribution verified + no pending flags', () => {
    const r = evaluateVesting(vestingInput());
    expect(r.outcome).toBe('vest');
  });

  it('keeps holding when hold not yet expired', () => {
    const r = evaluateVesting(vestingInput({ hold_expires_at: '2026-04-25T00:00:00.000Z' }));
    expect(r.outcome).toBe('hold_active');
  });

  it('voids when attribution status is not verified_active or pending_verification', () => {
    const r = evaluateVesting(vestingInput({ attribution_status: 'blocked_fraud_suspected' }));
    expect(r.outcome).toBe('void_admin');
    expect(r.reason).toMatch(/attribution status/i);
  });

  it('voids when attribution is voided', () => {
    const r = evaluateVesting(vestingInput({ attribution_status: 'voided' }));
    expect(r.outcome).toBe('void_admin');
  });

  it('extends hold by 7 days when there is a pending fraud flag', () => {
    const r = evaluateVesting(vestingInput({ pending_blocking_fraud_flags: 1 }));
    expect(r.outcome).toBe('extend_hold');
    expect(r.extension_days).toBe(HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG);
    expect(HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG).toBe(7);
  });

  it('extends hold even for non-blocking pending flags so admin can decide', () => {
    const r = evaluateVesting(vestingInput({ pending_non_blocking_fraud_flags: 1 }));
    expect(r.outcome).toBe('extend_hold');
  });

  it('still vests when attribution is pending_verification (program-active during initial screen)', () => {
    const r = evaluateVesting(vestingInput({ attribution_status: 'pending_verification' }));
    expect(r.outcome).toBe('vest');
  });
});

// ---------------------------------------------------------------------------
// Tax earnings aggregate
// ---------------------------------------------------------------------------

describe('taxYearForDate', () => {
  it('returns the UTC year', () => {
    expect(taxYearForDate(new Date('2026-04-19T23:59:59.000Z'))).toBe(2026);
    expect(taxYearForDate(new Date('2026-12-31T23:59:59.000Z'))).toBe(2026);
    expect(taxYearForDate(new Date('2027-01-01T00:00:01.000Z'))).toBe(2027);
  });
});

describe('applyEarningToTaxYear', () => {
  function aggregate(over: Partial<TaxYearAggregate> = {}): TaxYearAggregate {
    return {
      tax_year: 2026,
      total_earned_cents: 0,
      crossed_600_threshold: false,
      crossed_600_threshold_at: null,
      form_1099_required: false,
      ...over,
    };
  }

  it('initializes a brand-new aggregate with the first earning', () => {
    const r = applyEarningToTaxYear(aggregate({ total_earned_cents: 0 }), 20_000, NOW);
    expect(r.total_earned_cents).toBe(20_000);
    expect(r.crossed_600_threshold).toBe(false);
    expect(r.form_1099_required).toBe(false);
  });

  it('crosses the $600 threshold and flips form_1099_required', () => {
    const r = applyEarningToTaxYear(aggregate({ total_earned_cents: 50_000 }), 20_000, NOW);
    // 50k + 20k = 70k > 60k threshold
    expect(r.total_earned_cents).toBe(70_000);
    expect(r.crossed_600_threshold).toBe(true);
    expect(r.form_1099_required).toBe(true);
    expect(r.crossed_600_threshold_at).toBe(NOW.toISOString());
  });

  it('does not double-flip the crossed flag when re-entered', () => {
    const r = applyEarningToTaxYear(
      aggregate({
        total_earned_cents: 70_000, crossed_600_threshold: true,
        crossed_600_threshold_at: '2026-03-01T00:00:00.000Z',
        form_1099_required: true,
      }),
      30_000, NOW,
    );
    expect(r.total_earned_cents).toBe(100_000);
    expect(r.crossed_600_threshold).toBe(true);
    expect(r.crossed_600_threshold_at).toBe('2026-03-01T00:00:00.000Z'); // preserved
  });

  it('exposes the spec threshold ($600 in cents)', () => {
    expect(TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT).toBe(60_000);
  });

  it('honors a custom threshold override', () => {
    const r = applyEarningToTaxYear(aggregate({ total_earned_cents: 0 }), 30_000, NOW, 25_000);
    expect(r.crossed_600_threshold).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tier calculator
// ---------------------------------------------------------------------------

describe('calculateTierForCount', () => {
  it('returns none below 5', () => {
    expect(calculateTierForCount(0)).toBe('none');
    expect(calculateTierForCount(4)).toBe('none');
  });

  it('returns bronze at 5 to 9', () => {
    expect(calculateTierForCount(5)).toBe('bronze_referrer');
    expect(calculateTierForCount(9)).toBe('bronze_referrer');
  });

  it('returns silver at 10 to 24', () => {
    expect(calculateTierForCount(10)).toBe('silver_referrer');
    expect(calculateTierForCount(24)).toBe('silver_referrer');
  });

  it('returns gold at 25+', () => {
    expect(calculateTierForCount(25)).toBe('gold_referrer');
    expect(calculateTierForCount(100)).toBe('gold_referrer');
  });

  it('exposes the spec thresholds', () => {
    expect(TIER_THRESHOLDS_DEFAULT).toEqual({ bronze: 5, silver: 10, gold: 25 });
  });

  it('honors custom thresholds', () => {
    expect(calculateTierForCount(3, { bronze: 3, silver: 6, gold: 12 })).toBe('bronze_referrer');
  });
});

describe('detectNewlyEarnedTier', () => {
  it('returns bronze when transitioning from none to bronze', () => {
    expect(detectNewlyEarnedTier('none', 'bronze_referrer')).toBe('bronze_referrer');
  });
  it('returns silver when transitioning from bronze to silver', () => {
    expect(detectNewlyEarnedTier('bronze_referrer', 'silver_referrer')).toBe('silver_referrer');
  });
  it('returns gold when transitioning from silver to gold', () => {
    expect(detectNewlyEarnedTier('silver_referrer', 'gold_referrer')).toBe('gold_referrer');
  });
  it('returns null when tier did not change', () => {
    expect(detectNewlyEarnedTier('bronze_referrer', 'bronze_referrer')).toBeNull();
  });
  it('returns null on tier downgrade (defensive: should not happen but never notify)', () => {
    expect(detectNewlyEarnedTier('gold_referrer', 'silver_referrer')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Notification router
// ---------------------------------------------------------------------------

function notif(over: Partial<NotificationRouteInput> = {}): NotificationRouteInput {
  return {
    stage: 'vested',
    privacy_allows_progress: true,
    referred_practice_name: 'Smith Wellness LLC',
    milestone_display_name: 'Master Practitioner Certification Complete',
    amount_cents: 50_000,
    hold_expires_at: '2026-05-19T00:00:00.000Z',
    ...over,
  };
}

describe('routeNotification', () => {
  it('sends full referrer notification when privacy allows', () => {
    const r = routeNotification(notif());
    expect(r.send).toBe(true);
    expect(r.template).toBe('referral_milestone_vested');
    expect(r.payload?.referred_practice_name).toBe('Smith Wellness LLC');
  });

  it('sends pending_hold template when stage is pending_hold and privacy allows', () => {
    const r = routeNotification(notif({ stage: 'pending_hold' }));
    expect(r.template).toBe('referral_milestone_reached_pending_hold');
    expect(r.payload?.hold_expires_at).toBeDefined();
  });

  it('sends an anonymous credit-applied notification on vested when privacy is opted out', () => {
    const r = routeNotification(notif({ privacy_allows_progress: false }));
    expect(r.send).toBe(true);
    expect(r.template).toBe('referral_credit_applied_anonymous');
    expect(r.payload?.referred_practice_name).toBeUndefined();
    expect(r.payload?.amount_cents).toBe(50_000);
  });

  it('skips notification entirely on pending_hold when opted out (no leak about the referred)', () => {
    const r = routeNotification(notif({ stage: 'pending_hold', privacy_allows_progress: false }));
    expect(r.send).toBe(false);
  });

  it('honors the explicit silent-vesting variant on opt-out edge transition', () => {
    const r = routeNotification(notif({ stage: 'silent_vesting_announcement', privacy_allows_progress: false }));
    expect(r.send).toBe(true);
    expect(r.template).toBe('referral_silent_vesting_notice');
    expect(r.payload?.referred_practice_name).toBe('Smith Wellness LLC');
  });

  it('returns send=false for an unrecognized stage', () => {
    const r = routeNotification(notif({ stage: 'unknown_stage' as any }));
    expect(r.send).toBe(false);
  });
});
