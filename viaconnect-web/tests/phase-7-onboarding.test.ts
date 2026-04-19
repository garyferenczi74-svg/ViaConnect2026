// Phase 7: Cohort onboarding, patient invitations, co-branding.
// File-on-disk + token-shape + pure-helper assertions. Live DB integration
// is exercised by the route handlers themselves.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  generatePatientInvitationToken,
  isPatientInvitationTokenShape,
  buildPatientInvitationUrl,
} from '@/lib/practitioner/patient-invitations';

const REPO = path.resolve(__dirname, '..');

describe('patient invitation tokens', () => {
  it('produces a base64url token of at least 32 chars', () => {
    const t = generatePatientInvitationToken();
    expect(typeof t).toBe('string');
    expect(t.length).toBeGreaterThanOrEqual(32);
    expect(isPatientInvitationTokenShape(t)).toBe(true);
  });

  it('is unique across many calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) set.add(generatePatientInvitationToken());
    expect(set.size).toBe(200);
  });

  it('rejects malformed token shapes', () => {
    expect(isPatientInvitationTokenShape('contains spaces')).toBe(false);
    expect(isPatientInvitationTokenShape('a'.repeat(8))).toBe(false);
    expect(isPatientInvitationTokenShape('')).toBe(false);
  });

  it('builds a /patients/invited URL with the token', () => {
    const url = buildPatientInvitationUrl('https://viacurawellness.com', 'abc123tokenhere');
    expect(url).toBe('https://viacurawellness.com/patients/invited?token=abc123tokenhere');
  });

  it('strips trailing slash from the base URL', () => {
    const url = buildPatientInvitationUrl('https://viacurawellness.com/', 'abc123tokenhere');
    expect(url).toBe('https://viacurawellness.com/patients/invited?token=abc123tokenhere');
  });
});

describe('Phase 7 page routes exist', () => {
  it.each([
    ['practitioner invite patient',     'src/app/(app)/practitioner/patients/invite/page.tsx'],
    ['patient invitation acceptance',   'src/app/patients/invited/page.tsx'],
    ['practitioner self-onboarding',    'src/app/practitioners/onboard/page.tsx'],
    ['admin cohorts',                   'src/app/(app)/admin/cohorts/page.tsx'],
  ])('page %s is present', (_label, p) => {
    expect(existsSync(path.join(REPO, p))).toBe(true);
  });
});

describe('Phase 7 page hygiene', () => {
  it.each([
    'src/app/(app)/practitioner/patients/invite/page.tsx',
    'src/app/patients/invited/page.tsx',
    'src/app/practitioners/onboard/page.tsx',
    'src/app/(app)/admin/cohorts/page.tsx',
  ])('%s uses Lucide strokeWidth 1.5 and contains no em-dash', (p) => {
    const src = readFileSync(path.join(REPO, p), 'utf8');
    expect(src).toMatch(/strokeWidth=\{1\.5\}/);
    expect(src).not.toMatch(/—/);
  });
});

describe('Co-branding badge component', () => {
  it('exists at src/components/co-branding/PatientPractitionerBadge.tsx', () => {
    expect(
      existsSync(
        path.join(REPO, 'src/components/co-branding/PatientPractitionerBadge.tsx'),
      ),
    ).toBe(true);
  });
});

describe('White-label sales notice on billing page', () => {
  it('billing page references the white_label tier conditionally', () => {
    const src = readFileSync(
      path.join(REPO, 'src/app/(app)/practitioner/billing/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/white_label/);
    expect(src).toMatch(/Contact sales/i);
  });
});

describe('Patient invitation API route', () => {
  it('exists at src/app/api/practitioner/invite-patient/route.ts', () => {
    expect(
      existsSync(
        path.join(REPO, 'src/app/api/practitioner/invite-patient/route.ts'),
      ),
    ).toBe(true);
  });
});
