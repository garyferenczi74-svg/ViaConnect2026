// Prompt #105 — CFO → CEO approval-chain tests.

import { describe, it, expect } from 'vitest';
import {
  CEO_ISSUE_CONFIRMATION_PHRASE,
  cfoApprovalPrecheck,
  ceoIssuePrecheck,
  validateCEOIssueConfirmation,
} from '@/lib/executiveReporting/packs/approvalChain';

describe('CEO issue confirmation', () => {
  it('phrase is exact, case-sensitive', () => {
    expect(CEO_ISSUE_CONFIRMATION_PHRASE).toBe('ISSUE PACK');
    expect(validateCEOIssueConfirmation('ISSUE PACK')).toBe(true);
    expect(validateCEOIssueConfirmation('issue pack')).toBe(false);
    expect(validateCEOIssueConfirmation('ISSUE PACK ')).toBe(false);
    expect(validateCEOIssueConfirmation('ISSUE  PACK')).toBe(false);
  });
});

describe('cfoApprovalPrecheck', () => {
  it('succeeds when in cfo_review + all sections approved', () => {
    expect(cfoApprovalPrecheck({
      currentState: 'cfo_review',
      mdnaSectionsAllCFOApproved: true,
    })).toBeNull();
  });

  it('fails when not in cfo_review', () => {
    expect(cfoApprovalPrecheck({
      currentState: 'mdna_drafted',
      mdnaSectionsAllCFOApproved: true,
    })).toBe('PACK_NOT_IN_CFO_REVIEW');
  });

  it('fails when sections not all approved', () => {
    expect(cfoApprovalPrecheck({
      currentState: 'cfo_review',
      mdnaSectionsAllCFOApproved: false,
    })).toBe('CFO_APPROVAL_MISSING');
  });
});

describe('ceoIssuePrecheck (§3.7 bright-line)', () => {
  const base = {
    currentState: 'pending_ceo_approval' as const,
    cfoApprovedAt: '2026-04-20T12:00:00Z',
    typedConfirmation: 'ISSUE PACK',
    actorHasCEORole: true,
  };

  it('succeeds when all gates pass', () => {
    expect(ceoIssuePrecheck(base)).toBeNull();
  });

  it('never issues without CFO approval on file', () => {
    expect(ceoIssuePrecheck({ ...base, cfoApprovedAt: null })).toBe('CFO_APPROVAL_MISSING');
  });

  it('never issues without CEO role', () => {
    expect(ceoIssuePrecheck({ ...base, actorHasCEORole: false })).toBe('MISSING_CEO_ROLE');
  });

  it('never issues with wrong confirmation text', () => {
    expect(ceoIssuePrecheck({ ...base, typedConfirmation: 'issue' })).toBe('CEO_CONFIRMATION_TEXT_MISMATCH');
    expect(ceoIssuePrecheck({ ...base, typedConfirmation: '' })).toBe('CEO_CONFIRMATION_TEXT_MISMATCH');
  });

  it('never issues if pack is not in pending_ceo_approval', () => {
    expect(ceoIssuePrecheck({ ...base, currentState: 'cfo_approved' })).toBe('PACK_NOT_IN_PENDING_CEO_APPROVAL');
    expect(ceoIssuePrecheck({ ...base, currentState: 'issued' })).toBe('PACK_NOT_IN_PENDING_CEO_APPROVAL');
  });
});
