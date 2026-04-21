// Prompt #104 Phase 1: Budget approval chain + settlement tier tests.
// Critical hard-stops:
//   - >= $5,000 outside counsel engagement requires CFO approval
//   - >= $25,000 outside counsel engagement requires CEO approval
//   - Settlement tier mirrors the same boundaries

import { describe, it, expect } from 'vitest';
import {
  approversForEngagementBudget,
  CFO_THRESHOLD_CENTS,
  CEO_THRESHOLD_CENTS,
} from '@/lib/legal/counsel/budgetApprovalChain';
import { settlementApprovalTierForAmount } from '@/lib/legal/settlement/approvalTierResolver';

describe('approversForEngagementBudget', () => {
  it('requires only compliance for budgets under $5,000', () => {
    const r = approversForEngagementBudget(499_900);   // $4,999
    expect(r.cfo_required).toBe(false);
    expect(r.ceo_required).toBe(false);
    expect(r.required_approver_roles).toEqual(['compliance_officer']);
  });

  it('requires CFO for $5,000 boundary (HARD STOP)', () => {
    const r = approversForEngagementBudget(CFO_THRESHOLD_CENTS);
    expect(r.cfo_required).toBe(true);
    expect(r.ceo_required).toBe(false);
    expect(r.required_approver_roles).toEqual(['compliance_officer', 'cfo']);
  });

  it('requires CFO for $5,000 to $24,999 inclusive', () => {
    const r = approversForEngagementBudget(2_499_900);  // $24,999
    expect(r.cfo_required).toBe(true);
    expect(r.ceo_required).toBe(false);
  });

  it('requires CEO for $25,000 boundary (HARD STOP)', () => {
    const r = approversForEngagementBudget(CEO_THRESHOLD_CENTS);
    expect(r.cfo_required).toBe(true);
    expect(r.ceo_required).toBe(true);
    expect(r.required_approver_roles).toEqual(['compliance_officer', 'cfo', 'ceo']);
  });

  it('requires CEO for $25,001+', () => {
    const r = approversForEngagementBudget(2_500_100);
    expect(r.ceo_required).toBe(true);
  });

  it('throws on negative budget', () => {
    expect(() => approversForEngagementBudget(-1)).toThrow(/non-negative/);
  });

  it('treats zero as compliance-only', () => {
    const r = approversForEngagementBudget(0);
    expect(r.required_approver_roles).toEqual(['compliance_officer']);
  });
});

describe('settlementApprovalTierForAmount', () => {
  it('returns compliance_only for amounts under $5,000', () => {
    expect(settlementApprovalTierForAmount(499_900).tier).toBe('compliance_only');
  });

  it('returns compliance_plus_cfo for $5,000 boundary (HARD STOP)', () => {
    const r = settlementApprovalTierForAmount(500_000);
    expect(r.tier).toBe('compliance_plus_cfo');
    expect(r.required_approver_roles).toEqual(['compliance_officer', 'cfo']);
  });

  it('returns compliance_plus_cfo for $5,000 to $24,999', () => {
    expect(settlementApprovalTierForAmount(2_499_900).tier).toBe('compliance_plus_cfo');
  });

  it('returns compliance_plus_cfo_plus_ceo for $25,000 boundary (HARD STOP)', () => {
    const r = settlementApprovalTierForAmount(2_500_000);
    expect(r.tier).toBe('compliance_plus_cfo_plus_ceo');
    expect(r.required_approver_roles).toEqual(['compliance_officer', 'cfo', 'ceo']);
  });

  it('returns compliance_plus_cfo_plus_ceo for huge settlements', () => {
    expect(settlementApprovalTierForAmount(50_000_000).tier).toBe('compliance_plus_cfo_plus_ceo');
  });

  it('throws on negative amount', () => {
    expect(() => settlementApprovalTierForAmount(-1)).toThrow(/non-negative/);
  });
});
