/**
 * Prompt 226 Module B: verified practitioner gate (not self-asserted role alone).
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type ModuleBJurisdiction = 'AB' | 'NY';

export interface VerifiedPractitioner {
  practitionerId: string;
  userId: string;
  displayName: string;
  licenseNumber: string;
  jurisdiction: ModuleBJurisdiction;
  issuingBody: string | null;
  licenseVerified: true;
}

export async function getVerifiedPractitionerForModuleB(
  userId: string,
): Promise<VerifiedPractitioner | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('practitioners')
    .select(
      'id, user_id, display_name, license_number, license_verified, license_jurisdiction, license_issuing_body, account_status',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  if (data.license_verified !== true) return null;
  if (data.account_status === 'suspended' || data.account_status === 'terminated') {
    return null;
  }
  const jurisdiction = data.license_jurisdiction;
  if (jurisdiction !== 'AB' && jurisdiction !== 'NY') return null;
  if (!data.license_number || String(data.license_number).trim().length < 2) {
    return null;
  }

  return {
    practitionerId: String(data.id),
    userId: String(data.user_id),
    displayName: String(data.display_name ?? ''),
    licenseNumber: String(data.license_number),
    jurisdiction,
    issuingBody: data.license_issuing_body
      ? String(data.license_issuing_body)
      : null,
    licenseVerified: true,
  };
}

/** Module B compound picker: educational injectables, broader than Module A allowlist. */
export async function loadModuleBCompounds(): Promise<
  Array<{
    id: string;
    slug: string;
    displayName: string;
    converterEligible: boolean;
    iuEnabled: boolean;
  }>
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('kb_peptides')
    .select(
      'id, slug, display_name, converter_eligible, iu_mg_factor, iu_mg_factor_verified, routes_studied, exclusion_tier',
    )
    .eq('exclusion_tier', 'educational')
    .order('display_name', { ascending: true })
    .limit(200);

  const out: Array<{
    id: string;
    slug: string;
    displayName: string;
    converterEligible: boolean;
    iuEnabled: boolean;
  }> = [];

  for (const row of data ?? []) {
    const routes = Array.isArray(row.routes_studied)
      ? (row.routes_studied as string[]).map((r) => r.toLowerCase())
      : [];
    const injectable =
      routes.some(
        (r) =>
          r.includes('subcutaneous') ||
          r.includes('intramuscular') ||
          r === 'sc' ||
          r === 'im',
      ) || row.converter_eligible === true;
    if (!injectable && row.converter_eligible !== true) continue;
    out.push({
      id: String(row.id),
      slug: String(row.slug),
      displayName: String(row.display_name ?? row.slug),
      converterEligible: row.converter_eligible === true,
      iuEnabled:
        row.iu_mg_factor_verified === true &&
        row.iu_mg_factor != null &&
        Number(row.iu_mg_factor) > 0,
    });
  }
  return out;
}
