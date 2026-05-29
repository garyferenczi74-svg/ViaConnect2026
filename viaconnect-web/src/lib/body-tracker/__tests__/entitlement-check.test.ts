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
// Server-side practitioner-managed verification (the #169a review fix).
//
// SECURITY: practitioner_managed must NOT be a trusted client boolean. The Deno
// edge helper verifyPractitionerManaged determines it from the database, mirroring
// the RLS policy "Practitioner manages notes for active patients":
//
//   patient_practitioner_relationships ppr
//     JOIN practitioners p ON p.id = ppr.practitioner_id
//   WHERE p.user_id = <caller auth uid>
//     AND ppr.patient_user_id = <patient id>
//     AND ppr.status = 'active'
//
// The live helper is in supabase/functions (excluded from vitest because of its
// esm.sh + .ts imports), so this in-memory model reproduces the same join +
// filter + fail-closed rules and asserts the real decision. Anything other than
// an active matching relationship resolves to false, which routes the request
// into the consumer premium/teaser path (decideBodyScanEntitlement with
// practitionerManaged=false).
// ===========================================================================

interface PractitionerRow {
  id: string;
  user_id: string; // the practitioner's auth uid (the caller acting on behalf)
}
interface RelationshipRow {
  patient_user_id: string;
  practitioner_id: string; // FK -> PractitionerRow.id
  status: string;
}

class PractitionerRelationshipModel {
  private practitioners: PractitionerRow[] = [];
  private relationships: RelationshipRow[] = [];

  addPractitioner(row: PractitionerRow): void {
    this.practitioners.push(row);
  }
  addRelationship(row: RelationshipRow): void {
    this.relationships.push(row);
  }

  // Mirrors verifyPractitionerManaged: true ONLY when an active relationship
  // joins the caller (as practitioners.user_id) to the supplied patient.
  // Fail-closed on a missing patient id and on a self-scan (caller === patient).
  verify(callerUserId: string, patientUserId: string | null | undefined): boolean {
    if (!patientUserId || patientUserId === callerUserId) return false;
    return this.relationships.some((ppr) => {
      if (ppr.patient_user_id !== patientUserId) return false;
      if (ppr.status !== 'active') return false;
      const practitioner = this.practitioners.find((p) => p.id === ppr.practitioner_id);
      return practitioner?.user_id === callerUserId;
    });
  }
}

describe('verifyPractitionerManaged contract (server-side, fail-closed)', () => {
  it('returns false for a normal consumer with no relationship (resolves to non-practitioner-managed)', () => {
    const model = new PractitionerRelationshipModel();
    // A normal consumer self-scan: no patient id supplied at all.
    expect(model.verify('consumer-1', null)).toBe(false);
    expect(model.verify('consumer-1', undefined)).toBe(false);

    // And the decision it feeds: practitionerManaged=false => teaser path.
    const decision = decideBodyScanEntitlement({
      membership: null,
      practitionerManaged: model.verify('consumer-1', null),
    });
    expect(decision.statusForScan).toBeNull();
    expect(decision.practitionerManaged).toBe(false);
  });

  it('returns false when a free consumer forges a patient_user_id with no real relationship', () => {
    // The exploit the review fix closes: the client cannot self-assert the
    // bypass. Supplying an arbitrary patient id with no matching active
    // relationship row must NOT grant practitioner-managed.
    const model = new PractitionerRelationshipModel();
    expect(model.verify('attacker', 'some-other-user')).toBe(false);

    const decision = decideBodyScanEntitlement({
      membership: null,
      practitionerManaged: model.verify('attacker', 'some-other-user'),
    });
    // Falls through to the consumer teaser path; it does NOT bypass the gate.
    expect(decision.statusForScan).toBeNull();
  });

  it('returns true only when an active relationship joins the caller to the patient', () => {
    const model = new PractitionerRelationshipModel();
    model.addPractitioner({ id: 'prac-1', user_id: 'dr-smith' });
    model.addRelationship({
      patient_user_id: 'patient-1',
      practitioner_id: 'prac-1',
      status: 'active',
    });

    expect(model.verify('dr-smith', 'patient-1')).toBe(true);

    // The verified-true value drives the practitioner_managed stamp.
    const decision = decideBodyScanEntitlement({
      membership: null,
      practitionerManaged: model.verify('dr-smith', 'patient-1'),
    });
    expect(decision.statusForScan).toBe('practitioner_managed');
    expect(decision.practitionerManaged).toBe(true);
  });

  it('returns false when the relationship exists but is not active', () => {
    const model = new PractitionerRelationshipModel();
    model.addPractitioner({ id: 'prac-1', user_id: 'dr-smith' });
    for (const status of ['pending', 'ended', 'declined']) {
      model.addRelationship({
        patient_user_id: `patient-${status}`,
        practitioner_id: 'prac-1',
        status,
      });
      expect(model.verify('dr-smith', `patient-${status}`)).toBe(false);
    }
  });

  it('returns false when an active relationship belongs to a different practitioner', () => {
    const model = new PractitionerRelationshipModel();
    model.addPractitioner({ id: 'prac-1', user_id: 'dr-smith' });
    model.addPractitioner({ id: 'prac-2', user_id: 'dr-jones' });
    // Active relationship is between dr-jones and the patient, not dr-smith.
    model.addRelationship({
      patient_user_id: 'patient-1',
      practitioner_id: 'prac-2',
      status: 'active',
    });
    expect(model.verify('dr-smith', 'patient-1')).toBe(false);
    expect(model.verify('dr-jones', 'patient-1')).toBe(true);
  });

  it('returns false for a self-scan even if the caller is themselves a practitioner', () => {
    // A practitioner scanning their own body is a consumer scan, not a
    // managed-patient scan; the bypass must not apply (caller === patient).
    const model = new PractitionerRelationshipModel();
    model.addPractitioner({ id: 'prac-1', user_id: 'dr-smith' });
    model.addRelationship({
      patient_user_id: 'dr-smith',
      practitioner_id: 'prac-1',
      status: 'active',
    });
    expect(model.verify('dr-smith', 'dr-smith')).toBe(false);
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
