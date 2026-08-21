/**
 * Prompt 226 Module A allowlist loader.
 * Dual gate: converter_eligible AND (FDA or HC approved) AND educational AND SC/IM.
 * UNKNOWN status is not a pass. Degraded fetch returns unavailable, never unfiltered.
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
}

export type AllowlistResult =
  | { ok: true; compounds: ConverterAllowlistCompound[] }
  | { ok: false; unavailable: true; reason: string };

function hasInjectableRoute(routes: string[] | null | undefined): boolean {
  const r = (routes ?? []).map((x) => x.toLowerCase());
  return r.some(
    (x) =>
      x === 'subcutaneous' ||
      x === 'intramuscular' ||
      x.includes('subcutaneous') ||
      x.includes('intramuscular'),
  );
}

function isApprovedStatus(fda: string, hc: string): boolean {
  const ok = new Set(['approved', 'approved_other_indication']);
  return ok.has(fda) || ok.has(hc);
}

/**
 * Fail-closed allowlist. Never returns the full Collection 14 corpus.
 */
export async function loadConverterAllowlist(): Promise<AllowlistResult> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('kb_peptides')
      .select(
        'id, slug, display_name, fda_status, health_canada_status, converter_eligible, iu_mg_factor, iu_mg_factor_verified, routes_studied, exclusion_tier',
      )
      .eq('converter_eligible', true)
      .eq('exclusion_tier', 'educational')
      .order('display_name', { ascending: true })
      .limit(100);

    if (error) {
      safeLog.warn('peptides.allowlist', 'query failed unavailable', {
        error: error.message,
      });
      return { ok: false, unavailable: true, reason: 'collection14_query_failed' };
    }

    const compounds: ConverterAllowlistCompound[] = [];
    for (const row of data ?? []) {
      const fda = String(row.fda_status ?? 'unknown');
      const hc = String(row.health_canada_status ?? 'unknown');
      if (fda === 'unknown' && hc === 'unknown') continue;
      if (!isApprovedStatus(fda, hc)) continue;
      if (!hasInjectableRoute(row.routes_studied as string[] | null)) continue;
      if (row.converter_eligible !== true) continue;

      compounds.push({
        id: String(row.id),
        slug: String(row.slug),
        displayName: String(row.display_name ?? row.slug),
        fdaStatus: fda,
        healthCanadaStatus: hc,
        converterEligible: true,
        iuMgFactor:
          row.iu_mg_factor == null ? null : Number(row.iu_mg_factor),
        iuMgFactorVerified: row.iu_mg_factor_verified === true,
        routesStudied: Array.isArray(row.routes_studied)
          ? (row.routes_studied as string[])
          : [],
      });
    }

    return { ok: true, compounds };
  } catch (err) {
    safeLog.warn('peptides.allowlist', 'threw unavailable', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, unavailable: true, reason: 'allowlist_exception' };
  }
}

/** Educational redirect check: compound exists but is not converter-eligible. */
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
      .select('slug, display_name, fda_status, converter_eligible, honesty_layer')
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
