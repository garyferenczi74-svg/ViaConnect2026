// Prompt #104 Phase 1: Counterparty identity scoring + merge tests.
// Critical hard-stop: AI-inferred identifier alone does not produce
// a counterparty record (spec §3.3 + §15).

import { describe, it, expect } from 'vitest';
import {
  scoreCounterpartyIdentity,
  recommendCounterpartyMerge,
  type CounterpartyIdentifierBundle,
} from '@/lib/legal/counterparties/identityScoring';

const empty = (): CounterpartyIdentifierBundle => ({
  verified_business_reg_id: null,
  verified_domain: null,
  marketplace_handles_admin_confirmed: [],
  payment_identity_present: false,
  self_identified_only: false,
  ai_inferred_identifier_only: false,
});

describe('scoreCounterpartyIdentity', () => {
  it('blocks AI-only identifier with no human verification (HARD STOP)', () => {
    const r = scoreCounterpartyIdentity({ ...empty(), ai_inferred_identifier_only: true });
    expect(r.ai_only_blocked).toBe(true);
    expect(r.human_verified).toBe(false);
    expect(r.confidence).toBe(0);
  });

  it('does not block AI inference when paired with verified business reg', () => {
    const r = scoreCounterpartyIdentity({
      ...empty(),
      ai_inferred_identifier_only: true,
      verified_business_reg_id: 'DE-1234567',
    });
    expect(r.ai_only_blocked).toBe(false);
    expect(r.highest_tier).toBe(1);
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('scores tier-1 (verified business reg) at 0.95', () => {
    const r = scoreCounterpartyIdentity({ ...empty(), verified_business_reg_id: 'DE-1234567' });
    expect(r.confidence).toBe(0.95);
    expect(r.highest_tier).toBe(1);
    expect(r.human_verified).toBe(true);
  });

  it('scores tier-2 (verified domain) at 0.85', () => {
    const r = scoreCounterpartyIdentity({ ...empty(), verified_domain: 'acmesupplements.com' });
    expect(r.confidence).toBe(0.85);
    expect(r.highest_tier).toBe(2);
  });

  it('scores tier-3 (admin-confirmed marketplace handle) at 0.75', () => {
    const r = scoreCounterpartyIdentity({
      ...empty(),
      marketplace_handles_admin_confirmed: [
        { platform: 'amazon', handle: 'AcmeSupplyCo', admin_confirmed: true },
      ],
    });
    expect(r.confidence).toBe(0.75);
    expect(r.highest_tier).toBe(3);
  });

  it('does not credit tier-3 when admin has not confirmed the handle', () => {
    const r = scoreCounterpartyIdentity({
      ...empty(),
      marketplace_handles_admin_confirmed: [
        { platform: 'amazon', handle: 'AcmeSupplyCo', admin_confirmed: false },
      ],
    });
    expect(r.confidence).toBe(0);
    expect(r.human_verified).toBe(false);
  });

  it('caps self-identified-only at 0.40 (below the 0.49 unverified ceiling)', () => {
    const r = scoreCounterpartyIdentity({ ...empty(), self_identified_only: true });
    expect(r.confidence).toBeLessThanOrEqual(0.49);
    expect(r.human_verified).toBe(false);
  });

  it('prefers the strongest available identifier when several are present', () => {
    const r = scoreCounterpartyIdentity({
      ...empty(),
      verified_business_reg_id: 'DE-1234567',
      verified_domain: 'acmesupplements.com',
      marketplace_handles_admin_confirmed: [{ platform: 'amazon', handle: 'AcmeSupplyCo', admin_confirmed: true }],
      payment_identity_present: true,
    });
    expect(r.highest_tier).toBe(1);
    expect(r.confidence).toBe(0.95);
  });
});

describe('recommendCounterpartyMerge', () => {
  it('auto-merges on matching tier-1 business reg', () => {
    const a = { ...empty(), verified_business_reg_id: 'DE-1234567' };
    const b = { ...empty(), verified_business_reg_id: 'DE-1234567' };
    expect(recommendCounterpartyMerge({ a, b })).toEqual({
      recommendation: 'auto_merge', reason: 'tier_1_business_reg_match',
    });
  });

  it('auto-merges on matching tier-2 domain (case-insensitive)', () => {
    const a = { ...empty(), verified_domain: 'AcmeSupplements.com' };
    const b = { ...empty(), verified_domain: 'acmesupplements.com' };
    expect(recommendCounterpartyMerge({ a, b }).recommendation).toBe('auto_merge');
  });

  it('flags admin review on matching tier-3 handle', () => {
    const a = {
      ...empty(),
      marketplace_handles_admin_confirmed: [{ platform: 'amazon', handle: 'AcmeSupplyCo', admin_confirmed: true }],
    };
    const b = {
      ...empty(),
      marketplace_handles_admin_confirmed: [{ platform: 'amazon', handle: 'acmesupplyco', admin_confirmed: true }],
    };
    const r = recommendCounterpartyMerge({ a, b });
    expect(r.recommendation).toBe('admin_review_required');
    expect(r.reason).toBe('tier_3_handle_match');
  });

  it('does not auto-merge when tier-3 handle is unconfirmed by admin', () => {
    const a = {
      ...empty(),
      marketplace_handles_admin_confirmed: [{ platform: 'amazon', handle: 'AcmeSupplyCo', admin_confirmed: false }],
    };
    const b = {
      ...empty(),
      marketplace_handles_admin_confirmed: [{ platform: 'amazon', handle: 'AcmeSupplyCo', admin_confirmed: false }],
    };
    expect(recommendCounterpartyMerge({ a, b }).recommendation).toBe('do_not_auto_merge');
  });

  it('does not auto-merge with no overlap', () => {
    const a = { ...empty(), verified_domain: 'acmesupplements.com' };
    const b = { ...empty(), verified_domain: 'differentdomain.com' };
    expect(recommendCounterpartyMerge({ a, b }).recommendation).toBe('do_not_auto_merge');
  });
});
