/**
 * Prompt 227a: one Collection 14 Sherlock curation cycle.
 * Writes proposals / negatives / census only. Does not UPDATE kb_peptides.
 *
 * Isolation: never read user PHI or personal regimen/inventory/lab surfaces
 * (226a / 226d isolation set). Curation reads Collection 14 + authorities only.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  computeGapCensus,
  persistGapCensus,
} from '@/lib/sherlock/curation/gapCensus227a';
import {
  effectiveChangeClass,
  type ChangeClass,
} from '@/lib/sherlock/curation/fieldClassMap227a';

export type CurationCycleResult = {
  ok: boolean;
  cycleId: string | null;
  halted: boolean;
  census: Awaited<ReturnType<typeof computeGapCensus>> | null;
  proposalsRaised: Record<string, number>;
  negativeResults: number;
  error?: string;
};

async function isKillSwitchHalted(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('sherlock_curation_kill_switch')
    .select('is_halted')
    .eq('id', 1)
    .maybeSingle();
  return data?.is_halted === true;
}

export async function runCurationCycle227a(opts?: {
  maxClass3Proposals?: number;
}): Promise<CurationCycleResult> {
  const admin = createAdminClient();
  const maxClass3 = Math.min(20, Math.max(1, opts?.maxClass3Proposals ?? 5));
  const proposalsRaised: Record<string, number> = {
    '0': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };
  let negativeResults = 0;

  if (await isKillSwitchHalted()) {
    return {
      ok: true,
      cycleId: null,
      halted: true,
      census: null,
      proposalsRaised,
      negativeResults: 0,
      error: 'kill_switch_halted',
    };
  }

  const { data: cycle, error: cycleErr } = await admin
    .from('curation_cycles')
    .insert({
      agent_id: 'sherlock_curation',
      status: 'running',
      gaps_selected: [{ priority: 2, gap: 'unknown_regulatory' }],
    })
    .select('id')
    .maybeSingle();

  if (cycleErr || !cycle?.id) {
    return {
      ok: false,
      cycleId: null,
      halted: false,
      census: null,
      proposalsRaised,
      negativeResults: 0,
      error: cycleErr?.message ?? 'cycle_insert_failed',
    };
  }

  const cycleId = String(cycle.id);

  try {
    const census = await computeGapCensus();
    await persistGapCensus({ cycleId, counts: census });

    // Priority 2: UNKNOWN regulatory fields -> Class 3 proposals (Lex+Jeffery), capped.
    const { data: unknowns } = await admin
      .from('kb_peptides')
      .select('id, slug, fda_status, wada_status, fda_503a_category')
      .eq('exclusion_tier', 'educational')
      .or(
        'fda_status.eq.unknown,wada_status.eq.unknown,fda_503a_category.eq.unknown',
      )
      .limit(maxClass3);

    for (const p of unknowns ?? []) {
      const fields: Array<{ field: string; current: string }> = [];
      if (String(p.fda_status) === 'unknown') {
        fields.push({ field: 'fda_status', current: 'unknown' });
      }
      if (String(p.wada_status) === 'unknown') {
        fields.push({ field: 'wada_status', current: 'unknown' });
      }
      if (String(p.fda_503a_category) === 'unknown') {
        fields.push({ field: 'fda_503a_category', current: 'unknown' });
      }
      for (const f of fields.slice(0, 1)) {
        const changeClass: ChangeClass = effectiveChangeClass({
          targetTable: 'kb_peptides',
          targetField: f.field,
          direction: 'correction',
        });
        const { error } = await admin.from('curation_proposals').insert({
          cycle_id: cycleId,
          gap_type: 'unknown_regulatory',
          target_table: 'kb_peptides',
          target_row_id: p.id,
          target_field: f.field,
          change_class: changeClass,
          direction: 'correction',
          current_value: { value: f.current },
          proposed_value: {
            action: 'investigate_and_fill',
            note: 'Sherlock proposes review; does not invent regulatory values.',
          },
          rationale: `Educational peptide ${p.slug} has UNKNOWN ${f.field}. Priority 2 gap. Class ${changeClass} requires Jeffery and Lex. No auto-fill.`,
          source_tier: 1,
          confidence: 0.4,
          status: 'proposed',
        });
        if (!error) {
          proposalsRaised[String(changeClass)] =
            (proposalsRaised[String(changeClass)] ?? 0) + 1;
        }
      }
    }

    // Priority 6 style negative: compounds with zero evidence links (confirm empty).
    const { data: educational } = await admin
      .from('kb_peptides')
      .select('id, slug')
      .eq('exclusion_tier', 'educational')
      .limit(30);
    const { data: links } = await admin
      .from('kb_peptide_evidence_links')
      .select('peptide_id')
      .limit(5000);
    const linked = new Set((links ?? []).map((l) => String(l.peptide_id)));
    const zeroLink = (educational ?? []).filter((p) => !linked.has(String(p.id)));

    for (const p of zeroLink.slice(0, 5)) {
      const { error } = await admin.from('curation_negative_results').insert({
        cycle_id: cycleId,
        gap_type: 'zero_evidence_links',
        target_row_id: p.id,
        query_terms_used: [String(p.slug)],
        sources_searched: ['kb_peptide_evidence_links'],
        date_range_covered: new Date().toISOString().slice(0, 10),
        result_count: 0,
        interpretation: `No evidence links currently stored for ${p.slug}. Confirmed empty in this cycle census, not an external search.`,
      });
      if (!error) negativeResults += 1;
    }

    const gapsClosed =
      Object.values(proposalsRaised).reduce((a, b) => a + b, 0) +
      negativeResults;

    await admin
      .from('curation_cycles')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        gaps_closed: gapsClosed,
        proposals_raised: proposalsRaised,
        negative_results_count: negativeResults,
        budget: { maxClass3, note: 'wave_a_minimal_cycle' },
        yield_by_source_tier: { '1': proposalsRaised['3'] ?? 0 },
      })
      .eq('id', cycleId);

    return {
      ok: true,
      cycleId,
      halted: false,
      census,
      proposalsRaised,
      negativeResults,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.warn('sherlock.curation.cycle', 'failed', { error: message });
    await admin
      .from('curation_cycles')
      .update({
        status: 'failed',
        ended_at: new Date().toISOString(),
        error_message: message.slice(0, 500),
      })
      .eq('id', cycleId);
    return {
      ok: false,
      cycleId,
      halted: false,
      census: null,
      proposalsRaised,
      negativeResults,
      error: message,
    };
  }
}
