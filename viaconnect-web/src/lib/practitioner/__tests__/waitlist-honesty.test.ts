import { describe, it, expect } from 'vitest';
import {
  VIA_CURA_LAUNCH_WINDOW,
  PRACTITIONER_WAITLIST_PATH,
  THREE_PORTAL_COPY,
  FEATURES_INTRO_COPY,
  isClinicianSignupRole,
  isClinicianPortalPath,
  unauthenticatedClinicianPortalRedirect,
  clinicianWaitlistHref,
  waitlistEmailFromSearchParam,
} from '@/lib/practitioner/waitlist-honesty';

describe('waitlist honesty constants', () => {
  it('names Q1 2027 as the ViaCura launch window', () => {
    expect(VIA_CURA_LAUNCH_WINDOW).toBe('Q1 2027');
    expect(PRACTITIONER_WAITLIST_PATH).toBe('/practitioners');
  });

  it('keeps Three-Portal copy waitlist-honest', () => {
    expect(THREE_PORTAL_COPY.headline).toBe('Three-Portal Ecosystem');
    expect(THREE_PORTAL_COPY.teaser).toMatch(/Q1 2027/);
    expect(THREE_PORTAL_COPY.body).toMatch(/waitlist/);
    expect(THREE_PORTAL_COPY.body).toMatch(/Q1 2027/);
    expect(THREE_PORTAL_COPY.body.toLowerCase()).not.toMatch(/in one tap/);
    expect(THREE_PORTAL_COPY.body.toLowerCase()).not.toMatch(/message them/);
  });

  it('keeps features intro waitlist-honest at both viewports', () => {
    expect(FEATURES_INTRO_COPY.desktop).toMatch(/Q1 2027/);
    expect(FEATURES_INTRO_COPY.mobile).toMatch(/Q1 2027/);
    expect(FEATURES_INTRO_COPY.desktop).toMatch(/consumer portal is live/i);
    expect(FEATURES_INTRO_COPY.mobile).toMatch(/consumer portal live/i);
  });
});

describe('isClinicianSignupRole', () => {
  it.each(['practitioner', 'naturopath'] as const)('treats %s as clinician waitlist', (role) => {
    expect(isClinicianSignupRole(role)).toBe(true);
  });

  it.each(['consumer', 'admin', 'patient', ''])('does not treat %s as clinician waitlist', (role) => {
    expect(isClinicianSignupRole(role)).toBe(false);
  });
});

describe('isClinicianPortalPath', () => {
  it.each([
    '/practitioner',
    '/practitioner/',
    '/practitioner/dashboard',
    '/practitioner/join',
    '/naturopath',
    '/naturopath/dashboard',
  ])('treats %s as a live-looking clinician portal path', (path) => {
    expect(isClinicianPortalPath(path)).toBe(true);
  });

  it.each([
    '/practitioners',
    '/practitioners/',
    '/practitioners/onboard',
    '/practitioners/invited',
    '/',
    '/signup',
    '/login',
    '/dashboard',
    '/api/practitioner/patients',
  ])('does not treat %s as a clinician portal path', (path) => {
    expect(isClinicianPortalPath(path)).toBe(false);
  });
});

describe('unauthenticatedClinicianPortalRedirect', () => {
  it('sends unauth clinician portal paths to the waitlist', () => {
    expect(unauthenticatedClinicianPortalRedirect('/practitioner')).toBe(
      PRACTITIONER_WAITLIST_PATH,
    );
    expect(unauthenticatedClinicianPortalRedirect('/practitioner/dashboard')).toBe(
      PRACTITIONER_WAITLIST_PATH,
    );
    expect(unauthenticatedClinicianPortalRedirect('/naturopath/dashboard')).toBe(
      PRACTITIONER_WAITLIST_PATH,
    );
  });

  it('does not redirect the waitlist or consumer surfaces', () => {
    expect(unauthenticatedClinicianPortalRedirect('/practitioners')).toBeNull();
    expect(unauthenticatedClinicianPortalRedirect('/signup')).toBeNull();
    expect(unauthenticatedClinicianPortalRedirect('/')).toBeNull();
  });
});

describe('clinicianWaitlistHref', () => {
  it('returns the waitlist path when email is missing or invalid', () => {
    expect(clinicianWaitlistHref()).toBe(PRACTITIONER_WAITLIST_PATH);
    expect(clinicianWaitlistHref('')).toBe(PRACTITIONER_WAITLIST_PATH);
    expect(clinicianWaitlistHref('not-an-email')).toBe(PRACTITIONER_WAITLIST_PATH);
  });

  it('appends a safe email query when present', () => {
    expect(clinicianWaitlistHref('jane@clinic.com')).toBe(
      '/practitioners?email=jane%40clinic.com',
    );
  });
});

describe('waitlistEmailFromSearchParam', () => {
  it('accepts a plausible email', () => {
    expect(waitlistEmailFromSearchParam('jane@clinic.com')).toBe('jane@clinic.com');
  });

  it('rejects empty, missing, oversized, or non-email values', () => {
    expect(waitlistEmailFromSearchParam(null)).toBeUndefined();
    expect(waitlistEmailFromSearchParam('')).toBeUndefined();
    expect(waitlistEmailFromSearchParam('nope')).toBeUndefined();
    expect(waitlistEmailFromSearchParam(`${'x'.repeat(250)}@x.com`)).toBeUndefined();
  });
});
