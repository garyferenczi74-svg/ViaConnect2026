// OBRA Brief 7: ViaCura waitlist honesty source contract.
// /practitioners is the honest Q1 2027 waitlist. Unauth /practitioner must
// not look like a live portal. Clinician signup joins the waitlist.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..');

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), 'utf8');
}

describe('middleware waitlist honesty', () => {
  const src = read('src/lib/supabase/middleware.ts');

  it('imports the unauth clinician portal redirect helper', () => {
    expect(src).toContain('unauthenticatedClinicianPortalRedirect');
    expect(src).toContain('@/lib/practitioner/waitlist-honesty');
  });

  it('redirects unauth clinician portal paths before /login', () => {
    const waitlistIdx = src.indexOf('unauthenticatedClinicianPortalRedirect(pathname)');
    const loginIdx = src.indexOf('redirecting unauthenticated request to login');
    expect(waitlistIdx).toBeGreaterThan(0);
    expect(loginIdx).toBeGreaterThan(waitlistIdx);
  });
});

describe('signup clinician waitlist', () => {
  const src = read('src/app/(auth)/signup/page.tsx');

  it('labels clinician roles as join waitlist Q1 2027', () => {
    expect(src).toContain('Join the ViaCura waitlist');
    expect(src).toContain('VIA_CURA_LAUNCH_WINDOW');
    expect(src).toContain('Join the waitlist');
  });

  it('does not promise immediate portal access', () => {
    expect(src).not.toMatch(/access to the portal immediately/i);
    expect(src).not.toContain('Patient management portal');
    expect(src).not.toContain('Choose your portal experience');
  });

  it('sends clinician success to /practitioners, not a portal dashboard', () => {
    expect(src).toContain('isClinicianSignupRole');
    expect(src).toContain('clinicianWaitlistHref');
    expect(src).toContain('PRACTITIONER_WAITLIST_PATH');
    expect(src).not.toContain('/practitioner/dashboard');
    expect(src).not.toContain('/naturopath/dashboard');
  });
});

describe('homepage Three-Portal copy', () => {
  const cards = read('src/components/landing/scroll-sections/shared/featureCards.ts');
  const desktop = read('src/components/landing/scroll-sections/desktop/FeaturesSectionDesktop.tsx');
  const mobile = read('src/components/landing/scroll-sections/mobile/FeaturesSectionMobile.tsx');

  it('uses the waitlist-honest Three-Portal copy source', () => {
    expect(cards).toContain('THREE_PORTAL_COPY');
    expect(cards).not.toContain('Share your protocol with your clinician in one tap');
  });

  it('uses waitlist-honest features intro on desktop and mobile', () => {
    expect(desktop).toContain('FEATURES_INTRO_COPY.desktop');
    expect(mobile).toContain('FEATURES_INTRO_COPY.mobile');
    expect(desktop).not.toContain('three-portal ecosystem connecting you to clinical expertise');
  });
});

describe('/practitioners remains the honest waitlist', () => {
  const page = read('src/app/practitioners/page.tsx');
  const form = read('src/app/practitioners/PractitionerWaitlistForm.tsx');

  it('states Q1 2027 portal launch on the waitlist landing', () => {
    expect(page).toContain('Q1 2027');
    expect(page).toContain('Apply to join the waitlist');
  });

  it('prefills email from the signup query without using any', () => {
    expect(form).toContain('waitlistEmailFromSearchParam');
    expect(form).not.toMatch(/: any\b/);
    expect(form).not.toMatch(/as any\b/);
  });
});

describe('waitlist honesty module hygiene', () => {
  const src = read('src/lib/practitioner/waitlist-honesty.ts');

  it('contains no any', () => {
    expect(src).not.toMatch(/: any\b/);
    expect(src).not.toMatch(/as any\b/);
  });

  it('does not add ViaCura portal paint tokens', () => {
    expect(src).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });
});
