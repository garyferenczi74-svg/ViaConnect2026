// Phase 4: Certification module unit suite.
// Pure-function tests for recertification math + prereq logic + LMS factory.
// Migration shape assertion for the recert reminder cron + registry.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  isCertExpired,
  daysUntilExpiry,
  reminderWindowFor,
  REMINDER_OFFSETS_DAYS,
  type CertificationRow,
} from '@/lib/certification/recertification';
import {
  certificationPrerequisitesMet,
  type CertificationStatusRow,
} from '@/lib/certification/enrollment';
import { getLMSProvider, ThinkificProvider } from '@/lib/certification/lms-integration';

const today = new Date('2026-04-18T12:00:00Z');

function rowExpiringIn(days: number, status: CertificationRow['status'] = 'certified'): CertificationRow {
  const expires = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    id: `c-${days}`,
    practitioner_id: 'p-1',
    certification_level_id: 'foundation',
    status,
    expires_at: expires.toISOString(),
  };
}

describe('isCertExpired', () => {
  it('returns true when expires_at is in the past', () => {
    expect(isCertExpired(rowExpiringIn(-1), today)).toBe(true);
  });
  it('returns false when expires_at is now or in the future', () => {
    expect(isCertExpired(rowExpiringIn(0), today)).toBe(false);
    expect(isCertExpired(rowExpiringIn(30), today)).toBe(false);
  });
  it('returns false when expires_at is null', () => {
    const row: CertificationRow = { ...rowExpiringIn(0), expires_at: null };
    expect(isCertExpired(row, today)).toBe(false);
  });
});

describe('daysUntilExpiry', () => {
  it.each([
    [-30, -30],
    [-1, -1],
    [0, 0],
    [7, 7],
    [90, 90],
  ])('expires_at offset %i resolves to %i days', (offset, expected) => {
    expect(daysUntilExpiry(rowExpiringIn(offset), today)).toBe(expected);
  });

  it('returns null when expires_at is null', () => {
    const row: CertificationRow = { ...rowExpiringIn(0), expires_at: null };
    expect(daysUntilExpiry(row, today)).toBeNull();
  });
});

describe('reminderWindowFor', () => {
  it('exposes the documented spec offsets', () => {
    expect(REMINDER_OFFSETS_DAYS).toEqual([90, 60, 30, 14, 7, 1]);
  });

  it('matches the closest reminder offset within tolerance', () => {
    expect(reminderWindowFor(rowExpiringIn(90), today)).toBe(90);
    expect(reminderWindowFor(rowExpiringIn(60), today)).toBe(60);
    expect(reminderWindowFor(rowExpiringIn(30), today)).toBe(30);
    expect(reminderWindowFor(rowExpiringIn(14), today)).toBe(14);
    expect(reminderWindowFor(rowExpiringIn(7), today)).toBe(7);
    expect(reminderWindowFor(rowExpiringIn(1), today)).toBe(1);
  });

  it('returns null when no offset matches', () => {
    expect(reminderWindowFor(rowExpiringIn(45), today)).toBeNull();
    expect(reminderWindowFor(rowExpiringIn(120), today)).toBeNull();
  });

  it('does not match when status is not certified', () => {
    expect(
      reminderWindowFor(rowExpiringIn(30, 'in_progress'), today),
    ).toBeNull();
    expect(reminderWindowFor(rowExpiringIn(30, 'expired'), today)).toBeNull();
  });
});

describe('certificationPrerequisitesMet', () => {
  const certifiedFoundation: CertificationStatusRow = {
    certification_level_id: 'foundation',
    status: 'certified',
  };

  it('foundation has no prereqs', () => {
    expect(certificationPrerequisitesMet('foundation', [])).toBe(true);
  });

  it('precision_designer requires foundation certified', () => {
    expect(certificationPrerequisitesMet('precision_designer', [])).toBe(false);
    expect(
      certificationPrerequisitesMet('precision_designer', [certifiedFoundation]),
    ).toBe(true);
    expect(
      certificationPrerequisitesMet('precision_designer', [
        { certification_level_id: 'foundation', status: 'in_progress' },
      ]),
    ).toBe(false);
  });

  it('master_practitioner requires both foundation AND precision_designer certified', () => {
    expect(certificationPrerequisitesMet('master_practitioner', [])).toBe(false);
    expect(
      certificationPrerequisitesMet('master_practitioner', [certifiedFoundation]),
    ).toBe(false);
    expect(
      certificationPrerequisitesMet('master_practitioner', [
        certifiedFoundation,
        { certification_level_id: 'precision_designer', status: 'certified' },
      ]),
    ).toBe(true);
  });
});

describe('getLMSProvider', () => {
  it('returns ThinkificProvider when LMS_PROVIDER is unset (default)', () => {
    const prev = process.env.LMS_PROVIDER;
    delete process.env.LMS_PROVIDER;
    process.env.THINKIFIC_API_KEY = 'test';
    process.env.THINKIFIC_SUBDOMAIN = 'viacura';
    try {
      expect(getLMSProvider()).toBeInstanceOf(ThinkificProvider);
    } finally {
      if (prev !== undefined) process.env.LMS_PROVIDER = prev;
      delete process.env.THINKIFIC_API_KEY;
      delete process.env.THINKIFIC_SUBDOMAIN;
    }
  });

  it('throws on unknown provider', () => {
    const prev = process.env.LMS_PROVIDER;
    process.env.LMS_PROVIDER = 'mystery_lms';
    try {
      expect(() => getLMSProvider()).toThrow(/Unknown LMS provider/);
    } finally {
      if (prev !== undefined) process.env.LMS_PROVIDER = prev;
      else delete process.env.LMS_PROVIDER;
    }
  });
});

describe('Phase 4 migration shape', () => {
  it('cert-reminder cron migration registers the agent + schedules cron', () => {
    const sql = readFileSync(
      path.join(
        __dirname,
        '..',
        'supabase/migrations/20260418000140_certification_reminder_cron.sql',
      ),
      'utf8',
    );
    expect(sql).toMatch(/INSERT INTO public\.ultrathink_agent_registry/);
    expect(sql).toMatch(/cert-reminder-tick/);
    expect(sql).toMatch(/cron\.schedule/);
  });
});
