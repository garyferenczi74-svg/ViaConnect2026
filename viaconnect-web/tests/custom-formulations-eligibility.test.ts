// Prompt #97 Phase 2.1: pure eligibility tests.
// Covers all branches of computeEligibility.

import { describe, it, expect } from 'vitest';
import { computeEligibility } from '@/lib/custom-formulations/eligibility';

describe('computeEligibility — dependency pending', () => {
  it('returns not-eligible with reason when dependencies are pending', () => {
    const r = computeEligibility({
      masterCertActive: false,
      deliveredLevel3OrderExists: false,
      dependencyPending: true,
    });
    expect(r.isEligible).toBe(false);
    expect(r.dependencyPending).toBe(true);
    expect(r.reasons.length).toBe(1);
    expect(r.reasons[0]).toMatch(/Prompt #91/);
    expect(r.reasons[0]).toMatch(/Prompt #96/);
  });
});

describe('computeEligibility — happy path', () => {
  it('AND logic: both requirements satisfied = eligible', () => {
    const r = computeEligibility({
      masterCertActive: true,
      masterCert: {
        id: 'cert-1',
        certifiedAt: '2027-01-01T00:00:00Z',
        expiresAt: '2028-01-01T00:00:00Z',
      },
      deliveredLevel3OrderExists: true,
      deliveredOrder: {
        id: 'order-1',
        deliveredAt: '2027-06-01T00:00:00Z',
        orderNumber: 'WL-0042',
      },
    });
    expect(r.isEligible).toBe(true);
    expect(r.dependencyPending).toBe(false);
    expect(r.reasons).toContain('Master Practitioner certification verified');
    expect(r.evidence.certification?.id).toBe('cert-1');
    expect(r.evidence.deliveredOrder?.orderNumber).toBe('WL-0042');
  });
});

describe('computeEligibility — missing requirements', () => {
  it('cert missing blocks eligibility', () => {
    const r = computeEligibility({
      masterCertActive: false,
      deliveredLevel3OrderExists: true,
      deliveredOrder: {
        id: 'order-1',
        deliveredAt: '2027-06-01',
        orderNumber: 'WL-0001',
      },
    });
    expect(r.isEligible).toBe(false);
    expect(r.reasons.some((x) => x.includes('Master Practitioner certification required'))).toBe(true);
  });

  it('delivered order missing blocks eligibility', () => {
    const r = computeEligibility({
      masterCertActive: true,
      masterCert: {
        id: 'cert-1',
        certifiedAt: '2027-01-01',
        expiresAt: '2028-01-01',
      },
      deliveredLevel3OrderExists: false,
    });
    expect(r.isEligible).toBe(false);
    expect(r.reasons.some((x) => x.includes('delivered Level 3 white-label'))).toBe(true);
  });

  it('both missing blocks with both reasons', () => {
    const r = computeEligibility({
      masterCertActive: false,
      deliveredLevel3OrderExists: false,
    });
    expect(r.isEligible).toBe(false);
    expect(r.reasons).toHaveLength(2);
    expect(r.reasons.some((x) => x.includes('certification'))).toBe(true);
    expect(r.reasons.some((x) => x.includes('delivered'))).toBe(true);
  });

  it('cert present but cert evidence undefined does not expose evidence', () => {
    const r = computeEligibility({
      masterCertActive: true,
      deliveredLevel3OrderExists: true,
    });
    expect(r.isEligible).toBe(true);
    expect(r.evidence.certification).toBeUndefined();
    expect(r.evidence.deliveredOrder).toBeUndefined();
  });
});

describe('computeEligibility — AND not OR (distinguishes Level 4 from Level 3)', () => {
  it('cert only is insufficient', () => {
    const r = computeEligibility({
      masterCertActive: true,
      deliveredLevel3OrderExists: false,
    });
    expect(r.isEligible).toBe(false);
  });

  it('delivered order only is insufficient', () => {
    const r = computeEligibility({
      masterCertActive: false,
      deliveredLevel3OrderExists: true,
    });
    expect(r.isEligible).toBe(false);
  });

  it('neither is insufficient', () => {
    const r = computeEligibility({
      masterCertActive: false,
      deliveredLevel3OrderExists: false,
    });
    expect(r.isEligible).toBe(false);
  });
});
