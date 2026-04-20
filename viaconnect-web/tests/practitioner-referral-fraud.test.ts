// Prompt #98 Phase 6: Fraud detection + resolution tests.
// Elevated coverage target (90%+) per spec.

import { describe, it, expect } from 'vitest';
import {
  detectHighVelocity,
  detectClusterPattern,
  detectRapidTermination,
  detectIpOverlap,
  HIGH_VELOCITY_THRESHOLD_DEFAULT,
  HIGH_VELOCITY_WINDOW_DAYS,
  RAPID_TERMINATION_WINDOW_DAYS,
  IP_OVERLAP_THRESHOLD,
  type AttributionLite,
  type MilestoneEventLite,
  type ClickRecordLite,
} from '@/lib/practitioner-referral/fraud-patterns';
import {
  evaluateFraudResolution,
  buildClawbackLedgerDelta,
  type ResolutionInput,
} from '@/lib/practitioner-referral/fraud-resolution';

const NOW = new Date('2026-04-20T00:00:00.000Z');

// ---------------------------------------------------------------------------
// High velocity
// ---------------------------------------------------------------------------

describe('detectHighVelocity', () => {
  it('exposes the spec threshold (>5 in 30 days)', () => {
    expect(HIGH_VELOCITY_THRESHOLD_DEFAULT).toBe(5);
    expect(HIGH_VELOCITY_WINDOW_DAYS).toBe(30);
  });

  function events(count: number, daysAgo = 10): MilestoneEventLite[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `e_${i}`,
      attribution_id: `a_${i}`,
      achieved_at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    }));
  }

  it('fires when count strictly exceeds threshold within window', () => {
    const r = detectHighVelocity({ recent_events: events(6), now: NOW });
    expect(r.detected).toBe(true);
    expect(r.severity).toBe('medium');
    expect(r.evidence?.events_in_window).toBe(6);
  });

  it('does NOT fire at exactly the threshold (strict greater-than)', () => {
    const r = detectHighVelocity({ recent_events: events(5), now: NOW });
    expect(r.detected).toBe(false);
  });

  it('ignores events outside the 30-day window', () => {
    const oldEvents = events(10, 45);
    const r = detectHighVelocity({ recent_events: oldEvents, now: NOW });
    expect(r.detected).toBe(false);
  });

  it('fires with severity=high when count exceeds 2x threshold', () => {
    const r = detectHighVelocity({ recent_events: events(11), now: NOW });
    expect(r.detected).toBe(true);
    expect(r.severity).toBe('high');
  });

  it('honors a custom threshold override', () => {
    const r = detectHighVelocity({ recent_events: events(4), now: NOW, threshold: 3 });
    expect(r.detected).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cluster pattern
// ---------------------------------------------------------------------------

function attribution(over: Partial<AttributionLite> = {}): AttributionLite {
  return {
    attribution_id: 'a_?',
    referred_practitioner_id: 'prac_?',
    practice_name: 'Random Wellness',
    practice_phone: '7165550100',
    practice_street_address: '100 Main St',
    practice_city: 'Buffalo',
    practice_state: 'NY',
    practice_postal_code: '14203',
    ...over,
  };
}

describe('detectClusterPattern', () => {
  it('fires when multiple attributions share normalized phone', () => {
    const r = detectClusterPattern({
      attributions: [
        attribution({ attribution_id: 'a1', practice_phone: '+1 (716) 555-0100' }),
        attribution({ attribution_id: 'a2', practice_phone: '7165550100' }),
        attribution({ attribution_id: 'a3', practice_phone: '9999999999' }),
      ],
    });
    expect(r.detected).toBe(true);
    expect(r.severity).toBe('high');
    expect(r.evidence?.shared_phone_count).toBeGreaterThanOrEqual(2);
  });

  it('fires when multiple attributions share normalized address', () => {
    const r = detectClusterPattern({
      attributions: [
        attribution({ attribution_id: 'a1', practice_street_address: '100 Main St' }),
        attribution({ attribution_id: 'a2', practice_street_address: '100 MAIN ST' }),
        attribution({ attribution_id: 'a3', practice_street_address: '200 Oak Ave', practice_postal_code: '14604' }),
      ],
    });
    expect(r.detected).toBe(true);
    expect(r.evidence?.shared_address_count).toBeGreaterThanOrEqual(2);
  });

  it('does NOT fire on 1 attribution alone', () => {
    const r = detectClusterPattern({ attributions: [attribution({ attribution_id: 'a1' })] });
    expect(r.detected).toBe(false);
  });

  it('does NOT fire when all attributions are distinct', () => {
    const r = detectClusterPattern({
      attributions: [
        attribution({ attribution_id: 'a1', practice_phone: '1111111111', practice_street_address: '1 Main', practice_city: 'A' }),
        attribution({ attribution_id: 'a2', practice_phone: '2222222222', practice_street_address: '2 Oak',  practice_city: 'B' }),
        attribution({ attribution_id: 'a3', practice_phone: '3333333333', practice_street_address: '3 Elm',  practice_city: 'C' }),
      ],
    });
    expect(r.detected).toBe(false);
  });

  it('ignores empty/null fields when assessing sharing', () => {
    const r = detectClusterPattern({
      attributions: [
        attribution({ attribution_id: 'a1', practice_phone: null, practice_street_address: null }),
        attribution({ attribution_id: 'a2', practice_phone: null, practice_street_address: null }),
      ],
    });
    expect(r.detected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rapid termination
// ---------------------------------------------------------------------------

describe('detectRapidTermination', () => {
  it('exposes the 90-day window', () => {
    expect(RAPID_TERMINATION_WINDOW_DAYS).toBe(90);
  });

  it('fires when practitioner terminated within 90 days of attribution', () => {
    const r = detectRapidTermination({
      attributed_at: new Date(NOW.getTime() - 45 * 86_400_000).toISOString(),
      terminated_at: NOW,
    });
    expect(r.detected).toBe(true);
    expect(r.evidence?.days_from_attribution_to_termination).toBe(45);
    expect(r.severity).toBe('medium');
  });

  it('does NOT fire when termination is >90 days after attribution', () => {
    const r = detectRapidTermination({
      attributed_at: new Date(NOW.getTime() - 120 * 86_400_000).toISOString(),
      terminated_at: NOW,
    });
    expect(r.detected).toBe(false);
  });

  it('does not fire when not terminated (terminated_at null)', () => {
    const r = detectRapidTermination({
      attributed_at: new Date(NOW.getTime() - 10 * 86_400_000).toISOString(),
      terminated_at: null,
    });
    expect(r.detected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// IP overlap
// ---------------------------------------------------------------------------

function click(over: Partial<ClickRecordLite> = {}): ClickRecordLite {
  return {
    id: 'c_?',
    attribution_id: 'a_?',
    ip_address_hash: 'ip_hash_a',
    ...over,
  };
}

describe('detectIpOverlap', () => {
  it('exposes the overlap threshold', () => {
    expect(IP_OVERLAP_THRESHOLD).toBe(3);
  });

  it('fires when 3+ attributions share the same ip hash', () => {
    const r = detectIpOverlap({
      clicks: [
        click({ id: 'c1', attribution_id: 'a1', ip_address_hash: 'ipA' }),
        click({ id: 'c2', attribution_id: 'a2', ip_address_hash: 'ipA' }),
        click({ id: 'c3', attribution_id: 'a3', ip_address_hash: 'ipA' }),
      ],
    });
    expect(r.detected).toBe(true);
    expect(r.severity).toBe('high');
    expect(r.evidence?.shared_ip_hash).toBe('ipA');
  });

  it('does NOT fire with only 2 shared', () => {
    const r = detectIpOverlap({
      clicks: [
        click({ id: 'c1', attribution_id: 'a1', ip_address_hash: 'ipA' }),
        click({ id: 'c2', attribution_id: 'a2', ip_address_hash: 'ipA' }),
      ],
    });
    expect(r.detected).toBe(false);
  });

  it('ignores null ip_hash (DNT-respected clicks)', () => {
    const r = detectIpOverlap({
      clicks: [
        click({ id: 'c1', attribution_id: 'a1', ip_address_hash: null }),
        click({ id: 'c2', attribution_id: 'a2', ip_address_hash: null }),
        click({ id: 'c3', attribution_id: 'a3', ip_address_hash: null }),
      ],
    });
    expect(r.detected).toBe(false);
  });

  it('counts distinct attributions only (not distinct clicks per attribution)', () => {
    const r = detectIpOverlap({
      clicks: [
        click({ id: 'c1', attribution_id: 'a1', ip_address_hash: 'ipA' }),
        click({ id: 'c1b', attribution_id: 'a1', ip_address_hash: 'ipA' }),
        click({ id: 'c1c', attribution_id: 'a1', ip_address_hash: 'ipA' }),
      ],
    });
    expect(r.detected).toBe(false);   // all from same attribution
  });
});

// ---------------------------------------------------------------------------
// Fraud resolution
// ---------------------------------------------------------------------------

function resolutionInput(over: Partial<ResolutionInput> = {}): ResolutionInput {
  return {
    admin_action: 'confirm_fraud',
    reason: 'Same address + phone across multiple attributions',
    flag_has_milestone_event_link: true,
    milestone_event_vested: false,
    milestone_event_vesting_status: 'pending_hold',
    attribution_fraud_flag_count_including_this: 1,
    ...over,
  };
}

describe('evaluateFraudResolution', () => {
  it('confirm_fraud on pending_hold event voids event without clawback', () => {
    const r = evaluateFraudResolution(resolutionInput());
    expect(r.next_flag_status).toBe('confirmed_fraud');
    expect(r.void_milestone_event).toBe(true);
    expect(r.clawback_ledger_entry).toBe(false);
    expect(r.deactivate_code).toBe(false);
  });

  it('confirm_fraud on vested event voids event AND creates clawback', () => {
    const r = evaluateFraudResolution(resolutionInput({
      milestone_event_vested: true, milestone_event_vesting_status: 'vested',
    }));
    expect(r.void_milestone_event).toBe(true);
    expect(r.clawback_ledger_entry).toBe(true);
  });

  it('confirm_fraud with 3+ cumulative flags flips void_attribution + deactivate_code (systemic)', () => {
    const r = evaluateFraudResolution(resolutionInput({
      attribution_fraud_flag_count_including_this: 3,
    }));
    expect(r.void_attribution).toBe(true);
    expect(r.deactivate_code).toBe(true);
  });

  it('confirm_fraud requires 20+ char reason', () => {
    const r = evaluateFraudResolution(resolutionInput({ reason: 'too short' }));
    expect(r.ok).toBe(false);
    expect(r.reason_invalid).toBe(true);
  });

  it('clear_benign releases the flag without touching events', () => {
    const r = evaluateFraudResolution(resolutionInput({
      admin_action: 'clear_benign', reason: 'Known cohort; confirmed benign via admin call',
    }));
    expect(r.next_flag_status).toBe('cleared_benign');
    expect(r.void_milestone_event).toBe(false);
    expect(r.clawback_ledger_entry).toBe(false);
  });

  it('admin_override requires 50+ char reason (detailed)', () => {
    const r = evaluateFraudResolution(resolutionInput({
      admin_action: 'admin_override', reason: 'short',
    }));
    expect(r.ok).toBe(false);
    expect(r.reason_invalid).toBe(true);
  });

  it('admin_override with 50+ char reason allows vesting to proceed', () => {
    const r = evaluateFraudResolution(resolutionInput({
      admin_action: 'admin_override',
      reason: 'Gary personally knows both practitioners; confirmed unrelated',
    }));
    expect(r.ok).toBe(true);
    expect(r.next_flag_status).toBe('admin_override');
    expect(r.void_milestone_event).toBe(false);
  });

  it('rejects unknown admin_action', () => {
    const r = evaluateFraudResolution(resolutionInput({ admin_action: 'burn_it_all' as any }));
    expect(r.ok).toBe(false);
  });
});

describe('buildClawbackLedgerDelta', () => {
  it('returns the negated reward amount for a vested event', () => {
    const r = buildClawbackLedgerDelta({ vested_amount_cents: 50_000 });
    expect(r.amount_cents).toBe(-50_000);
    expect(r.entry_type).toBe('voided_fraud');
  });

  it('returns zero-amount noop when vested_amount is zero (event not yet vested)', () => {
    const r = buildClawbackLedgerDelta({ vested_amount_cents: 0 });
    expect(r.amount_cents).toBe(0);
  });
});
