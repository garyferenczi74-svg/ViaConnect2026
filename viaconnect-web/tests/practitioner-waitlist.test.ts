// Practitioner waitlist Phase 1 unit suite.
// Covers: Zod schema validation for the waitlist API payload, invitation
// token generation, and token validation logic. RLS policy shapes are
// asserted by parsing the migration SQL so we catch policy drift without
// needing a live DB connection.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  waitlistSubmissionSchema,
  type WaitlistSubmission,
} from '@/lib/practitioner/waitlistSchema';
import {
  generateInvitationToken,
  isInvitationTokenShape,
} from '@/lib/practitioner/invitations';

const baseValid: WaitlistSubmission = {
  email: 'jane@clinic.com',
  firstName: 'Jane',
  lastName: 'Doe',
  practiceName: 'Doe Functional Medicine',
  credentialType: 'nd',
  primaryClinicalFocus: 'naturopathic',
  referralSource: 'forbes_article',
  interestReason:
    'I am building a precision-medicine practice and want pharmaceutical-grade infrastructure for my patients.',
};

describe('waitlistSubmissionSchema', () => {
  it('accepts a minimal valid submission', () => {
    const r = waitlistSubmissionSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const r = waitlistSubmissionSchema.safeParse({ ...baseValid, email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it.each(['md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other'])(
    'accepts credential type %s',
    (credentialType) => {
      const r = waitlistSubmissionSchema.safeParse({ ...baseValid, credentialType });
      expect(r.success).toBe(true);
    },
  );

  it('rejects an unknown credential type', () => {
    const r = waitlistSubmissionSchema.safeParse({ ...baseValid, credentialType: 'wizard' });
    expect(r.success).toBe(false);
  });

  it('requires interestReason of at least 20 characters', () => {
    const r = waitlistSubmissionSchema.safeParse({ ...baseValid, interestReason: 'too short' });
    expect(r.success).toBe(false);
  });

  it('caps interestReason at 2000 characters', () => {
    const r = waitlistSubmissionSchema.safeParse({
      ...baseValid,
      interestReason: 'x'.repeat(2001),
    });
    expect(r.success).toBe(false);
  });

  it('accepts an empty practiceUrl alongside an optional URL', () => {
    const empty = waitlistSubmissionSchema.safeParse({ ...baseValid, practiceUrl: '' });
    const url = waitlistSubmissionSchema.safeParse({
      ...baseValid,
      practiceUrl: 'https://doefm.com',
    });
    expect(empty.success).toBe(true);
    expect(url.success).toBe(true);
  });

  it('rejects yearsInPractice outside 0 to 80', () => {
    expect(
      waitlistSubmissionSchema.safeParse({ ...baseValid, yearsInPractice: -1 }).success,
    ).toBe(false);
    expect(
      waitlistSubmissionSchema.safeParse({ ...baseValid, yearsInPractice: 81 }).success,
    ).toBe(false);
    expect(
      waitlistSubmissionSchema.safeParse({ ...baseValid, yearsInPractice: 12 }).success,
    ).toBe(true);
  });

  it('accepts the canonical primary clinical focus values', () => {
    const focuses = [
      'functional_medicine', 'integrative_medicine', 'naturopathic',
      'chiropractic', 'nutrition', 'acupuncture_tcm',
      'ayurvedic', 'longevity', 'precision_wellness',
      'general_primary_care', 'other',
    ];
    for (const f of focuses) {
      const r = waitlistSubmissionSchema.safeParse({ ...baseValid, primaryClinicalFocus: f });
      expect(r.success).toBe(true);
    }
  });
});

describe('generateInvitationToken', () => {
  it('produces a base64url-shaped token of at least 32 chars', () => {
    const t = generateInvitationToken();
    expect(typeof t).toBe('string');
    expect(t.length).toBeGreaterThanOrEqual(32);
    expect(isInvitationTokenShape(t)).toBe(true);
  });

  it('is unique across many calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) set.add(generateInvitationToken());
    expect(set.size).toBe(200);
  });
});

describe('isInvitationTokenShape', () => {
  it('rejects strings with disallowed characters', () => {
    expect(isInvitationTokenShape('contains spaces and slashes /')).toBe(false);
    expect(isInvitationTokenShape('a'.repeat(8))).toBe(false); // too short
    expect(isInvitationTokenShape('')).toBe(false);
  });
});

describe('migration RLS shape', () => {
  const repo = path.resolve(__dirname, '..');

  it('practitioner_waitlist enables RLS and ships the 4 expected policies', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000020_practitioner_waitlist.sql'),
      'utf8',
    );
    expect(sql).toMatch(/ALTER\s+TABLE[^;]*practitioner_waitlist[^;]*ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).toMatch(/POLICY\s+"waitlist_public_insert"/i);
    expect(sql).toMatch(/POLICY\s+"waitlist_self_read"/i);
    expect(sql).toMatch(/POLICY\s+"waitlist_admin_all"/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*email\s*\)/i);
  });

  it('practitioner_cohorts enables RLS and seeds Cohort 1', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000010_practitioner_cohorts.sql'),
      'utf8',
    );
    expect(sql).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).toMatch(/Cohort 1: Founding Practitioners/i);
    expect(sql).toMatch(/cohort_number,?\s*target_size/i);
  });

  it('practitioner_invitations gates writes to admins only', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000030_practitioner_invitations.sql'),
      'utf8',
    );
    expect(sql).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).toMatch(/POLICY\s+"invitations_admin_all"/i);
    expect(sql).toMatch(/expires_at\s+TIMESTAMPTZ\s+NOT\s+NULL/i);
  });

  it('email queue migration uses Supabase, not SendGrid', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000040_practitioner_email_queue.sql'),
      'utf8',
    );
    expect(sql).not.toMatch(/sendgrid/i);
    expect(sql).toMatch(/practitioner_email_queue/);
  });
});
