// Prompt #105 — watermark + top-N consent + NDA gate + recipient resolver tests.

import { describe, it, expect } from 'vitest';
import {
  buildWatermarkFooterText,
  generateWatermarkToken,
  isValidWatermarkTokenShape,
  tokensMatch,
} from '@/lib/executiveReporting/distribution/watermarker';
import {
  redactTopNByConsent,
  type PractitionerStat,
} from '@/lib/executiveReporting/aggregation/topNConsentAggregator';
import {
  evaluateNDAGate,
} from '@/lib/executiveReporting/boardMembers/ndaGate';
import {
  resolveEligibleRecipients,
  isNDAOnFile,
} from '@/lib/executiveReporting/distribution/recipientResolver';

describe('watermark token (§5.2)', () => {
  it('generated tokens are 22 URL-safe chars', () => {
    for (let i = 0; i < 10; i += 1) {
      const t = generateWatermarkToken();
      expect(isValidWatermarkTokenShape(t)).toBe(true);
    }
  });

  it('tokens are unique across many generations', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 500; i += 1) tokens.add(generateWatermarkToken());
    expect(tokens.size).toBe(500);
  });

  it('tokensMatch is constant-time safe (length + equality)', () => {
    expect(tokensMatch('abcd123', 'abcd123')).toBe(true);
    expect(tokensMatch('abcd123', 'abcd124')).toBe(false);
    expect(tokensMatch('abcd', 'abcd123')).toBe(false);
  });

  it('footer text embeds recipient identity + timestamp + short token', () => {
    const text = buildWatermarkFooterText({
      recipientName: 'Jane Doe',
      recipientEmail: 'jane@example.com',
      distributedAtISO: '2026-04-20T12:00:00Z',
      token: 'abcdef0123456789-ABCDE',
    });
    expect(text).toContain('CONFIDENTIAL');
    expect(text).toContain('Jane Doe');
    expect(text).toContain('jane@example.com');
    expect(text).toContain('2026-04-20T12:00:00Z');
    expect(text).toContain('abcdef01'); // first 8 of token
    expect(text).not.toContain('9-ABCDE'); // NOT the full token
  });
});

describe('redactTopNByConsent — §4.5', () => {
  const stats: PractitionerStat[] = [
    { practitionerId: 'p1', displayName: 'Alpha', consentGranted: true, metricValueCents: 10000 },
    { practitionerId: 'p2', displayName: 'Bravo', consentGranted: false, metricValueCents: 9000 },
    { practitionerId: 'p3', displayName: 'Charlie', consentGranted: true, metricValueCents: 8000 },
    { practitionerId: 'p4', displayName: 'Delta', consentGranted: false, metricValueCents: 7000 },
    { practitionerId: 'p5', displayName: 'Echo', consentGranted: false, metricValueCents: 6000 },
  ];

  it('consenters rendered by name; non-consenters aggregated', () => {
    const rows = redactTopNByConsent(stats, 5);
    const names = rows.map((r) => r.displayName);
    expect(names).toContain('Alpha');
    expect(names).toContain('Charlie');
    expect(names).not.toContain('Bravo');
    expect(names).not.toContain('Delta');
    expect(names).not.toContain('Echo');
  });

  it('exactly one Other-practitioners bucket with correct count + total', () => {
    const rows = redactTopNByConsent(stats, 5);
    const buckets = rows.filter((r) => r.kind === 'other_bucket');
    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.practitionerCount).toBe(3);
    expect(buckets[0]!.metricValueCents).toBe(9000 + 7000 + 6000);
  });

  it('no practitioner_ids present on bucket rows', () => {
    const rows = redactTopNByConsent(stats, 5);
    const bucket = rows.find((r) => r.kind === 'other_bucket')!;
    expect(bucket.practitionerIds).toBeUndefined();
  });

  it('final order sorts by metric DESC regardless of kind', () => {
    const rows = redactTopNByConsent(stats, 5);
    for (let i = 0; i < rows.length - 1; i += 1) {
      expect(rows[i]!.metricValueCents).toBeGreaterThanOrEqual(rows[i + 1]!.metricValueCents);
    }
  });

  it('top-N = 2 still aggregates non-consenters in the window', () => {
    const rows = redactTopNByConsent(stats, 2);
    // top-2 = Alpha + Bravo; Bravo is non-consenter so bucket n=1
    expect(rows.find((r) => r.kind === 'practitioner')!.displayName).toBe('Alpha');
    const bucket = rows.find((r) => r.kind === 'other_bucket')!;
    expect(bucket.practitionerCount).toBe(1);
  });
});

describe('NDA gate — §3.3 bright line', () => {
  const now = new Date('2026-04-20T12:00:00Z');

  it('allows when NDA on file + not departed + not expired', () => {
    expect(evaluateNDAGate({
      ndaStatus: 'on_file',
      ndaExpiresAt: '2027-04-20',
      departureDate: null,
      accessRevokedAt: null,
      now,
    })).toBe('allow');
  });

  it('denies when nda_status is not on_file', () => {
    expect(evaluateNDAGate({
      ndaStatus: 'submitted',
      ndaExpiresAt: null,
      departureDate: null,
      accessRevokedAt: null,
      now,
    })).toBe('deny_not_on_file');
  });

  it('denies when NDA expired', () => {
    expect(evaluateNDAGate({
      ndaStatus: 'on_file',
      ndaExpiresAt: '2026-04-19',
      departureDate: null,
      accessRevokedAt: null,
      now,
    })).toBe('deny_expired');
  });

  it('denies on or after departure_date', () => {
    expect(evaluateNDAGate({
      ndaStatus: 'on_file',
      ndaExpiresAt: null,
      departureDate: '2026-04-20',
      accessRevokedAt: null,
      now,
    })).toBe('deny_departed');
  });

  it('denies when access revoked (regardless of NDA)', () => {
    expect(evaluateNDAGate({
      ndaStatus: 'on_file',
      ndaExpiresAt: null,
      departureDate: null,
      accessRevokedAt: '2026-04-19T00:00:00Z',
      now,
    })).toBe('deny_departed');
  });

  it('isNDAOnFile is explicit', () => {
    expect(isNDAOnFile('on_file')).toBe(true);
    expect(isNDAOnFile('submitted')).toBe(false);
    expect(isNDAOnFile('expired')).toBe(false);
  });
});

describe('resolveEligibleRecipients', () => {
  const base = {
    memberId: 'm1',
    displayName: 'Jane',
    role: 'director' as const,
    ndaStatus: 'on_file' as const,
    departureDate: null,
    boardReportingScope: ['quarterly', 'annual'],
    accessRevokedAt: null,
  };

  it('eligible when NDA on file + scope match + active', () => {
    const r = resolveEligibleRecipients([base], 'quarterly');
    expect(r.eligible).toHaveLength(1);
    expect(r.excluded).toEqual([]);
  });

  it('excludes non-on_file NDA', () => {
    const r = resolveEligibleRecipients(
      [{ ...base, ndaStatus: 'submitted' }],
      'quarterly',
    );
    expect(r.eligible).toHaveLength(0);
    expect(r.excluded[0]!.reason).toBe('nda_not_on_file');
  });

  it('excludes scope mismatch', () => {
    const r = resolveEligibleRecipients(
      [{ ...base, boardReportingScope: ['annual'] }],
      'monthly',
    );
    expect(r.eligible).toHaveLength(0);
    expect(r.excluded[0]!.reason).toBe('scope_mismatch');
  });

  it('excludes revoked access', () => {
    const r = resolveEligibleRecipients(
      [{ ...base, accessRevokedAt: '2026-04-01T00:00:00Z' }],
      'quarterly',
    );
    expect(r.excluded[0]!.reason).toBe('access_revoked');
  });
});
