/**
 * Prompt 227ah: Thanos applies Class 0/1 curation proposals.
 * Class 2+ refused. Class 0 additive batches run through G61 cumulative-effect first.
 * Direct PubMed/CT.gov ingest remains a side channel until later waves.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  detectCumulativeEffect,
  type Class0BatchItem,
  type DerivedSnapshot,
} from '@/lib/sherlock/curation/cumulativeEffect227a';
import { canAutoApply, type ChangeClass } from '@/lib/sherlock/curation/fieldClassMap227a';
import { computeHonestyLayerForPeptide } from '@/lib/thanos/computeHonestyLayer';
import type { EvidenceGrade } from '@/lib/peptides/gradeCap226h';

export type ApplyBatchResult = {
  ok: boolean;
  applied: number;
  escalated: number;
  refused: number;
  skippedUnsupported: number;
  errors: string[];
  appliedIds: string[];
  escalatedIds: string[];
};

type ProposalRow = {
  id: string;
  target_table: string;
  target_row_id: string | null;
  target_field: string;
  change_class: number;
  direction: string;
  current_value: unknown;
  proposed_value: unknown;
  status: string;
};

function asGrade(v: unknown): EvidenceGrade {
  const s = String(v ?? 'C');
  if (s === 'A' || s === 'B' || s === 'C' || s === 'D' || s === 'E') return s;
  return 'C';
}

async function loadBaseline(peptideId: string): Promise<DerivedSnapshot | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('kb_peptides')
    .select('id, evidence_grade_overall, honesty_layer')
    .eq('id', peptideId)
    .maybeSingle();
  if (!data?.id) return null;
  const honesty =
    data.honesty_layer && typeof data.honesty_layer === 'object'
      ? (data.honesty_layer as Record<string, unknown>)
      : {};
  return {
    peptideId: String(data.id),
    evidenceGrade: asGrade(data.evidence_grade_overall),
    honestyTrialsRegistered: Number(honesty.trials_registered ?? 0),
    honestyPublicationsHuman: Number(honesty.publications_human ?? 0),
    institutionalConcentration: Number(honesty.institutional_concentration ?? 0),
    independentReplicationCount: Number(
      honesty.independent_replication_count ?? 0,
    ),
  };
}

function class0BatchItemFromProposal(p: ProposalRow): Class0BatchItem | null {
  const pv =
    p.proposed_value && typeof p.proposed_value === 'object'
      ? (p.proposed_value as Record<string, unknown>)
      : {};
  const peptideId =
    (typeof pv.peptide_id === 'string' && pv.peptide_id) ||
    (p.target_table === 'kb_peptides' ? p.target_row_id : null);
  if (!peptideId) return null;

  if (p.target_field === 'row_insert' && p.target_table === 'kb_trials') {
    return { peptideId, deltaTrialsRegistered: 1 };
  }
  if (p.target_field === 'row_insert' && p.target_table === 'kb_publications') {
    return {
      peptideId,
      deltaPublicationsHuman: 1,
      addsToLargestNetwork: pv.adds_to_largest_network === true,
    };
  }
  // last_verified_at does not change derived honesty/grade counts
  return { peptideId };
}

export async function applyClass01Batch(opts?: {
  limit?: number;
}): Promise<ApplyBatchResult> {
  const admin = createAdminClient();
  const limit = Math.min(50, Math.max(1, opts?.limit ?? 20));
  const result: ApplyBatchResult = {
    ok: true,
    applied: 0,
    escalated: 0,
    refused: 0,
    skippedUnsupported: 0,
    errors: [],
    appliedIds: [],
    escalatedIds: [],
  };

  const { data: rows, error } = await admin
    .from('curation_proposals')
    .select(
      'id, target_table, target_row_id, target_field, change_class, direction, current_value, proposed_value, status',
    )
    .eq('status', 'proposed')
    .in('change_class', [0, 1])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { ...result, ok: false, errors: [error.message] };
  }

  const proposals = (rows ?? []) as ProposalRow[];

  // G61: Class 0 additive batch cumulative check
  const class0 = proposals.filter((p) => p.change_class === 0);
  const batchItems: Class0BatchItem[] = [];
  const baselines: DerivedSnapshot[] = [];
  const seenPeptides = new Set<string>();

  for (const p of class0) {
    const item = class0BatchItemFromProposal(p);
    if (!item) continue;
    batchItems.push(item);
    if (!seenPeptides.has(item.peptideId)) {
      seenPeptides.add(item.peptideId);
      const base = await loadBaseline(item.peptideId);
      if (base) baselines.push(base);
    }
  }

  const cumulative = detectCumulativeEffect({ baselines, batch: batchItems });
  const escalatePeptides = new Set(cumulative.escalatedPeptideIds);

  for (const p of proposals) {
    const changeClass = p.change_class as ChangeClass;
    if (!canAutoApply(changeClass)) {
      result.refused += 1;
      continue;
    }

    if (changeClass === 0) {
      const item = class0BatchItemFromProposal(p);
      if (
        item &&
        escalatePeptides.has(item.peptideId) &&
        (p.target_field === 'row_insert' ||
          (p.proposed_value as { simulate_honesty_delta?: boolean } | null)
            ?.simulate_honesty_delta === true)
      ) {
        await admin
          .from('curation_proposals')
          .update({
            status: 'escalated',
            review_note: `G61 cumulative-effect: ${cumulative.reasons.join('; ')}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id);
        result.escalated += 1;
        result.escalatedIds.push(p.id);
        continue;
      }
    }

    try {
      const applied = await applyOne(p);
      if (applied === 'applied') {
        result.applied += 1;
        result.appliedIds.push(p.id);
      } else if (applied === 'unsupported') {
        result.skippedUnsupported += 1;
      } else if (applied === 'refused') {
        result.refused += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${p.id}:${message}`);
      safeLog.warn('thanos.curation.apply', 'proposal failed', {
        id: p.id,
        error: message,
      });
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}

/** Refuse Class 3+ explicitly (used by prove). */
export async function refuseIfNotAutoApplicable(
  changeClass: number,
): Promise<{ allowed: boolean }> {
  return { allowed: canAutoApply(changeClass as ChangeClass) };
}

async function applyOne(
  p: ProposalRow,
): Promise<'applied' | 'unsupported' | 'refused'> {
  const admin = createAdminClient();
  if (!canAutoApply(p.change_class as ChangeClass)) return 'refused';

  if (p.change_class === 0 && p.target_field === 'last_verified_at') {
    if (!p.target_row_id) return 'unsupported';
    if (p.target_table !== 'kb_trials' && p.target_table !== 'kb_publications') {
      return 'unsupported';
    }

    const { data: prior } = await admin
      .from(p.target_table)
      .select('id, last_verified_at')
      .eq('id', p.target_row_id)
      .maybeSingle();
    if (!prior?.id) return 'unsupported';

    const nextVerified = new Date().toISOString();
    const { error: updErr } = await admin
      .from(p.target_table)
      .update({ last_verified_at: nextVerified })
      .eq('id', p.target_row_id);
    if (updErr) throw new Error(updErr.message);

    const { error: markErr } = await admin
      .from('curation_proposals')
      .update({
        status: 'auto_applied',
        applied_by: 'thanos',
        applied_at: nextVerified,
        prior_value: { last_verified_at: prior.last_verified_at ?? null },
        proposed_value: { last_verified_at: nextVerified },
        updated_at: nextVerified,
      })
      .eq('id', p.id);
    if (markErr) throw new Error(markErr.message);
    return 'applied';
  }

  if (
    p.change_class === 0 &&
    p.target_field === 'row_insert' &&
    (p.proposed_value as { simulate_honesty_delta?: boolean } | null)
      ?.simulate_honesty_delta === true
  ) {
    // Synthetic G61-only proposals never insert rows; escalate path handles them.
    return 'unsupported';
  }

  if (p.change_class === 0 && p.target_field === 'row_insert') {
    // Hound Dog-backed inserts land in a later wave.
    return 'unsupported';
  }

  if (
    p.change_class === 1 &&
    p.target_table === 'kb_peptides' &&
    p.target_field === 'honesty_layer' &&
    p.target_row_id
  ) {
    const { data: prior } = await admin
      .from('kb_peptides')
      .select('id, honesty_layer')
      .eq('id', p.target_row_id)
      .maybeSingle();
    if (!prior?.id) return 'unsupported';

    const layer = await computeHonestyLayerForPeptide(p.target_row_id);
    const { error: updErr } = await admin
      .from('kb_peptides')
      .update({ honesty_layer: layer })
      .eq('id', p.target_row_id);
    if (updErr) throw new Error(updErr.message);

    const now = new Date().toISOString();
    await admin
      .from('curation_proposals')
      .update({
        status: 'auto_applied',
        applied_by: 'thanos',
        applied_at: now,
        prior_value: { honesty_layer: prior.honesty_layer ?? null },
        proposed_value: { honesty_layer: layer },
        updated_at: now,
      })
      .eq('id', p.id);
    return 'applied';
  }

  if (
    p.change_class === 1 &&
    p.target_table === 'kb_peptides' &&
    p.target_field === 'evidence_grade_overall' &&
    p.target_row_id
  ) {
    const pv =
      p.proposed_value && typeof p.proposed_value === 'object'
        ? (p.proposed_value as Record<string, unknown>)
        : {};
    if (pv.is_upgrade === true) return 'refused';
    const nextGrade = asGrade(pv.next_grade);
    const { data: prior } = await admin
      .from('kb_peptides')
      .select('id, evidence_grade_overall')
      .eq('id', p.target_row_id)
      .maybeSingle();
    if (!prior?.id) return 'unsupported';

    const { error: updErr } = await admin
      .from('kb_peptides')
      .update({ evidence_grade_overall: nextGrade })
      .eq('id', p.target_row_id);
    if (updErr) throw new Error(updErr.message);

    const now = new Date().toISOString();
    await admin
      .from('curation_proposals')
      .update({
        status: 'auto_applied',
        applied_by: 'thanos',
        applied_at: now,
        prior_value: { evidence_grade_overall: prior.evidence_grade_overall },
        proposed_value: { evidence_grade_overall: nextGrade, is_upgrade: false },
        updated_at: now,
      })
      .eq('id', p.id);
    return 'applied';
  }

  return 'unsupported';
}

export async function revertCurationProposal(proposalId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const admin = createAdminClient();
  const { data: p, error } = await admin
    .from('curation_proposals')
    .select(
      'id, status, change_class, target_table, target_row_id, target_field, prior_value, applied_by',
    )
    .eq('id', proposalId)
    .maybeSingle();

  if (error || !p) return { ok: false, error: error?.message ?? 'not_found' };
  if (p.status !== 'auto_applied') {
    return { ok: false, error: 'not_auto_applied' };
  }
  if (p.change_class !== 0 && p.change_class !== 1) {
    return { ok: false, error: 'class_not_revertible_here' };
  }
  if (!p.target_row_id) return { ok: false, error: 'no_target_row' };

  const prior =
    p.prior_value && typeof p.prior_value === 'object'
      ? (p.prior_value as Record<string, unknown>)
      : null;
  if (!prior) return { ok: false, error: 'no_prior_value' };

  if (p.target_field === 'last_verified_at') {
    const { error: updErr } = await admin
      .from(p.target_table)
      .update({ last_verified_at: prior.last_verified_at ?? null })
      .eq('id', p.target_row_id);
    if (updErr) return { ok: false, error: updErr.message };
  } else if (p.target_field === 'honesty_layer') {
    const { error: updErr } = await admin
      .from('kb_peptides')
      .update({ honesty_layer: prior.honesty_layer ?? {} })
      .eq('id', p.target_row_id);
    if (updErr) return { ok: false, error: updErr.message };
  } else if (p.target_field === 'evidence_grade_overall') {
    const { error: updErr } = await admin
      .from('kb_peptides')
      .update({
        evidence_grade_overall: prior.evidence_grade_overall ?? 'C',
      })
      .eq('id', p.target_row_id);
    if (updErr) return { ok: false, error: updErr.message };
  } else {
    return { ok: false, error: 'unsupported_revert_field' };
  }

  const now = new Date().toISOString();
  const { error: markErr } = await admin
    .from('curation_proposals')
    .update({
      reverted_at: now,
      revert_reason: 'one_call_revert_227ah',
      status: 'superseded',
      updated_at: now,
    })
    .eq('id', p.id);

  if (markErr) return { ok: false, error: markErr.message };
  return { ok: true };
}
