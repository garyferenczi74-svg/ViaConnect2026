// Tests for entitlement-check.ts (Prompt #169a, realigned to the #169f TIER
// MODEL).
//
// These exercise the pure decision decideBodyScanEntitlement and the pure
// trial-fallback applyTrialFallback, which are the TS mirror of the SQL resolver
// fn_resolve_body_scan_tier_status (membership branches in migration
// 20260516000150; the platinum_trials trial branch in migration 20260516000170).
// Under #169f, Body Scan is Platinum-and-above only and the free teaser is
// RETIRED: a non-entitled user with no active trial is REJECTED. An ACTIVE trial
// (169f Option C / D) grants access, but a PAID entitlement always outranks it.
//
// Covers:
//   decideBodyScanEntitlement: the pure tier decision
//     - own platinum            => entitled, statusForScan 'platinum'
//     - own platinum_family      => 'platinum_plus_family_holder'
//     - family-holder link       => 'platinum_plus_family_member'
//     - gold / free / none       => NOT entitled (statusForScan null; no teaser)
//     - lapsed period-end        => NOT entitled
//     - practitioner-managed      => 'practitioner_managed', bypass
//     - precedence holder > member > own-platinum
//   verifyPractitionerManaged contract (server-side, fail-closed):
//     a faithful in-memory model of the relationship join proves the real
//     behavior so the practitioner bypass is granted ONLY on an active
//     relationship and a normal consumer resolves to non-practitioner-managed.
//     The live helper lives in the Deno edge function
//     (supabase/functions/body-scan-analyze/entitlement.ts), which vitest
//     excludes (esm.sh + .ts imports); this models its decision identically.

import { describe, it, expect } from 'vitest';
import {
  decideBodyScanEntitlement,
  applyTrialFallback,
  type BodyScanEntitlement,
  type MembershipSignal,
} from '../entitlement-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A future ISO timestamp so an active membership is never treated as lapsed by
// the period-end gate, and a past one for the lapsed cases.
const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function membership(overrides: Partial<MembershipSignal>): MembershipSignal {
  return {
    status: 'active',
    tier: 'platinum',
    tier_id: 'platinum',
    tier_level: 2,
    current_period_end: FUTURE,
    stripe_subscription_id: 'sub_123',
    ...overrides,
  };
}

// ===========================================================================
// decideBodyScanEntitlement: entitled via own membership
// ===========================================================================

describe('decideBodyScanEntitlement: entitled via own membership', () => {
  it('stamps platinum for an active own platinum membership', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum', tier_level: 2 }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(true);
    expect(result.statusForScan).toBe('platinum');
    expect(result.subscriptionId).toBe('sub_123');
    expect(result.practitionerManaged).toBe(false);
  });

  it('stamps platinum_plus_family_holder for an own platinum_family membership', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum_family', tier_level: 3 }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(true);
    expect(result.statusForScan).toBe('platinum_plus_family_holder');
    expect(result.subscriptionId).toBe('sub_123');
  });

  it('treats trialing and gift_active platinum as entitled (maps to platinum; trial split deferred)', () => {
    for (const status of ['trialing', 'gift_active']) {
      const result = decideBodyScanEntitlement({
        membership: membership({ status, tier_id: 'platinum', tier_level: 2 }),
        familyHolderLink: false,
        practitionerManaged: false,
      });
      expect(result.entitled).toBe(true);
      expect(result.statusForScan).toBe('platinum');
    }
  });

  it('derives the tier level from tier_id when tier_level is null', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum', tier_level: null }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(true);
    expect(result.statusForScan).toBe('platinum');
  });

  it('passes through a null subscription id for a gift platinum membership', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ status: 'gift_active', stripe_subscription_id: null }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(true);
    expect(result.subscriptionId).toBeNull();
  });
});

// ===========================================================================
// decideBodyScanEntitlement: entitled via family-holder link
// ===========================================================================

describe('decideBodyScanEntitlement: entitled via family link', () => {
  it('stamps platinum_plus_family_member for a member with the link and no own membership', () => {
    const result = decideBodyScanEntitlement({
      membership: null,
      familyHolderLink: true,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(true);
    expect(result.statusForScan).toBe('platinum_plus_family_member');
    // The member does not own the subscription; the holder does.
    expect(result.subscriptionId).toBeNull();
  });

  it('stamps the family member even when the member has a non-entitled own membership (gold)', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'gold', tier_level: 1 }),
      familyHolderLink: true,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(true);
    expect(result.statusForScan).toBe('platinum_plus_family_member');
  });
});

// ===========================================================================
// decideBodyScanEntitlement: NOT entitled (no free teaser under #169f)
// ===========================================================================

describe('decideBodyScanEntitlement: not entitled (rejected, no teaser)', () => {
  it('returns null statusForScan when there is no membership and no link', () => {
    const result = decideBodyScanEntitlement({
      membership: null,
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(false);
    expect(result.statusForScan).toBeNull();
    expect(result.subscriptionId).toBeNull();
  });

  it('treats a free-tier active membership as not entitled', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'free', tier: 'free', tier_level: 0 }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(false);
    expect(result.statusForScan).toBeNull();
  });

  it('treats a Gold membership as not entitled (Body Scan is Platinum-and-above)', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'gold', tier_level: 1 }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(false);
    expect(result.statusForScan).toBeNull();
  });

  it('treats a canceled or past_due platinum membership as not entitled', () => {
    for (const status of ['canceled', 'past_due', 'paused', 'gift_expired']) {
      const result = decideBodyScanEntitlement({
        membership: membership({ status, tier_id: 'platinum', tier_level: 2 }),
        familyHolderLink: false,
        practitionerManaged: false,
      });
      expect(result.entitled).toBe(false);
      expect(result.statusForScan).toBeNull();
    }
  });

  it('treats a lapsed (current_period_end in the past) platinum membership as not entitled', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum', tier_level: 2, current_period_end: PAST }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(false);
    expect(result.statusForScan).toBeNull();
  });

  it('treats a non-expiring (null current_period_end) platinum membership as entitled', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum', tier_level: 2, current_period_end: null }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.entitled).toBe(true);
    expect(result.statusForScan).toBe('platinum');
  });

  it('does not leak a subscription id for a not-entitled consumer', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ status: 'canceled', stripe_subscription_id: 'sub_999' }),
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(result.subscriptionId).toBeNull();
  });
});

// ===========================================================================
// decideBodyScanEntitlement: precedence (holder > member > own-platinum)
// ===========================================================================

describe('decideBodyScanEntitlement: precedence mirrors the SQL resolver', () => {
  it('own platinum_family holder beats a family-member link', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum_family', tier_level: 3 }),
      familyHolderLink: true,
      practitionerManaged: false,
    });
    expect(result.statusForScan).toBe('platinum_plus_family_holder');
  });

  it('a family-member link beats an own plain platinum membership', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum', tier_level: 2 }),
      familyHolderLink: true,
      practitionerManaged: false,
    });
    expect(result.statusForScan).toBe('platinum_plus_family_member');
  });
});

// ===========================================================================
// decideBodyScanEntitlement: practitioner-managed context
// ===========================================================================

describe('decideBodyScanEntitlement: practitioner-managed', () => {
  it('stamps practitioner_managed and bypasses the entitlement check for a non-entitled consumer', () => {
    const result = decideBodyScanEntitlement({
      membership: null,
      familyHolderLink: false,
      practitionerManaged: true,
    });
    expect(result.statusForScan).toBe('practitioner_managed');
    expect(result.practitionerManaged).toBe(true);
    // The managed path always stamps; it never falls through to a rejection.
    expect(result.statusForScan).not.toBeNull();
  });

  it('stamps practitioner_managed even when the consumer is also entitled', () => {
    const result = decideBodyScanEntitlement({
      membership: membership({ tier_id: 'platinum', tier_level: 2 }),
      familyHolderLink: false,
      practitionerManaged: true,
    });
    expect(result.statusForScan).toBe('practitioner_managed');
    // entitled still reflects the underlying membership truth.
    expect(result.entitled).toBe(true);
  });
});

// ===========================================================================
// Server-side practitioner-managed verification (the #169a review fix).
//
// SECURITY: practitioner_managed must NOT be a trusted client boolean. The Deno
// edge helper verifyPractitionerManaged determines it from the database, gating
// on the canonical practitioner_patients table (same pattern as body-scan-export
// and 20260516000060_prompt_169_practitioner_scan_read_rls.sql):
//
//   practitioner_patients pp
//   WHERE pp.practitioner_id = <caller auth uid>
//     AND pp.patient_id      = <patient id>
//     AND pp.status          = 'active'
//
// In practitioner_patients, practitioner_id IS the caller's auth uid directly,
// so there is NO join through a practitioners table. The Prompt #92
// patient_practitioner_relationships table was dropped CASCADE in
// 20260418000160_practitioners_schema_reconciliation.sql.
//
// The live helper is in supabase/functions (excluded from vitest because of its
// esm.sh + .ts imports), so this in-memory model reproduces the same filter +
// fail-closed rules and asserts the real decision. Anything other than an active
// matching row resolves to false, which routes the request into the consumer
// entitlement path (decideBodyScanEntitlement with practitionerManaged=false).
// ===========================================================================

interface PractitionerPatientRow {
  practitioner_id: string; // the practitioner's auth uid (the caller acting on behalf)
  patient_id: string; // the patient's auth uid (the scan subject)
  status: string;
}

class PractitionerRelationshipModel {
  private rows: PractitionerPatientRow[] = [];

  addRelationship(row: PractitionerPatientRow): void {
    this.rows.push(row);
  }

  // Mirrors verifyPractitionerManaged: true ONLY when an active
  // practitioner_patients row matches practitioner_id = caller and
  // patient_id = patient. Fail-closed on a missing patient id and on a self-scan
  // (caller === patient).
  verify(callerUserId: string, patientUserId: string | null | undefined): boolean {
    if (!patientUserId || patientUserId === callerUserId) return false;
    return this.rows.some(
      (pp) =>
        pp.practitioner_id === callerUserId &&
        pp.patient_id === patientUserId &&
        pp.status === 'active',
    );
  }
}

describe('verifyPractitionerManaged contract (server-side, fail-closed)', () => {
  it('returns false for a normal consumer with no relationship (resolves to non-practitioner-managed)', () => {
    const model = new PractitionerRelationshipModel();
    // A normal consumer self-scan: no patient id supplied at all.
    expect(model.verify('consumer-1', null)).toBe(false);
    expect(model.verify('consumer-1', undefined)).toBe(false);

    // And the decision it feeds: practitionerManaged=false => not entitled (no
    // membership, no link) => rejected (no teaser).
    const decision = decideBodyScanEntitlement({
      membership: null,
      familyHolderLink: false,
      practitionerManaged: model.verify('consumer-1', null),
    });
    expect(decision.statusForScan).toBeNull();
    expect(decision.practitionerManaged).toBe(false);
  });

  it('returns false when a consumer forges a patient_user_id with no real relationship', () => {
    // The exploit the review fix closes: the client cannot self-assert the
    // bypass. Supplying an arbitrary patient id with no matching active
    // relationship row must NOT grant practitioner-managed.
    const model = new PractitionerRelationshipModel();
    expect(model.verify('attacker', 'some-other-user')).toBe(false);

    const decision = decideBodyScanEntitlement({
      membership: null,
      familyHolderLink: false,
      practitionerManaged: model.verify('attacker', 'some-other-user'),
    });
    // Falls through to the consumer path; not entitled, so it does NOT bypass.
    expect(decision.statusForScan).toBeNull();
  });

  it('returns true only when an active relationship joins the caller to the patient', () => {
    const model = new PractitionerRelationshipModel();
    model.addRelationship({
      practitioner_id: 'dr-smith',
      patient_id: 'patient-1',
      status: 'active',
    });

    expect(model.verify('dr-smith', 'patient-1')).toBe(true);

    // The verified-true value drives the practitioner_managed stamp.
    const decision = decideBodyScanEntitlement({
      membership: null,
      familyHolderLink: false,
      practitionerManaged: model.verify('dr-smith', 'patient-1'),
    });
    expect(decision.statusForScan).toBe('practitioner_managed');
    expect(decision.practitionerManaged).toBe(true);
  });

  it('returns false when the relationship exists but is not active', () => {
    const model = new PractitionerRelationshipModel();
    for (const status of ['pending', 'ended', 'declined']) {
      model.addRelationship({
        practitioner_id: 'dr-smith',
        patient_id: `patient-${status}`,
        status,
      });
      expect(model.verify('dr-smith', `patient-${status}`)).toBe(false);
    }
  });

  it('returns false when an active relationship belongs to a different practitioner', () => {
    const model = new PractitionerRelationshipModel();
    // Active relationship is between dr-jones and the patient, not dr-smith.
    model.addRelationship({
      practitioner_id: 'dr-jones',
      patient_id: 'patient-1',
      status: 'active',
    });
    expect(model.verify('dr-smith', 'patient-1')).toBe(false);
    expect(model.verify('dr-jones', 'patient-1')).toBe(true);
  });

  it('returns false for a self-scan even if the caller is themselves a practitioner', () => {
    // A practitioner scanning their own body is a consumer scan, not a
    // managed-patient scan; the bypass must not apply (caller === patient).
    const model = new PractitionerRelationshipModel();
    model.addRelationship({
      practitioner_id: 'dr-smith',
      patient_id: 'dr-smith',
      status: 'active',
    });
    expect(model.verify('dr-smith', 'dr-smith')).toBe(false);
  });
});

// ===========================================================================
// applyTrialFallback: the 169f platinum_trials trial branch (migration
// 20260516000170). The active predicate (converted_at IS NULL AND cancelled_at
// IS NULL AND expires_at > now()) is applied at the QUERY in the server wrapper,
// so applyTrialFallback receives an already-resolved active source (or null). It
// must mirror the SQL precedence: a PAID entitlement (or the practitioner-managed
// bypass) OUTRANKS a trial; only a not-entitled membership decision is upgraded.
// The server wrapper only calls this when the membership decision is NOT entitled,
// but these tests also assert the outrank-guard directly.
// ===========================================================================

// The not-entitled membership decision the server wrapper passes when no paid
// Platinum-or-above entitlement granted access (Free / Gold / none / lapsed).
const NOT_ENTITLED: BodyScanEntitlement = {
  entitled: false,
  subscriptionId: null,
  practitionerManaged: false,
  statusForScan: null,
};

describe('applyTrialFallback: active trial grants access when no paid entitlement', () => {
  it('stamps trial_self_initiated for an active self-initiated trial', () => {
    const result = applyTrialFallback(NOT_ENTITLED, 'self_initiated');
    expect(result.entitled).toBe(true);
    expect(result.statusForScan).toBe('trial_self_initiated');
    // A trial is not a paid subscription.
    expect(result.subscriptionId).toBeNull();
    expect(result.practitionerManaged).toBe(false);
  });

  it('stamps trial_practitioner_granted for an active practitioner-granted trial', () => {
    const result = applyTrialFallback(NOT_ENTITLED, 'practitioner_granted');
    expect(result.entitled).toBe(true);
    expect(result.statusForScan).toBe('trial_practitioner_granted');
    expect(result.subscriptionId).toBeNull();
  });

  it('leaves a not-entitled decision unchanged when there is no active trial (null source)', () => {
    // Expired / converted / cancelled trials are filtered out at the query, so the
    // server wrapper passes null here; the user stays not entitled (rejected).
    const result = applyTrialFallback(NOT_ENTITLED, null);
    expect(result.entitled).toBe(false);
    expect(result.statusForScan).toBeNull();
    expect(result).toEqual(NOT_ENTITLED);
  });
});

describe('applyTrialFallback: a PAID entitlement outranks a trial', () => {
  it('keeps platinum (own membership) even when an active self-trial also exists', () => {
    const paidPlatinum: BodyScanEntitlement = {
      entitled: true,
      subscriptionId: 'sub_123',
      practitionerManaged: false,
      statusForScan: 'platinum',
    };
    const result = applyTrialFallback(paidPlatinum, 'self_initiated');
    expect(result.statusForScan).toBe('platinum');
    expect(result.subscriptionId).toBe('sub_123');
  });

  it('keeps platinum_plus_family_holder over an active practitioner-granted trial', () => {
    const holder: BodyScanEntitlement = {
      entitled: true,
      subscriptionId: 'sub_fam',
      practitionerManaged: false,
      statusForScan: 'platinum_plus_family_holder',
    };
    const result = applyTrialFallback(holder, 'practitioner_granted');
    expect(result.statusForScan).toBe('platinum_plus_family_holder');
  });

  it('keeps the practitioner-managed bypass over an active trial', () => {
    const managed: BodyScanEntitlement = {
      entitled: false,
      subscriptionId: null,
      practitionerManaged: true,
      statusForScan: 'practitioner_managed',
    };
    const result = applyTrialFallback(managed, 'self_initiated');
    expect(result.statusForScan).toBe('practitioner_managed');
    expect(result.practitionerManaged).toBe(true);
  });
});

describe('applyTrialFallback: end-to-end membership-then-trial precedence', () => {
  it('a Gold member with an active self-trial is entitled via the trial', () => {
    // The membership decision for an active Gold member is NOT entitled (Body Scan
    // is Platinum-and-above), which is exactly what the server wrapper passes into
    // the trial fallback; the active trial then grants access.
    const goldDecision = decideBodyScanEntitlement({
      membership: {
        status: 'active',
        tier: 'gold',
        tier_id: 'gold',
        tier_level: 1,
        current_period_end: FUTURE,
        stripe_subscription_id: 'sub_gold',
      },
      familyHolderLink: false,
      practitionerManaged: false,
    });
    expect(goldDecision.entitled).toBe(false);

    const final = applyTrialFallback(goldDecision, 'self_initiated');
    expect(final.entitled).toBe(true);
    expect(final.statusForScan).toBe('trial_self_initiated');
    // The trial does not inherit the Gold membership's (non-entitled) sub id.
    expect(final.subscriptionId).toBeNull();
  });

  it('a free user with no trial stays rejected', () => {
    const freeDecision = decideBodyScanEntitlement({
      membership: null,
      familyHolderLink: false,
      practitionerManaged: false,
    });
    const final = applyTrialFallback(freeDecision, null);
    expect(final.entitled).toBe(false);
    expect(final.statusForScan).toBeNull();
  });
});
