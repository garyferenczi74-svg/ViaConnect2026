// Prompt #104 Phase 6: Counsel routing + briefing packet tests.

import { describe, it, expect } from 'vitest';
import { scoreCounselForCase, rankCounselForCase, type CounselCandidate } from '@/lib/legal/counsel/routingEngine';
import { buildBriefingPacketMarkdown } from '@/lib/legal/counsel/briefingPacketBuilder';

const ipDeFirm: CounselCandidate = {
  counsel_id: 'c-1', firm_name: 'IP Firm A', attorney_name: 'Attorney A',
  specialty: ['ip_litigation', 'trademark_prosecution'],
  jurisdictions: ['US-DE', 'US-NY'],
  active: true,
  billing_rate_cents: 95000,
};
const fdaCaFirm: CounselCandidate = {
  counsel_id: 'c-2', firm_name: 'FDA Firm B', attorney_name: 'Attorney B',
  specialty: ['fda_regulatory'],
  jurisdictions: ['US-CA'],
  active: true,
  billing_rate_cents: 70000,
};
const inactiveFirm: CounselCandidate = {
  counsel_id: 'c-3', firm_name: 'Inactive Firm', attorney_name: 'Attorney C',
  specialty: ['ip_litigation'], jurisdictions: ['US-DE'],
  active: false,
  billing_rate_cents: 60000,
};

describe('scoreCounselForCase', () => {
  it('returns 0 score for inactive counsel', () => {
    const r = scoreCounselForCase({ jurisdiction: 'US-DE', required_specialties: ['ip_litigation'], bucket: 'counterfeit' }, inactiveFirm);
    expect(r.score).toBe(0);
    expect(r.reasons).toContain('inactive');
  });

  it('scores exact-jurisdiction + matched-specialty highly', () => {
    const r = scoreCounselForCase({ jurisdiction: 'US-DE', required_specialties: ['ip_litigation'], bucket: 'counterfeit' }, ipDeFirm);
    expect(r.jurisdiction_match).toBe('exact');
    expect(r.specialty_match_count).toBe(1);
    expect(r.score).toBe(75);   // 50 jurisdiction + 25 specialty
  });

  it('scores same-country-different-state lower than exact', () => {
    const r = scoreCounselForCase({ jurisdiction: 'US-CA', required_specialties: ['ip_litigation'], bucket: 'counterfeit' }, ipDeFirm);
    expect(r.jurisdiction_match).toBe('state_country');
    expect(r.score).toBe(55);   // 30 jurisdiction + 25 specialty
  });

  it('caps specialty bonus at 50 even with many matches', () => {
    const big: CounselCandidate = {
      ...ipDeFirm,
      specialty: ['ip_litigation', 'fda_regulatory', 'international_commercial', 'trademark_prosecution'],
    };
    const r = scoreCounselForCase({
      jurisdiction: 'US-DE',
      required_specialties: ['ip_litigation', 'fda_regulatory', 'international_commercial', 'trademark_prosecution'],
      bucket: 'counterfeit',
    }, big);
    expect(r.specialty_match_count).toBe(4);
    expect(r.score).toBe(100);  // 50 + 50 cap
  });

  it('returns 0 specialty score when no required specialty matches', () => {
    const r = scoreCounselForCase({ jurisdiction: 'US-CA', required_specialties: ['ip_litigation'], bucket: 'counterfeit' }, fdaCaFirm);
    expect(r.specialty_match_count).toBe(0);
    expect(r.score).toBe(50);   // 50 jurisdiction + 0 specialty
  });
});

describe('rankCounselForCase', () => {
  it('sorts by score descending and excludes inactive at the bottom', () => {
    const ranked = rankCounselForCase(
      { jurisdiction: 'US-DE', required_specialties: ['ip_litigation'], bucket: 'counterfeit' },
      [fdaCaFirm, ipDeFirm, inactiveFirm],
    );
    expect(ranked[0].counsel_id).toBe('c-1');
    expect(ranked[ranked.length - 1].counsel_id).toBe('c-3');
  });
});

describe('buildBriefingPacketMarkdown', () => {
  const baseInput = (): import('@/lib/legal/counsel/briefingPacketBuilder').BriefingPacketInput => ({
    case_label: 'LEG-2026-000042',
    prepared_at_iso: '2026-04-23T12:00:00Z',
    bucket: 'gray_market_material_differences',
    bucket_confidence_score: 0.87,
    estimated_damages_cents: 4_210_000,
    counterparty: {
      display_label: 'Acme Supplements LLC',
      counterparty_type: 'llc',
      primary_jurisdiction: 'US-DE',
      verified_business_reg_id: 'DE-1234567',
      verified_domain: 'acmesupplements.com',
      total_cases_count: 3,
      total_settlement_cents: 1_500_000,
    },
    enforcement_history: [{ occurred_at_iso: '2026-04-15T00:00:00Z', description: 'C&D sent' }],
    evidence_summary: [{
      artifact_type: 'page_screenshot',
      captured_at_iso: '2026-04-12T10:00:00Z',
      sha256: 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd',
      description: 'Initial listing capture',
    }],
    documented_material_differences: [{ category: 'warranty', description: 'Warranty void per §3.2' }],
    affected_orders_count_aggregate: 17,
    affected_revenue_cents_aggregate: 4_210_000,
    approved_budget_cents: 1_500_000,
    cfo_approver_label: 'Domenic Romeo',
    ceo_approver_label: null,
    suggested_action_plan: ['Amazon Brand Registry complaint', 'eBay VeRO filing'],
  });

  it('contains the privileged stamp and case label', () => {
    const md = buildBriefingPacketMarkdown(baseInput());
    expect(md).toMatch(/CONFIDENTIAL:?\s*ATTORNEY-CLIENT PRIVILEGED/i);
    expect(md).toContain('LEG-2026-000042');
  });

  it('lists evidence with truncated sha256 prefix', () => {
    const md = buildBriefingPacketMarkdown(baseInput());
    expect(md).toMatch(/sha256:\s*abc123def456abc1\.\.\./);
  });

  it('shows aggregate-only customer impact (no individual PII)', () => {
    const md = buildBriefingPacketMarkdown(baseInput());
    expect(md).toMatch(/aggregate, no PII/);
    expect(md).toContain('17 orders');
  });

  it('renders "unknown" when budget not yet approved', () => {
    const i = baseInput();
    i.approved_budget_cents = null;
    const md = buildBriefingPacketMarkdown(i);
    expect(md).toMatch(/Approved outside counsel budget: unknown/);
  });

  it('lists all suggested action plan items in order', () => {
    const md = buildBriefingPacketMarkdown(baseInput());
    expect(md.indexOf('1. Amazon Brand Registry')).toBeLessThan(md.indexOf('2. eBay VeRO'));
  });
});
