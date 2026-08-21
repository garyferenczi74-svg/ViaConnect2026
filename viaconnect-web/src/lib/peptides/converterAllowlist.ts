/**
 * Prompt 226: peptide picker catalog for converter + prescribed peptides.
 * Returns Collection 14 educational (and restricted) monographs.
 * Gary request: no FDA/converter_eligible allowlist gate on the picker.
 * Dose values still originate only from the user / prescriber.
 * Degraded DB fetch returns unavailable (empty), never invents compounds.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export interface ConverterAllowlistCompound {
  id: string;
  slug: string;
  displayName: string;
  fdaStatus: string;
  healthCanadaStatus: string;
  converterEligible: boolean;
  iuMgFactor: number | null;
  iuMgFactorVerified: boolean;
  routesStudied: string[];
  exclusionTier: string;
}

export type AllowlistResult =
  | { ok: true; compounds: ConverterAllowlistCompound[] }
  | { ok: false; unavailable: true; reason: string };

/**
 * Full educational catalog for picker surfaces.
 * Excludes excluded_adverse_reference (e.g. Dermorphin) only.
 */
export async function loadConverterAllowlist(): Promise<AllowlistResult> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('kb_peptides')
      .select(
        'id, slug, display_name, fda_status, health_canada_status, converter_eligible, iu_mg_factor, iu_mg_factor_verified, routes_studied, exclusion_tier',
      )
      .in('exclusion_tier', ['educational', 'restricted'])
      .order('display_name', { ascending: true })
      .limit(500);

    if (error) {
      safeLog.warn('peptides.catalog', 'query failed unavailable', {
        error: error.message,
      });
      return { ok: false, unavailable: true, reason: 'collection14_query_failed' };
    }

    const compounds: ConverterAllowlistCompound[] = (data ?? []).map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      displayName: String(row.display_name ?? row.slug),
      fdaStatus: String(row.fda_status ?? 'unknown'),
      healthCanadaStatus: String(row.health_canada_status ?? 'unknown'),
      converterEligible: row.converter_eligible === true,
      iuMgFactor: row.iu_mg_factor == null ? null : Number(row.iu_mg_factor),
      iuMgFactorVerified: row.iu_mg_factor_verified === true,
      routesStudied: Array.isArray(row.routes_studied)
        ? (row.routes_studied as string[])
        : [],
      exclusionTier: String(row.exclusion_tier ?? 'educational'),
    }));

    return { ok: true, compounds };
  } catch (err) {
    safeLog.warn('peptides.catalog', 'threw unavailable', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, unavailable: true, reason: 'catalog_exception' };
  }
}

/** Lookup any educational/restricted peptide by slug. */
export async function lookupNonAllowlistedPeptide(slug: string): Promise<{
  found: boolean;
  slug: string;
  displayName?: string;
  fdaStatus?: string;
  converterEligible?: boolean;
  evidenceGapStatement?: string;
} | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('kb_peptides')
      .select('slug, display_name, fda_status, converter_eligible, honesty_layer, exclusion_tier')
      .eq('slug', slug)
      .maybeSingle();
    if (!data) return { found: false, slug };
    const honesty = (data.honesty_layer ?? {}) as {
      evidence_gap_statement?: string;
    };
    return {
      found: true,
      slug: String(data.slug),
      displayName: String(data.display_name ?? data.slug),
      fdaStatus: String(data.fda_status ?? 'unknown'),
      converterEligible: data.converter_eligible === true,
      evidenceGapStatement: honesty.evidence_gap_statement,
    };
  } catch {
    return null;
  }
}
