/**
 * Promote kb_peptides to consumer_safe after Marshall-approved educational material.
 * Never promotes excluded_adverse_reference. Never promotes when summary has dose lexicon.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { assertNoDoseLexicon } from '@/lib/thanos/doseRedaction';
import { safeLog } from '@/lib/utils/safe-log';

export interface PromoteResult {
  considered: number;
  promoted: number;
  skipped: number;
  reasons: Record<string, number>;
  sampleSlugs: string[];
}

export async function promoteEducationalConsumerSafe(opts?: {
  limit?: number;
}): Promise<PromoteResult> {
  const limit = Math.min(80, Math.max(1, opts?.limit ?? 40));
  const admin = createAdminClient();
  const result: PromoteResult = {
    considered: 0,
    promoted: 0,
    skipped: 0,
    reasons: {},
    sampleSlugs: [],
  };

  const bump = (reason: string) => {
    result.reasons[reason] = (result.reasons[reason] ?? 0) + 1;
    result.skipped += 1;
  };

  const { data: peptides, error } = await admin
    .from('kb_peptides')
    .select('id, slug, display_name, consumer_safe, exclusion_tier, evidence_summary')
    .eq('exclusion_tier', 'educational')
    .eq('consumer_safe', false)
    .order('slug', { ascending: true })
    .limit(limit);

  if (error) {
    safeLog.warn('thanos.promote', 'load failed', { error: error.message });
    return result;
  }

  for (const row of peptides ?? []) {
    result.considered += 1;
    const slug = String(row.slug ?? '');
    if (!slug) {
      bump('missing_slug');
      continue;
    }

    if (String(row.exclusion_tier) === 'excluded_adverse_reference') {
      bump('adverse_reference');
      continue;
    }

    const summary = String(row.evidence_summary ?? '');
    if (summary && !assertNoDoseLexicon(summary)) {
      bump('dose_lexicon');
      continue;
    }

    // Prefer an active education entry for this peptide
    const entryKey = `edu-${slug.replace(/^edu-/, '')}`;
    const { data: edu } = await admin
      .from('peptide_education_entries')
      .select('entry_key, summary, is_active, source_url, topic_keys')
      .eq('is_active', true)
      .eq('entry_key', entryKey)
      .limit(3);

    const eduRows = edu ?? [];
    if (eduRows.length === 0) {
      // Fall back: Marshall-approved staging/gated item mentioning the peptide
      const { data: gated } = await admin
        .from('hounddog_staging_items')
        .select('id, title, summary, gate_status, source_url')
        .eq('agent_slug', 'thanos')
        .eq('gate_status', 'approved')
        .ilike('title', `%${String(row.display_name ?? slug).slice(0, 40)}%`)
        .limit(1);
      if (!gated?.length) {
        bump('no_education_or_approved_stage');
        continue;
      }
      const gSummary = String(gated[0].summary ?? '');
      if (gSummary && !assertNoDoseLexicon(gSummary)) {
        bump('dose_lexicon_staging');
        continue;
      }
    } else {
      let eduDoseBlocked = false;
      for (const e of eduRows) {
        if (e.summary && !assertNoDoseLexicon(String(e.summary))) {
          eduDoseBlocked = true;
          break;
        }
      }
      if (eduDoseBlocked) {
        bump('dose_lexicon_edu');
        continue;
      }
    }

    const { error: upErr } = await admin
      .from('kb_peptides')
      .update({
        consumer_safe: true,
        exclusion_tier: 'educational',
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (upErr) {
      bump('update_failed');
      safeLog.warn('thanos.promote', 'update failed', {
        slug,
        error: upErr.message,
      });
      continue;
    }

    result.promoted += 1;
    if (result.sampleSlugs.length < 12) result.sampleSlugs.push(slug);
  }

  safeLog.info('thanos.promote', 'complete', result as unknown as Record<string, unknown>);
  return result;
}
