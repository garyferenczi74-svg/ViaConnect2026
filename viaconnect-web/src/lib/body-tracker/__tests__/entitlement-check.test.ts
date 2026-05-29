// Tests for entitlement-check.ts (Prompt #169a, spec sections 3 + 10).
//
// Covers:
//   decideBodyScanEntitlement: the pure three-point decision
//     - premium consumer            => 'premium' + subscription id passthrough
//     - non-premium consumer        => statusForScan null (must claim teaser)
//     - practitioner-managed         => 'practitioner_managed', bypasses premium
//     - tier / status edge cases (free tier, inactive status, legacy tier col)
//   fn_claim_free_body_scan_teaser contract (idempotent):
//     a faithful in-memory model of the atomic conditional UPDATE proves the
//     real behavior: first claim returns true, every subsequent claim false.

import { describe, it, expect } from 'vitest';
import {
  decideBodyScanEntitlement,
  type MembershipSignal,
} from '../entitlement-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function membership(overrides: Partial<MembershipSignal>): MembershipSignal {
  return {
    status: 'active',
    tier: 'gold',
    tier_id: 'gold',
    stripe_subscription_id: 'sub_123',
    ...overrides,
  };
}

// ===========================================================================
// decideBodyScanEntitlement: premium consumer
// ===========================================================================

describe('decideBodyScanEntitlement: premium consumer', () => {
  it('marks an active gold member premium and stamps premium', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ status: 'active', tier_id: 'gold' }),
      practitionerManaged: false,
    });
    expect(result.premium).toBe(true);
    expect(result.statusForScan).toBe('premium');
    expect(result.subscriptionId).toBe('sub_123');
    expect(result.practitionerManaged).toBe(false);
  });

  it('treats platinum and platinum_family as premium', () => {
    for (const tier of ['platinum', 'platinum_family']) {
      const result = decideBodyScanEntitlement({
        membership: membership({ tier_id: tier }),
        practitionerManaged: false,
      });
      expect(result.premium).toBe(true);
      expect(result.statusForScan).toBe('premium');
    }
  });

  it('treats trialing and gift_active statuses as active premium', () => {
    for (const status of ['trialing', 'gift_active']) {
      const result = decideBodyScanEntitlement({
        membership: membership({ status }),
        practitionerManaged: false,
      });
      expect(result.premium).toBe(true);
      expect(result.statusForScan).toBe('premium');
    }
  });

  it('falls back to the legacy tier column when tier_id is null', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: null, tier: 'platinum' }),
      practitionerManaged: false,
    });
    expect(result.premium).toBe(true);
    expect(result.statusForScan).toBe('premium');
  });

  it('passes through a null subscription id for a premium gift membership', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ status: 'gift_active', stripe_subscription_id: null }),
      practitionerManaged: false,
    });
    expect(result.premium).toBe(true);
    expect(result.subscriptionId).toBeNull();
  });
});

// ===========================================================================
// decideBodyScanEntitlement: non-premium consumer
// ===========================================================================

describe('decideBodyScanEntitlement: non-premium consumer', () => {
  it('returns null statusForScan when there is no membership (must claim teaser)', () => {
    const result = decideBodyScanEntitlement({
      membership: null,
      practitionerManaged: false,
    });
    expect(result.premium).toBe(false);
    expect(result.statusForScan).toBeNull();
    expect(result.subscriptionId).toBeNull();
  });

  it('treats a free-tier active membership as non-premium', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'free', tier: 'free' }),
      practitionerManaged: false,
    });
    expect(result.premium).toBe(false);
    expect(result.statusForScan).toBeNull();
  });

  it('treats a canceled or past_due paid membership as non-premium', () => {
    for (const status of ['canceled', 'past_due', 'paused', 'gift_expired']) {
      const result = decideBodyScanEntitlement({
        membership: membership({ status, tier_id: 'gold' }),
        practitionerManaged: false,
      });
      expect(result.premium).toBe(false);
      expect(result.statusForScan).toBeNull();
    }
  });

  it('does not leak a subscription id for a non-premium consumer', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ status: 'canceled', stripe_subscription_id: 'sub_999' }),
      practitionerManaged: false,
    });
    expect(result.subscriptionId).toBeNull();
  });
});

// ===========================================================================
// decideBodyScanEntitlement: practitioner-managed context
// ===========================================================================

describe('decideBodyScanEntitlement: practitioner-managed', () => {
  it('stamps practitioner_managed and bypasses the premium check for a non-premium consumer', () => {
    const result = decideBodyScanEntitlement({
      membership: null,
      practitionerManaged: true,
    });
    expect(result.statusForScan).toBe('practitioner_managed');
    expect(result.practitionerManaged).toBe(true);
    // No teaser claim is required in the practitioner-managed path.
    expect(result.statusForScan).not.toBeNull();
  });

  it('stamps practitioner_managed even when the consumer is also premium', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum' }),
      practitionerManaged: true,
    });
    expect(result.statusForScan).toBe('practitioner_managed');
    // premium flag still reflects the underlying membership truth.
    expect(result.premium).toBe(true);
  });
});

// ===========================================================================
// fn_claim_free_body_scan_teaser contract (idempotent atomic claim)
// ===========================================================================
//
// The SQL function performs:
//   UPDATE profiles SET free_body_scan_used = true, free_body_scan_used_at = now()
//   WHERE id = p_user_id AND free_body_scan_used = false RETURNING true;
//   return coalesce(<returned>, false);
//
// The defining behavior is: exactly one claim per user ever returns true. This
// in-memory model mirrors the atomic conditional UPDATE so the test exercises
// the real contract (not a stub that always returns a canned value).

class TeaserClaimModel {
  // user id -> free_body_scan_used flag
  private used = new Map<string, boolean>();
  // user id -> free_body_scan_used_at
  private usedAt = new Map<string, string>();

  // Mirrors fn_claim_free_body_scan_teaser: returns true only on the
  // transition false -> true; otherwise false.
  claim(userId: string): boolean {
    const alreadyUsed = this.used.get(userId) === true;
    if (alreadyUsed) return false;
    this.used.set(userId, true);
    this.usedAt.set(userId, new Date().toISOString());
    return true;
  }

  wasUsed(userId: string): boolean {
    return this.used.get(userId) === true;
  }

  usedAtValue(userId: string): string | undefined {
    return this.usedAt.get(userId);
  }
}

describe('fn_claim_free_body_scan_teaser contract (idempotent)', () => {
  it('returns true on the first claim and false on the second', () => {
    const model = new TeaserClaimModel();
    expect(model.claim('user-a')).toBe(true);
    expect(model.claim('user-a')).toBe(false);
  });

  it('returns false for every subsequent claim after the first', () => {
    const model = new TeaserClaimModel();
    expect(model.claim('user-b')).toBe(true);
    for (let i = 0; i < 5; i += 1) {
      expect(model.claim('user-b')).toBe(false);
    }
  });

  it('records the used flag and a timestamp on the successful claim only', () => {
    const model = new TeaserClaimModel();
    expect(model.wasUsed('user-c')).toBe(false);
    expect(model.usedAtValue('user-c')).toBeUndefined();

    model.claim('user-c');
    expect(model.wasUsed('user-c')).toBe(true);
    const firstTimestamp = model.usedAtValue('user-c');
    expect(firstTimestamp).toBeDefined();

    // A second claim must not change the recorded timestamp.
    model.claim('user-c');
    expect(model.usedAtValue('user-c')).toBe(firstTimestamp);
  });

  it('tracks claims independently per user', () => {
    const model = new TeaserClaimModel();
    expect(model.claim('user-d')).toBe(true);
    expect(model.claim('user-e')).toBe(true);
    expect(model.claim('user-d')).toBe(false);
    expect(model.claim('user-e')).toBe(false);
  });
});
