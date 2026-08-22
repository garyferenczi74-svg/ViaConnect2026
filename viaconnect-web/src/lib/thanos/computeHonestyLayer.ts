/**
 * Prompt 225a Section 8: compute honesty-layer counts from evidence links.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export interface HonestyLayer {
  trials_registered: number;
  trials_completed: number;
  trials_terminated_or_withdrawn: number;
  trials_with_results_posted: number;
  publications_human: number;
  publications_animal: number;
  systematic_reviews: number;
  terminated_for_safety: boolean;
  termination_reasons: string[];
  evidence_gap_statement: string;
  computed_at: string;
  coverage_note: string;
}

function gapStatement(h: Omit<HonestyLayer, 'evidence_gap_statement' | 'computed_at' | 'coverage_note'>): string {
  return (
    `Registration is not completion. Completion is not publication. Publication is not a positive result. ` +
    `For this compound, ${h.trials_registered} trials are registered, ${h.trials_completed} completed, ` +
    `${h.trials_with_results_posted} have posted results, and ${h.publications_human} have published human outcomes ` +
    `in linked evidence. Global registry coverage may be incomplete while ICTRP access is pending.`
  );
}

export async function computeHonestyLayerForPeptide(
  peptideId: string,
): Promise<HonestyLayer> {
  const admin = createAdminClient();

  const { data: links } = await admin
    .from('kb_peptide_evidence_links')
    .select('trial_id, publication_id')
    .eq('peptide_id', peptideId);

  const trialIds = [
    ...new Set(
      (links ?? [])
        .map((l) => l.trial_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const pubIds = [
    ...new Set(
      (links ?? [])
        .map((l) => l.publication_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let trials_registered = 0;
  let trials_completed = 0;
  let trials_terminated_or_withdrawn = 0;
  let trials_with_results_posted = 0;
  let terminated_for_safety = false;
  const termination_reasons: string[] = [];

  if (trialIds.length > 0) {
    const { data: trials } = await admin
      .from('kb_trials')
      .select('status, status_reason, has_results_posted')
      .in('id', trialIds);
    trials_registered = trials?.length ?? 0;
    for (const t of trials ?? []) {
      if (t.status === 'completed') trials_completed += 1;
      if (
        t.status === 'terminated' ||
        t.status === 'withdrawn' ||
        t.status === 'suspended'
      ) {
        trials_terminated_or_withdrawn += 1;
        const reason = String(t.status_reason ?? '').trim();
        if (reason) termination_reasons.push(reason.slice(0, 200));
        if (/safety|adverse|death|toxicity/i.test(reason)) {
          terminated_for_safety = true;
        }
      }
      if (t.has_results_posted === true) trials_with_results_posted += 1;
    }
  }

  let publications_human = 0;
  let publications_animal = 0;
  let systematic_reviews = 0;
  if (pubIds.length > 0) {
    const { data: pubs } = await admin
      .from('kb_publications')
      .select(
        'is_human, is_animal, publication_types, study_design, is_retracted',
      )
      .in('id', pubIds);
    for (const p of pubs ?? []) {
      // 227e: retracted / EoC pubs never count as supporting evidence.
      if (p.is_retracted === true) continue;
      if (p.is_human) publications_human += 1;
      if (p.is_animal) publications_animal += 1;
      const types = Array.isArray(p.publication_types)
        ? p.publication_types.join(' ')
        : '';
      const design = String(p.study_design ?? '');
      if (
        /systematic review/i.test(types) ||
        design === 'systematic_review' ||
        design === 'meta_analysis'
      ) {
        systematic_reviews += 1;
      }
    }
  }

  const base = {
    trials_registered,
    trials_completed,
    trials_terminated_or_withdrawn,
    trials_with_results_posted,
    publications_human,
    publications_animal,
    systematic_reviews,
    terminated_for_safety,
    termination_reasons: termination_reasons.slice(0, 5),
  };

  return {
    ...base,
    evidence_gap_statement: gapStatement(base),
    computed_at: new Date().toISOString(),
    coverage_note:
      'ICTRP global registry coverage may be incomplete (pending_access).',
  };
}

export async function refreshHonestyLayerAll(opts?: {
  limit?: number;
}): Promise<{
  ok: boolean;
  updated: number;
  zeroHumanExamples: Array<{ slug: string; statement: string }>;
  errors: string[];
}> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 200;
  const errors: string[] = [];
  let updated = 0;
  const zeroHumanExamples: Array<{ slug: string; statement: string }> = [];

  // Prefer peptides that already have evidence links; also refresh Wave 1 set.
  const { data: linked } = await admin
    .from('kb_peptide_evidence_links')
    .select('peptide_id')
    .limit(2000);
  const ids = [
    ...new Set(
      (linked ?? [])
        .map((r) => r.peptide_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ].slice(0, limit);

  for (const peptideId of ids) {
    try {
      const layer = await computeHonestyLayerForPeptide(peptideId);
      const { data: pep, error } = await admin
        .from('kb_peptides')
        .update({
          honesty_layer: layer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', peptideId)
        .select('slug')
        .maybeSingle();
      if (error) {
        errors.push(error.message.slice(0, 120));
        continue;
      }
      updated += 1;
      if (
        layer.trials_registered === 0 &&
        layer.publications_human === 0 &&
        pep?.slug &&
        zeroHumanExamples.length < 5
      ) {
        zeroHumanExamples.push({
          slug: pep.slug,
          statement: layer.evidence_gap_statement,
        });
      }
    } catch (e) {
      errors.push(
        (e instanceof Error ? e.message : String(e)).slice(0, 120),
      );
    }
  }

  safeLog.info('thanos.honesty', 'refreshed', { updated, errors: errors.length });
  return {
    ok: updated > 0,
    updated,
    zeroHumanExamples,
    errors: errors.slice(0, 20),
  };
}
