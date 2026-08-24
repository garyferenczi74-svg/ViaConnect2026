/**
 * Prompt 227e: Collection 14 retraction and trial-status watch (Thanos).
 * Flags pubs/trials immediately; cascades to evidence links; Class 1 honesty/grade.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { pubmedEfetchDetails } from '@/lib/hounddog/ingest/pubmed';
import { fetchCtgovStudy } from '@/lib/thanos/ctgovClient';
import { normalizeCtgovStudy } from '@/lib/thanos/normalizeCtgov';
import {
  detectRetractionFromPubmedMeta,
  isAdverseTrialStatus,
  nextWorseGrade,
} from '@/lib/thanos/retractionDetect227e';
import {
  computeHonestyLayerForPeptide,
} from '@/lib/thanos/computeHonestyLayer';
import { applyClass01Batch } from '@/lib/thanos/applyCurationProposals227ah';

export type RetractionWatchResult = {
  ok: boolean;
  pubsChecked: number;
  pubsNewlyFlagged: number;
  trialsChecked: number;
  trialsStatusChanged: number;
  linksFlagged: number;
  peptidesTouched: string[];
  honestyRefreshed: number;
  gradeProposalsRaised: number;
  applyResult?: Awaited<ReturnType<typeof applyClass01Batch>>;
  error?: string;
};

function extractNct(canonical: string, registryIds: unknown): string | null {
  const fromCanon = canonical.match(/NCT\d+/i);
  if (fromCanon) return fromCanon[0].toUpperCase();
  if (registryIds && typeof registryIds === 'object') {
    const n = (registryIds as { nctId?: string }).nctId;
    if (n && /^NCT\d+$/i.test(n)) return n.toUpperCase();
  }
  return null;
}

export async function runRetractionWatch227e(opts?: {
  maxPubs?: number;
  maxTrials?: number;
}): Promise<RetractionWatchResult> {
  const admin = createAdminClient();
  const maxPubs = Math.min(40, Math.max(1, opts?.maxPubs ?? 20));
  const maxTrials = Math.min(40, Math.max(1, opts?.maxTrials ?? 20));
  const result: RetractionWatchResult = {
    ok: true,
    pubsChecked: 0,
    pubsNewlyFlagged: 0,
    trialsChecked: 0,
    trialsStatusChanged: 0,
    linksFlagged: 0,
    peptidesTouched: [],
    honestyRefreshed: 0,
    gradeProposalsRaised: 0,
  };

  const touchedPeptides = new Set<string>();

  try {
    // --- Publications ---
    const { data: pubs } = await admin
      .from('kb_publications')
      .select('id, pmid, is_retracted, publication_types')
      .not('pmid', 'is', null)
      .order('last_retraction_check_at', {
        ascending: true,
        nullsFirst: true,
      })
      .limit(maxPubs);

    const pmidToId = new Map<string, string>();
    for (const p of pubs ?? []) {
      if (p.pmid) pmidToId.set(String(p.pmid), String(p.id));
    }
    const pmids = [...pmidToId.keys()];
    result.pubsChecked = pmids.length;

    if (pmids.length > 0) {
      const details = await pubmedEfetchDetails(pmids);
      const now = new Date().toISOString();

      for (const [pmid, detail] of details.entries()) {
        const pubId = pmidToId.get(pmid);
        if (!pubId) continue;

        const hit = detectRetractionFromPubmedMeta({
          publicationTypes: detail.publicationTypes,
          commentCorrectionRefs: detail.commentCorrectionRefs,
        });

        const updates: Record<string, unknown> = {
          last_retraction_check_at: now,
          last_verified_at: now,
          publication_types: detail.publicationTypes,
        };

        const row = (pubs ?? []).find((p) => String(p.id) === pubId);
        const already = row?.is_retracted === true;

        // Erratum alone updates types; only retracted / EoC / retraction_of cascade.
        const cascadeKinds = new Set([
          'retracted',
          'retraction_of',
          'expression_of_concern',
        ]);
        if (hit && cascadeKinds.has(hit.kind) && !already) {
          updates.is_retracted = true;
          updates.retraction_kind = hit.kind;
          updates.retraction_notice_pmid = hit.noticePmid ?? null;
          updates.retracted_detected_at = now;
          result.pubsNewlyFlagged += 1;

          const { data: links } = await admin
            .from('kb_peptide_evidence_links')
            .select('id, peptide_id')
            .eq('publication_id', pubId);
          for (const link of links ?? []) {
            await admin
              .from('kb_peptide_evidence_links')
              .update({
                support_flagged: true,
                support_flag_reason: `publication_${hit.kind}:${pmid}`,
              })
              .eq('id', link.id);
            result.linksFlagged += 1;
            if (link.peptide_id) touchedPeptides.add(String(link.peptide_id));
          }

          await admin.from('curation_corrections').insert({
            compound_slug: null,
            what_changed: `kb_publications.is_retracted pmid=${pmid}`,
            why: `Detected ${hit.kind} via ${hit.matchedOn}`,
            direction: 'correction',
            triggering_record_id: pubId,
            public_summary: `A publication we cite (PMID ${pmid}) was flagged as ${hit.kind.replace(/_/g, ' ')}. Dependent evidence links were flagged and honesty counts will be refreshed.`,
            marshall_status: 'pending',
          });
        } else if (hit && hit.kind === 'erratum') {
          updates.retraction_kind = 'erratum';
        }

        await admin.from('kb_publications').update(updates).eq('id', pubId);
      }

      // Bump check time even when NCBI returned nothing for a PMID
      for (const p of pubs ?? []) {
        if (!details.has(String(p.pmid))) {
          await admin
            .from('kb_publications')
            .update({ last_retraction_check_at: now })
            .eq('id', p.id);
        }
      }
    }

    // --- Trials ---
    const { data: trials } = await admin
      .from('kb_trials')
      .select('id, canonical_trial_id, registry_ids, status, status_reason')
      .order('last_status_check_at', { ascending: true, nullsFirst: true })
      .limit(maxTrials);

    for (const t of trials ?? []) {
      const nct = extractNct(
        String(t.canonical_trial_id ?? ''),
        t.registry_ids,
      );
      const now = new Date().toISOString();
      if (!nct) {
        await admin
          .from('kb_trials')
          .update({ last_status_check_at: now })
          .eq('id', t.id);
        continue;
      }

      result.trialsChecked += 1;
      const fetched = await fetchCtgovStudy(nct);
      if (!fetched.ok || !fetched.study) {
        await admin
          .from('kb_trials')
          .update({ last_status_check_at: now })
          .eq('id', t.id);
        continue;
      }

      const norm = normalizeCtgovStudy(fetched.study);
      if (!norm) {
        await admin
          .from('kb_trials')
          .update({ last_status_check_at: now })
          .eq('id', t.id);
        continue;
      }

      const prev = String(t.status ?? 'unknown');
      const next = String(norm.status ?? 'unknown');
      const changed = prev !== next;

      const updates: Record<string, unknown> = {
        last_status_check_at: now,
        last_verified_at: now,
        status: next,
        status_reason: norm.statusReason ?? t.status_reason,
      };

      if (changed) {
        updates.prior_status = prev;
        updates.status_changed_at = now;
        result.trialsStatusChanged += 1;

        if (isAdverseTrialStatus(next)) {
          const { data: links } = await admin
            .from('kb_peptide_evidence_links')
            .select('id, peptide_id')
            .eq('trial_id', t.id);
          for (const link of links ?? []) {
            await admin
              .from('kb_peptide_evidence_links')
              .update({
                support_flagged: true,
                support_flag_reason: `trial_status:${prev}->${next}`,
              })
              .eq('id', link.id);
            result.linksFlagged += 1;
            if (link.peptide_id) touchedPeptides.add(String(link.peptide_id));
          }

          await admin.from('curation_corrections').insert({
            compound_slug: null,
            what_changed: `kb_trials.status ${prev} -> ${next} (${nct})`,
            why: norm.statusReason
              ? `Registry status change: ${String(norm.statusReason).slice(0, 200)}`
              : `Registry status change ${prev} to ${next}`,
            direction: 'correction',
            triggering_record_id: t.id,
            public_summary: `A clinical trial we cite (${nct}) changed status from ${prev} to ${next}. Dependent evidence links were flagged.`,
            marshall_status: 'pending',
          });
        }
      }

      await admin.from('kb_trials').update(updates).eq('id', t.id);
    }

    // --- Cascade honesty + optional grade downgrade ---
    result.peptidesTouched = [...touchedPeptides];
    for (const peptideId of touchedPeptides) {
      const before = await computeHonestyLayerForPeptide(peptideId);
      const { data: pep } = await admin
        .from('kb_peptides')
        .select('id, slug, evidence_grade_overall, honesty_layer')
        .eq('id', peptideId)
        .maybeSingle();
      if (!pep) continue;

      const priorHonesty =
        pep.honesty_layer && typeof pep.honesty_layer === 'object'
          ? (pep.honesty_layer as Record<string, unknown>)
          : {};
      const priorHuman = Number(priorHonesty.publications_human ?? 0);

      await admin.from('curation_proposals').insert({
        gap_type: 'retraction_watch',
        target_table: 'kb_peptides',
        target_row_id: peptideId,
        target_field: 'honesty_layer',
        change_class: 1,
        direction: 'correction',
        current_value: { honesty_layer: priorHonesty },
        proposed_value: { action: 'refresh_honesty_layer' },
        rationale: `Retraction/status watch touched peptide ${pep.slug}. Refresh honesty layer.`,
        status: 'proposed',
        confidence: 0.85,
        source_tier: 1,
      });

      const after = await computeHonestyLayerForPeptide(peptideId);
      await admin
        .from('kb_peptides')
        .update({ honesty_layer: after })
        .eq('id', peptideId);
      result.honestyRefreshed += 1;

      // Mark honesty proposal auto_applied without going through batch for clarity
      await admin
        .from('curation_proposals')
        .update({
          status: 'auto_applied',
          applied_by: 'thanos',
          applied_at: new Date().toISOString(),
          prior_value: { honesty_layer: priorHonesty },
          proposed_value: { honesty_layer: after },
        })
        .eq('target_row_id', peptideId)
        .eq('target_field', 'honesty_layer')
        .eq('status', 'proposed')
        .eq('gap_type', 'retraction_watch');

      if (
        priorHuman > 0 &&
        after.publications_human === 0 &&
        pep.evidence_grade_overall
      ) {
        const worse = nextWorseGrade(String(pep.evidence_grade_overall));
        if (worse) {
          await admin.from('curation_proposals').insert({
            gap_type: 'retraction_watch',
            target_table: 'kb_peptides',
            target_row_id: peptideId,
            target_field: 'evidence_grade_overall',
            change_class: 1,
            direction: 'correction',
            current_value: {
              evidence_grade_overall: pep.evidence_grade_overall,
            },
            proposed_value: { next_grade: worse, is_upgrade: false },
            rationale: `Human publication count dropped to 0 after retraction watch for ${pep.slug}. Class 1 downgrade.`,
            status: 'proposed',
            confidence: 0.8,
            source_tier: 1,
          });
          result.gradeProposalsRaised += 1;
        }
      }

      void before;
    }

    if (result.gradeProposalsRaised > 0) {
      result.applyResult = await applyClass01Batch({ limit: 20 });
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.warn('thanos.retractionWatch227e', 'failed', { error: message });
    return { ...result, ok: false, error: message };
  }
}

/** Prove helper: synthetically flag one publication and cascade. */
export async function proveSyntheticRetractionFlag(): Promise<{
  ok: boolean;
  pubId?: string;
  pmid?: string;
  linksFlagged: number;
  error?: string;
}> {
  const admin = createAdminClient();
  const { data: pub } = await admin
    .from('kb_publications')
    .select('id, pmid, is_retracted')
    .eq('is_human', true)
    .eq('is_retracted', false)
    .not('pmid', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!pub?.id) {
    return { ok: false, linksFlagged: 0, error: 'no_human_pub_to_flag' };
  }

  const now = new Date().toISOString();
  await admin
    .from('kb_publications')
    .update({
      is_retracted: true,
      retraction_kind: 'expression_of_concern',
      retracted_detected_at: now,
      last_retraction_check_at: now,
    })
    .eq('id', pub.id);

  const { data: links } = await admin
    .from('kb_peptide_evidence_links')
    .select('id, peptide_id')
    .eq('publication_id', pub.id);

  let linksFlagged = 0;
  for (const link of links ?? []) {
    await admin
      .from('kb_peptide_evidence_links')
      .update({
        support_flagged: true,
        support_flag_reason: 'prove_227e_synthetic_eoc',
      })
      .eq('id', link.id);
    linksFlagged += 1;
  }

  await admin.from('curation_corrections').insert({
    compound_slug: null,
    what_changed: `prove_227e synthetic EoC pmid=${pub.pmid}`,
    why: 'Synthetic prove flag for retraction watch cascade',
    direction: 'correction',
    triggering_record_id: pub.id,
    public_summary: `Prove 227e: PMID ${pub.pmid} was synthetically flagged as expression of concern to verify cascade. This may be cleared after prove.`,
    marshall_status: 'pending',
  });

  return {
    ok: true,
    pubId: String(pub.id),
    pmid: pub.pmid ? String(pub.pmid) : undefined,
    linksFlagged,
  };
}
