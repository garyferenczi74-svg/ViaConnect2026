// ViaCura waitlist honesty (OBRA Brief 7).
// The consumer portal is live. Practitioner / Naturopath portals (ViaCura)
// are a founding waitlist for Q1 2027. Do not paint unauthenticated
// /practitioner or /naturopath as a live portal. Do not grant immediate
// clinician portal access from public signup.

export const VIA_CURA_LAUNCH_WINDOW = 'Q1 2027' as const;
export const PRACTITIONER_WAITLIST_PATH = '/practitioners' as const;

export const THREE_PORTAL_COPY = {
  headline: 'Three-Portal Ecosystem',
  teaser: 'Consumer portal live. Clinician portals open Q1 2027.',
  body:
    'Your data, on your terms. The consumer portal is live today. Practitioner and Naturopath portals (ViaCura) are on the founding waitlist for Q1 2027 launch. Privacy stays role-locked.',
} as const;

export const FEATURES_INTRO_COPY = {
  desktop:
    'One platform. Genomic testing, AI protocols, peptide therapeutics, and real-time analytics. The consumer portal is live; clinician portals (ViaCura) open Q1 2027.',
  mobile:
    'One platform. Genomic testing, AI protocols, peptide therapeutics. Consumer portal live; clinician portals open Q1 2027.',
} as const;

export type ClinicianSignupRole = 'practitioner' | 'naturopath';

export function isClinicianSignupRole(role: string): role is ClinicianSignupRole {
  return role === 'practitioner' || role === 'naturopath';
}

/**
 * Page paths that would render (or 307-to-login as if they were) a live
 * clinician portal. `/practitioners` is the public waitlist and is excluded.
 */
export function isClinicianPortalPath(pathname: string): boolean {
  return (
    pathname === '/practitioner' ||
    pathname.startsWith('/practitioner/') ||
    pathname === '/naturopath' ||
    pathname.startsWith('/naturopath/')
  );
}

export function unauthenticatedClinicianPortalRedirect(
  pathname: string,
): typeof PRACTITIONER_WAITLIST_PATH | null {
  if (isClinicianPortalPath(pathname)) return PRACTITIONER_WAITLIST_PATH;
  return null;
}

export function clinicianWaitlistHref(email?: string): string {
  const trimmed = email?.trim() ?? '';
  if (!trimmed.includes('@')) return PRACTITIONER_WAITLIST_PATH;
  const params = new URLSearchParams({ email: trimmed });
  return `${PRACTITIONER_WAITLIST_PATH}?${params.toString()}`;
}

export function waitlistEmailFromSearchParam(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed.includes('@') || trimmed.length > 254) return undefined;
  return trimmed;
}
