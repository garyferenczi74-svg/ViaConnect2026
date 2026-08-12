/**
 * Prompt 214c: Elysium getDailyDigest + genetics context for consumers.
 * Sole owner of genetics truth; Arnold/Gordon/Hannah read digests only.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { DigestItem, SupplierDigest } from '@/lib/hannah/compilation/types';
import { displayMetricValue } from './coverage';

const TIMEOUT_MS = 4000;

export async function getElysiumDailyDigest(
  userId: string,
  sinceIso: string,
): Promise<SupplierDigest> {
  const t0 = Date.now();
  try {
    const items = await withTimeout(loadItems(userId, sinceIso), TIMEOUT_MS, 'digest.elysium');
    return {
      supplier: 'elysium',
      ok: true,
      durationMs: Date.now() - t0,
      items,
    };
  } catch (err) {
    safeLog.warn('elysium.digest', 'skipped', {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      supplier: 'elysium',
      ok: false,
      skipped: true,
      skipReason: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t0,
      items: [],
    };
  }
}

async function loadItems(userId: string, sinceIso: string): Promise<DigestItem[]> {
  const supabase = createAdminClient();
  const items: DigestItem[] = [];

  const { data: variants } = await supabase
    .from('elysium_variant_interpretations')
    .select(
      'rsid, gene_symbol, panel_key, effect_summary, evidence_grade, interpretation_status, population_context, source_url, last_verified_at',
    )
    .order('last_verified_at', { ascending: false })
    .limit(8);

  const rows = Array.isArray(variants) ? variants : [];
  if (rows.length === 0) {
    items.push({
      id: 'elysium-sparse',
      hub: 'Genetics',
      summary:
        'Genetics interpretation catalog seeding. Connect GENEX360 or upload data for personalized coverage.',
      metricValue: null,
      refs: ['elysium_variant_interpretations'],
    });
  } else {
    for (const v of rows) {
      const row = v as {
        rsid?: string;
        gene_symbol?: string;
        effect_summary?: string;
        evidence_grade?: string;
        interpretation_status?: string;
        population_context?: string | null;
        source_url?: string;
        last_verified_at?: string;
      };
      const recent =
        row.last_verified_at &&
        new Date(row.last_verified_at).getTime() >= new Date(sinceIso).getTime();
      const pop = row.population_context
        ? ` Population context: ${row.population_context}.`
        : '';
      items.push({
        id: `elysium-${row.rsid ?? 'x'}`,
        hub: 'Genetics',
        summary: `${recent ? 'Updated genetics: ' : ''}${row.gene_symbol ?? 'gene'} ${row.rsid ?? ''}: ${(row.effect_summary ?? '').slice(0, 160)} [${row.interpretation_status ?? 'pending'}].${pop}`,
        metricLabel: 'evidence_grade',
        metricValue: displayMetricValue(row.evidence_grade),
        refs: [row.source_url ?? row.rsid ?? 'elysium'],
      });
    }
  }

  // User upload coverage (owner summary only)
  const { data: cov } = await supabase
    .from('elysium_upload_coverage')
    .select('mapped_count, unknown_count, pending_count, coverage_pct, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (Array.isArray(cov) && cov[0]) {
    const c = cov[0] as {
      mapped_count?: number;
      unknown_count?: number;
      pending_count?: number;
      coverage_pct?: number | null;
    };
    items.push({
      id: 'elysium-upload-coverage',
      hub: 'Genetics',
      summary: `Upload coverage: mapped ${c.mapped_count ?? 0}, pending ${c.pending_count ?? 0}, UNKNOWN ${c.unknown_count ?? 0} (honest gaps, never fabricated).`,
      metricLabel: 'coverage_pct',
      metricValue:
        c.coverage_pct === null || c.coverage_pct === undefined
          ? null
          : String(c.coverage_pct),
      refs: ['elysium_upload_coverage'],
    });
  }

  return items;
}

/**
 * Nutrition-relevant genetic context for Gordon education layer only.
 * Never alters meal computation.
 */
export async function getElysiumNutritionGeneticsDigest(
  _userId: string,
  sinceIso: string,
): Promise<SupplierDigest> {
  const t0 = Date.now();
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('elysium_variant_interpretations')
      .select('rsid, gene_symbol, effect_summary, panel_key, source_url, last_verified_at')
      .in('panel_key', ['nutrition', 'methylation'])
      .order('last_verified_at', { ascending: false })
      .limit(5);

    const rows = Array.isArray(data) ? data : [];
    const items: DigestItem[] =
      rows.length === 0
        ? [
            {
              id: 'elysium-nutrition-empty',
              hub: 'Genetics',
              summary:
                'No nutrition-relevant genetics context in window. Gordon meal math unchanged.',
              metricValue: null,
              refs: ['elysium:nutrition'],
            },
          ]
        : rows.map((r) => {
            const row = r as {
              rsid?: string;
              gene_symbol?: string;
              effect_summary?: string;
              source_url?: string;
            };
            return {
              id: `elysium-nut-${row.rsid ?? 'x'}`,
              hub: 'Genetics' as const,
              summary: `Nutrition genetics context (education only): ${row.gene_symbol ?? ''} ${row.rsid ?? ''}: ${(row.effect_summary ?? '').slice(0, 160)}`,
              refs: [row.source_url ?? row.rsid ?? 'elysium-nut'],
            };
          });

    void sinceIso;
    return {
      supplier: 'elysium',
      ok: true,
      durationMs: Date.now() - t0,
      items,
    };
  } catch (err) {
    return {
      supplier: 'elysium',
      ok: false,
      skipped: true,
      skipReason: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t0,
      items: [],
    };
  }
}
