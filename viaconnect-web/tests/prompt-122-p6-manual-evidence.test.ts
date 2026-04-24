import { describe, it, expect } from 'vitest';
import {
  classifyFreshness,
  classifyMany,
  countByFreshness,
  needsAttention,
  EXPIRING_SOON_DAYS,
} from '@/lib/soc2/manualEvidence/freshness';
import type { ManualEvidenceRow } from '@/lib/soc2/manualEvidence/types';
import { buildStorageKey } from '@/lib/soc2/manualEvidence/upload';

const NOW = new Date('2026-04-24T00:00:00Z');

function mk(partial: Partial<ManualEvidenceRow>): ManualEvidenceRow {
  return {
    id: 'row-1',
    title: 'Test policy',
    storageKey: '2026/04/test_policy-abc123.pdf',
    sha256: 'a'.repeat(64),
    sizeBytes: 1024,
    contentType: 'application/pdf',
    controls: ['CC1.4'],
    validFrom: null,
    validUntil: null,
    sourceDescription: 'Test',
    uploadedBy: 'user-1',
    uploadedAt: '2026-04-01T00:00:00Z',
    signoffBy: 'user-1',
    signoffAt: '2026-04-02T00:00:00Z',
    supersededBy: null,
    archived: false,
    archivedAt: null,
    ...partial,
  };
}

describe('freshness classifier', () => {
  it('archived row → archived regardless of signoff/expiry', () => {
    const r = mk({ archived: true, archivedAt: '2026-04-20T00:00:00Z' });
    expect(classifyFreshness(r, { now: NOW }).state).toBe('archived');
  });

  it('valid_until in the past → expired', () => {
    const r = mk({ validUntil: '2026-04-01' });
    const out = classifyFreshness(r, { now: NOW });
    expect(out.state).toBe('expired');
    expect(out.daysUntilExpiry).toBeLessThan(0);
  });

  it('valid_until within 30 days → expiring_soon', () => {
    const r = mk({ validUntil: '2026-05-15' });
    const out = classifyFreshness(r, { now: NOW });
    expect(out.state).toBe('expiring_soon');
    expect(out.daysUntilExpiry).toBeLessThanOrEqual(EXPIRING_SOON_DAYS);
  });

  it('valid_until far future + signed off → fresh', () => {
    const r = mk({ validUntil: '2027-04-01' });
    expect(classifyFreshness(r, { now: NOW }).state).toBe('fresh');
  });

  it('signoff_at unset → needs_signoff (takes precedence over fresh)', () => {
    const r = mk({ signoffAt: null, signoffBy: null, validUntil: '2027-01-01' });
    expect(classifyFreshness(r, { now: NOW }).state).toBe('needs_signoff');
  });

  it('expired still wins over needs_signoff', () => {
    const r = mk({ signoffAt: null, signoffBy: null, validUntil: '2026-01-01' });
    expect(classifyFreshness(r, { now: NOW }).state).toBe('expired');
  });

  it('no valid_until + uploaded > 365 days ago → stale', () => {
    const r = mk({ validUntil: null, uploadedAt: '2025-01-01T00:00:00Z' });
    expect(classifyFreshness(r, { now: NOW }).state).toBe('stale');
  });

  it('no valid_until + uploaded recent → fresh', () => {
    const r = mk({ validUntil: null, uploadedAt: '2026-03-01T00:00:00Z' });
    expect(classifyFreshness(r, { now: NOW }).state).toBe('fresh');
  });

  it('daysUntilExpiry computed as positive when future', () => {
    const r = mk({ validUntil: '2026-05-01' });
    expect(classifyFreshness(r, { now: NOW }).daysUntilExpiry).toBe(7);
  });

  it('custom expiringSoonDays honored', () => {
    const r = mk({ validUntil: '2026-05-25' });
    // default 30 → fresh; override 60 → expiring_soon
    expect(classifyFreshness(r, { now: NOW }).state).toBe('fresh');
    expect(classifyFreshness(r, { now: NOW, expiringSoonDays: 60 }).state).toBe('expiring_soon');
  });
});

describe('classifyMany / countByFreshness / needsAttention', () => {
  const rows: ManualEvidenceRow[] = [
    mk({ id: 'a', validUntil: '2027-01-01' }),                                           // fresh
    mk({ id: 'b', validUntil: '2026-05-10' }),                                           // expiring_soon
    mk({ id: 'c', validUntil: '2026-01-01' }),                                           // expired
    mk({ id: 'd', signoffAt: null, signoffBy: null, validUntil: '2027-01-01' }),         // needs_signoff
    mk({ id: 'e', validUntil: null, uploadedAt: '2024-12-01T00:00:00Z' }),               // stale
    mk({ id: 'f', archived: true, archivedAt: '2026-04-22T00:00:00Z' }),                 // archived
  ];

  it('counts each state correctly', () => {
    const classified = classifyMany(rows, { now: NOW });
    const counts = countByFreshness(classified);
    expect(counts.total).toBe(6);
    expect(counts.fresh).toBe(1);
    expect(counts.expiring_soon).toBe(1);
    expect(counts.expired).toBe(1);
    expect(counts.needs_signoff).toBe(1);
    expect(counts.stale).toBe(1);
    expect(counts.archived).toBe(1);
  });

  it('needsAttention excludes fresh + archived', () => {
    const classified = classifyMany(rows, { now: NOW });
    const attention = needsAttention(classified);
    const ids = attention.map((r) => r.id).sort();
    expect(ids).toEqual(['b', 'c', 'd', 'e']);
  });
});

describe('buildStorageKey', () => {
  it('composes yyyy/mm/<slug>-<uid><ext>', () => {
    const key = buildStorageKey('Policy Document.PDF', 'application/pdf');
    expect(key).toMatch(/^\d{4}\/\d{2}\/policy_document-[a-f0-9]{8}\.pdf$/);
  });

  it('sanitizes bad filenames', () => {
    const key = buildStorageKey('!!!weird////name.txt', 'text/plain');
    expect(key).toMatch(/^\d{4}\/\d{2}\/weird_name-[a-f0-9]{8}\.txt$/);
  });

  it('falls back to "evidence" slug for empty hint', () => {
    const key = buildStorageKey('', 'application/pdf');
    expect(key).toMatch(/^\d{4}\/\d{2}\/evidence-[a-f0-9]{8}\.pdf$/);
  });

  it('handles unknown content types with empty extension', () => {
    const key = buildStorageKey('thing.xyz', 'application/x-unknown');
    expect(key).toMatch(/^\d{4}\/\d{2}\/thing-[a-f0-9]{8}$/);
  });
});
