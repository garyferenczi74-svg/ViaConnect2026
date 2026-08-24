/**
 * Prompt 214c: Thanos getDailyDigest supplier for Hannah.
 * Hannah composes voice; Thanos supplies peptide education truth only.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { DigestItem, SupplierDigest } from '@/lib/hannah/compilation/types';

const TIMEOUT_MS = 4000;

export async function getThanosDailyDigest(
  _userId: string,
  sinceIso: string,
): Promise<SupplierDigest> {
  const t0 = Date.now();
  try {
    const items = await withTimeout(loadItems(sinceIso), TIMEOUT_MS, 'digest.thanos');
    return {
      supplier: 'thanos',
      ok: true,
      durationMs: Date.now() - t0,
      items,
    };
  } catch (err) {
    safeLog.warn('thanos.digest', 'skipped', {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      supplier: 'thanos',
      ok: false,
      skipped: true,
      skipReason: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t0,
      items: [],
    };
  }
}

async function loadItems(sinceIso: string): Promise<DigestItem[]> {
  const supabase = createAdminClient();
  const items: DigestItem[] = [];

  const { data: entries } = await supabase
    .from('peptide_education_entries')
    .select('entry_key, title, summary, evidence_grade, source_url, last_verified_at, is_practitioner_depth')
    .eq('is_active', true)
    .eq('is_practitioner_depth', false)
    .order('last_verified_at', { ascending: false })
    .limit(6);

  const rows = Array.isArray(entries) ? entries : [];
  if (rows.length === 0) {
    items.push({
      id: 'thanos-sparse',
      hub: 'Supplements',
      summary:
        'Peptide education catalog warming up. Educational content only; discuss with a qualified practitioner. No purchase paths.',
      metricValue: null,
      refs: ['peptide_education_entries'],
    });
    return items;
  }

  for (const e of rows) {
    const row = e as {
      entry_key?: string;
      title?: string;
      summary?: string;
      evidence_grade?: string;
      source_url?: string;
      last_verified_at?: string;
    };
    const recent =
      row.last_verified_at &&
      new Date(row.last_verified_at).getTime() >= new Date(sinceIso).getTime();
    items.push({
      id: `thanos-${row.entry_key ?? 'x'}`,
      hub: 'Supplements',
      summary: `${recent ? 'Fresh peptide education: ' : ''}${row.title ?? 'Entry'}: ${(row.summary ?? '').slice(0, 180)} [${row.evidence_grade ?? 'unknown'}]. Educational only.`,
      metricLabel: 'evidence_grade',
      metricValue: row.evidence_grade ?? null,
      refs: [row.source_url ?? row.entry_key ?? 'thanos'],
    });
  }

  return items;
}
