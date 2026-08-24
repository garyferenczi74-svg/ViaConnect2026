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
import {
  isRejectedWithoutNewEvidence,
  proposalFingerprint,
} from '@/lib/sherlock/curation/rejectionLedger227ah';
import { loadBudgetCeiling } from '@/lib/sherlock/curation/budgetCeiling227d';

export type CurationCycleResult = {
  ok: boolean;
  cycleId: string | null;
  halted: boolean;
  census: Awaited<ReturnType<typeof computeGapCensus>> | null;
  proposalsRaised: Record<string, number>;
  proposalsSkippedRejected: number;
  negativeResults: number;
  budgetApplied?: {
    maxClass3: number;
    maxClass0: number;
    maxNegatives: number;
  };
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
  maxClass0Freshness?: number;
  maxNegativeSamples?: number;
}): Promise<CurationCycleResult> {
  const admin = createAdminClient();
  const ceiling = await loadBudgetCeiling();
  const maxClass3 = Math.min(
    20,
    Math.max(
      1,
      opts?.maxClass3Proposals ?? ceiling.maxClass3PerCycle ?? 5,
    ),
  );
  const maxClass0 = Math.min(
    10,
    Math.max(
      0,
      opts?.maxClass0Freshness ?? ceiling.maxClass0FreshnessPerCycle ?? 3,
    ),
  );
  const maxNegatives = Math.min(
    20,
    Math.max(
      0,
      opts?.maxNegativeSamples ?? ceiling.maxNegativeSamplesPerCycle ?? 5,
    ),
  );
  const proposalsRaised: Record<string, number> = {
    '0': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };
  let proposalsSkippedRejected = 0;
  let negativeResults = 0;

  if (await isKillSwitchHalted()) {
    return {
      ok: true,
      cycleId: null,
      halted: true,
      census: null,
      proposalsRaised,
      proposalsSkippedRejected: 0,
      negativeResults: 0,
      error: 'kill_switch_halted',
    };
  }

  const { data: cycle, error: cycleErr } = await admin
    .from('curation_cycles')
    .insert({
      agent_id: 'sherlock_curation',
      status: 'running',
      gaps_selected: [
        { priority: 2, gap: 'unknown_regulatory' },
        { priority: 9, gap: 'last_verified_sla' },
      ],
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
      proposalsSkippedRejected: 0,
      negativeResults: 0,
      error: cycleErr?.message ?? 'cycle_insert_failed',
    };
  }

  const cycleId = String(cycle.id);

  async function propose(args: {
    gapType: string;
    targetTable: string;
    targetRowId: string | null;
    targetField: string;
    changeClass: ChangeClass;
    direction: 'addition' | 'correction' | 'subtraction' | 'negative_result';
    currentValue: unknown;
    proposedValue: unknown;
    rationale: string;
    supportingRecordIds?: string[];
    sourceTier?: number;
    confidence?: number;
  }): Promise<boolean> {
    const supporting = args.supportingRecordIds ?? [];
    const fingerprint = proposalFingerprint({
      targetTable: args.targetTable,
      targetRowId: args.targetRowId,
      targetField: args.targetField,
      proposedValue: args.proposedValue,
    });
    const rejected = await isRejectedWithoutNewEvidence(
      admin,
      fingerprint,
      supporting,
    );
    if (rejected.blocked) {
      proposalsSkippedRejected += 1;
      return false;
    }

    const { error } = await admin.from('curation_proposals').insert({
      cycle_id: cycleId,
      gap_type: args.gapType,
      target_table: args.targetTable,
      target_row_id: args.targetRowId,
      target_field: args.targetField,
      change_class: args.changeClass,
      direction: args.direction,
      current_value: args.currentValue,
      proposed_value: args.proposedValue,
      rationale: args.rationale,
      supporting_record_ids: supporting,
      source_tier: args.sourceTier ?? 1,
      confidence: args.confidence ?? 0.5,
      status: 'proposed',
    });
    if (error) {
      safeLog.warn('sherlock.curation.cycle', 'proposal insert failed', {
        error: error.message,
      });
      return false;
    }
    proposalsRaised[String(args.changeClass)] =
      (proposalsRaised[String(args.changeClass)] ?? 0) + 1;
    return true;
  }

  try {
    const census = await computeGapCensus();
    await persistGapCensus({ cycleId, counts: census });

    // Priority 9: Class 0 last_verified_at freshness (Thanos auto-apply + revert).
    // Prefer stale rows; if none, refresh a small sample so apply/revert stays provable.
    if (maxClass0 > 0) {
      const staleBefore = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      let { data: staleTrials } = await admin
        .from('kb_trials')
        .select('id, last_verified_at')
        .or(`last_verified_at.is.null,last_verified_at.lt.${staleBefore}`)
        .limit(maxClass0);

      if (!staleTrials || staleTrials.length === 0) {
        const fresh = await admin
          .from('kb_trials')
          .select('id, last_verified_at')
          .limit(maxClass0);
        staleTrials = fresh.data ?? [];
      }

      for (const t of staleTrials ?? []) {
        await propose({
          gapType: 'last_verified_sla',
          targetTable: 'kb_trials',
          targetRowId: String(t.id),
          targetField: 'last_verified_at',
          changeClass: 0,
          direction: 'addition',
          currentValue: { last_verified_at: t.last_verified_at ?? null },
          proposedValue: { action: 'refresh_last_verified_at' },
          rationale:
            'Trial freshness refresh (SLA or sample). Class 0 for Thanos auto-apply and revert.',
          confidence: 0.7,
        });
      }
    }

    // Priority 2: UNKNOWN regulatory fields -> Class 3 proposals (Lex+Jeffery), capped.
    const { data: unknowns } = await admin
      .from('kb_peptides')
      .select('id, slug, fda_status, wada_status, fda_503a_category')
      .eq('exclusion_tier', 'educational')
      .or(
        'fda_status.eq.unknown,wada_status.eq.unknown,fda_503a_category.eq.unknown',
      )
      .order('id', { ascending: true })
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
        const proposedValue = {
          action: 'investigate_and_fill',
          note: 'Sherlock proposes review; does not invent regulatory values.',
        };
        await propose({
          gapType: 'unknown_regulatory',
          targetTable: 'kb_peptides',
          targetRowId: String(p.id),
          targetField: f.field,
          changeClass,
          direction: 'correction',
          currentValue: { value: f.current },
          proposedValue,
          rationale: `Educational peptide ${p.slug} has UNKNOWN ${f.field}. Priority 2 gap. Class ${changeClass} requires Jeffery and Lex. No auto-fill.`,
          confidence: 0.4,
        });
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
    const zeroLink = (educational ?? []).filter(
      (p) => !linked.has(String(p.id)),
    );

    for (const p of zeroLink.slice(0, maxNegatives)) {
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
        budget: {
          maxClass3,
          maxClass0,
          maxNegatives,
          proposalsSkippedRejected,
          ceilingNotes: ceiling.notes,
          note: 'g64_ceiling_applied',
        },
        yield_by_source_tier: { '1': proposalsRaised['3'] ?? 0 },
      })
      .eq('id', cycleId);

    return {
      ok: true,
      cycleId,
      halted: false,
      census,
      proposalsRaised,
      proposalsSkippedRejected,
      negativeResults,
      budgetApplied: { maxClass3, maxClass0, maxNegatives },
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
      proposalsSkippedRejected,
      negativeResults,
      error: message,
    };
  }
}
