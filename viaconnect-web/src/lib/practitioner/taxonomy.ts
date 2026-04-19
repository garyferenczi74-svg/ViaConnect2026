// Practitioner taxonomy: credential types, tier IDs, certification levels.
// Single source of truth for both server (API routes, migrations validation)
// and client (sidebar conditional rendering, pricing display).
//
// Mirrors the SQL CHECK constraints in:
//   20260418000060_practitioner_tiers.sql
//   20260418000070_certification_levels.sql
//   20260418000080_practitioners.sql

export const CREDENTIAL_TYPES = [
  'md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other',
] as const;
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

// Naturopath sidebar (AI Holistic Advisor, Botanicals, Constitutional, Natural
// Protocols) is rendered for these credential types only.
const NATUROPATH_LIKE = new Set<CredentialType>(['nd', 'dc', 'lac']);

export function isNaturopathLikeCredential(c: string): boolean {
  return NATUROPATH_LIKE.has(c as CredentialType);
}

export const PRACTITIONER_TIER_IDS = ['standard', 'white_label'] as const;
export type PractitionerTierId = (typeof PRACTITIONER_TIER_IDS)[number];

const TIER_MONTHLY_CENTS: Record<PractitionerTierId, number> = {
  standard: 12888,
  white_label: 28888,
};

const TIER_ANNUAL_CENTS: Record<PractitionerTierId, number> = {
  standard: 128880,
  white_label: 288880,
};

export function practitionerTierMonthlyCents(id: PractitionerTierId): number {
  return TIER_MONTHLY_CENTS[id];
}

export function practitionerTierAnnualCents(id: PractitionerTierId): number {
  return TIER_ANNUAL_CENTS[id];
}

export const CERTIFICATION_LEVEL_IDS = [
  'foundation', 'precision_designer', 'master_practitioner',
] as const;
export type CertificationLevelId = (typeof CERTIFICATION_LEVEL_IDS)[number];

const CERT_PRICE_CENTS: Record<CertificationLevelId, number> = {
  foundation: 0,
  precision_designer: 88800,
  master_practitioner: 188800,
};

const CERT_RECERT_CENTS: Record<CertificationLevelId, number | null> = {
  foundation: null,
  precision_designer: 38800,
  master_practitioner: 38800,
};

export function certificationOnetimeCents(id: CertificationLevelId): number {
  return CERT_PRICE_CENTS[id];
}

export function certificationRecertCents(id: CertificationLevelId): number | null {
  return CERT_RECERT_CENTS[id];
}

export type CoBrandingLevel = 'medium' | 'heavy_white_label';

export function coBrandingForTier(id: PractitionerTierId): CoBrandingLevel {
  return id === 'white_label' ? 'heavy_white_label' : 'medium';
}

// Practitioner account states from 20260418000080_practitioners.sql.
export type PractitionerAccountStatus =
  | 'pending_onboarding'
  | 'onboarding'
  | 'active'
  | 'suspended'
  | 'terminated';

// Subscription states from 20260418000090_practitioner_subscriptions.sql.
export type PractitionerSubscriptionStatus =
  | 'active' | 'past_due' | 'canceled' | 'paused' | 'trialing';

// Certification states from 20260418000100_practitioner_certifications.sql.
export type CertificationStatus =
  | 'enrolled' | 'in_progress' | 'completed' | 'certified' | 'expired' | 'revoked';
