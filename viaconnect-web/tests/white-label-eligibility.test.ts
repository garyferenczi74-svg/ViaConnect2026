// Prompt #96 Phase 2: Eligibility engine tests.

import { describe, it, expect } from 'vitest';
import {
  evaluateEligibility,
  VOLUME_THRESHOLD_CENTS,
  VOLUME_TENURE_MONTHS,
  type EligibilitySignals,
} from '@/lib/white-label/eligibility';

const NOW = new Date('2026-04-19T00:00:00.000Z');

function signals(over: Partial<EligibilitySignals> = {}): EligibilitySignals {
  return {
    now: NOW,
    activeMasterPractitionerCertification: null,
    activeWhiteLabelSubscription: null,
    practitionerOnboardedAt: null,
    accountStatus: 'active',
    lifetimeWholesaleCents: 0,
    ...over,
  };
}

describe('evaluateEligibility', () => {
  describe('Path 1 — certification', () => {
    it('qualifies when an active Master Practitioner cert is present', () => {
      const r = evaluateEligibility(signals({
        activeMasterPractitionerCertification: {
          id: 'cert_1',
          certified_at: '2025-06-01T00:00:00.000Z',
          expires_at: '2027-06-01T00:00:00.000Z',
          status: 'certified',
        },
      }));
      expect(r.is_eligible).toBe(true);
      expect(r.qualifying_paths).toContain('certification_level_3');
      expect(r.primary_path).toBe('certification_level_3');
      expect(r.evidence.certification).toBeDefined();
    });

    it('does NOT qualify when cert is expired', () => {
      const r = evaluateEligibility(signals({
        activeMasterPractitionerCertification: {
          id: 'cert_1',
          certified_at: '2023-06-01T00:00:00.000Z',
          expires_at: '2025-06-01T00:00:00.000Z', // before NOW
          status: 'certified',
        },
      }));
      expect(r.qualifying_paths).not.toContain('certification_level_3');
    });

    it('does NOT qualify when cert is revoked', () => {
      const r = evaluateEligibility(signals({
        activeMasterPractitionerCertification: {
          id: 'cert_1',
          certified_at: '2025-06-01T00:00:00.000Z',
          expires_at: '2027-06-01T00:00:00.000Z',
          status: 'revoked',
        },
      }));
      expect(r.qualifying_paths).not.toContain('certification_level_3');
    });
  });

  describe('Path 2 — White-Label tier subscription', () => {
    it('qualifies on an active subscription', () => {
      const r = evaluateEligibility(signals({
        activeWhiteLabelSubscription: {
          id: 'sub_1',
          tier_id: 'white_label',
          status: 'active',
          current_period_end: '2026-12-31T00:00:00.000Z',
        },
      }));
      expect(r.qualifying_paths).toContain('white_label_tier_subscription');
      expect(r.evidence.subscription).toBeDefined();
    });

    it('does NOT qualify when subscription is canceled', () => {
      const r = evaluateEligibility(signals({
        activeWhiteLabelSubscription: {
          id: 'sub_1',
          tier_id: 'white_label',
          status: 'canceled',
          current_period_end: '2026-12-31T00:00:00.000Z',
        },
      }));
      expect(r.qualifying_paths).not.toContain('white_label_tier_subscription');
    });
  });

  describe('Path 3 — volume threshold', () => {
    it('qualifies with 12+ months tenure and $25K+ wholesale volume', () => {
      const r = evaluateEligibility(signals({
        practitionerOnboardedAt: '2024-12-01T00:00:00.000Z', // > 12 months before NOW
        accountStatus: 'active',
        lifetimeWholesaleCents: VOLUME_THRESHOLD_CENTS, // exactly $25,000
      }));
      expect(r.qualifying_paths).toContain('volume_threshold');
      expect(r.evidence.volume).toMatchObject({
        lifetime_wholesale_cents: VOLUME_THRESHOLD_CENTS,
      });
    });

    it('does NOT qualify when tenure is under 12 months', () => {
      const r = evaluateEligibility(signals({
        practitionerOnboardedAt: '2025-08-01T00:00:00.000Z', // < 12 months before NOW
        accountStatus: 'active',
        lifetimeWholesaleCents: VOLUME_THRESHOLD_CENTS * 5,
      }));
      expect(r.qualifying_paths).not.toContain('volume_threshold');
    });

    it('does NOT qualify when volume is below $25K', () => {
      const r = evaluateEligibility(signals({
        practitionerOnboardedAt: '2024-01-01T00:00:00.000Z',
        accountStatus: 'active',
        lifetimeWholesaleCents: VOLUME_THRESHOLD_CENTS - 1,
      }));
      expect(r.qualifying_paths).not.toContain('volume_threshold');
    });

    it('does NOT qualify when account is suspended', () => {
      const r = evaluateEligibility(signals({
        practitionerOnboardedAt: '2024-01-01T00:00:00.000Z',
        accountStatus: 'suspended',
        lifetimeWholesaleCents: VOLUME_THRESHOLD_CENTS * 10,
      }));
      expect(r.qualifying_paths).not.toContain('volume_threshold');
    });

    it('VOLUME_TENURE_MONTHS is 12 per spec', () => {
      expect(VOLUME_TENURE_MONTHS).toBe(12);
    });

    it('VOLUME_THRESHOLD_CENTS is $25,000 per spec', () => {
      expect(VOLUME_THRESHOLD_CENTS).toBe(2_500_000);
    });
  });

  describe('OR logic', () => {
    it('returns ineligible when no path qualifies', () => {
      const r = evaluateEligibility(signals());
      expect(r.is_eligible).toBe(false);
      expect(r.qualifying_paths).toEqual([]);
      expect(r.primary_path).toBeNull();
      expect(r.reasons[0]).toMatch(/does not meet/i);
    });

    it('reports multiple qualifying paths when several apply (OR logic)', () => {
      const r = evaluateEligibility(signals({
        activeMasterPractitionerCertification: {
          id: 'cert_1', certified_at: '2025-06-01T00:00:00.000Z',
          expires_at: '2027-06-01T00:00:00.000Z', status: 'certified',
        },
        activeWhiteLabelSubscription: {
          id: 'sub_1', tier_id: 'white_label', status: 'active',
          current_period_end: '2026-12-31T00:00:00.000Z',
        },
      }));
      expect(r.is_eligible).toBe(true);
      expect(r.qualifying_paths.length).toBeGreaterThanOrEqual(2);
      expect(r.qualifying_paths).toContain('certification_level_3');
      expect(r.qualifying_paths).toContain('white_label_tier_subscription');
    });

    it('primary_path is the first qualifying path in the spec order (cert > tier > volume)', () => {
      const r = evaluateEligibility(signals({
        activeMasterPractitionerCertification: {
          id: 'cert_1', certified_at: '2025-06-01T00:00:00.000Z',
          expires_at: '2027-06-01T00:00:00.000Z', status: 'certified',
        },
        practitionerOnboardedAt: '2024-01-01T00:00:00.000Z',
        accountStatus: 'active',
        lifetimeWholesaleCents: VOLUME_THRESHOLD_CENTS * 2,
      }));
      expect(r.primary_path).toBe('certification_level_3');
    });

    it('emits a human-readable reason per qualifying path', () => {
      const r = evaluateEligibility(signals({
        activeWhiteLabelSubscription: {
          id: 'sub_1', tier_id: 'white_label', status: 'active',
          current_period_end: '2026-12-31T00:00:00.000Z',
        },
      }));
      expect(r.reasons.some((s) => /white-label/i.test(s))).toBe(true);
    });
  });
});
