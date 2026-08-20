/**
 * Prompt 225a Wave 1: CT.gov ingest into kb_trials with dose redaction.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { contentHash } from '@/lib/hounddog/ingest/contentHash';
import { fetchCtgovStudies } from '@/lib/thanos/ctgovClient';
import { normalizeCtgovStudy } from '@/lib/thanos/normalizeCtgov';
import { WAVE1_COMPOUNDS } from '@/lib/thanos/wave1Compounds';
import { assertNoDoseLexicon } from '@/lib/thanos/doseRedaction';
import { safeLog } from '@/lib/utils/safe-log';

export interface Wave1CtgovResult {
  ok: boolean;
  compoundsAttempted: number;
  compoundsMatched: number;
  trialsUpserted: number;
  linksUpserted: number;
  queryTermsSeeded: number;
  redactionEvents: number;
  doseLexiconClean: boolean;
  byCompound: Array<{
    slug: string;
    found: boolean;
    fetched: number;
    upserted: number;
    redactions: number;
  }>;
  semaglutideRedactionProof: {
    nctId: string | null;
    beforeSample: string | null;
    afterSample: string | null;
    afterPassesLexicon: boolean | null;
  };
  errors: string[];
}

async function seedQueryTerms(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  let seeded = 0;
  for (const compound of WAVE1_COMPOUNDS) {
    const { data: peptide } = await admin
      .from('kb_peptides')
      .select('id')
      .eq('slug', compound.slug)
      .maybeSingle();
    if (!peptide?.id) continue;

    for (const t of compound.terms) {
      for (const sourceSystem of ['ctgov', 'pubmed'] as const) {
        const { error } = await admin.from('kb_evidence_query_terms').upsert(
          {
            peptide_id: peptide.id,
            term: t.term,
            term_source: t.termSource,
            source_system: sourceSystem,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'peptide_id,term,source_system' },
        );
        if (!error) seeded += 1;
      }
    }
  }
  return seeded;
}

export async function ingestCtgovWave1(opts?: {
  pageSize?: number;
  maxPerCompound?: number;
}): Promise<Wave1CtgovResult> {
  const admin = createAdminClient();
  const pageSize = opts?.pageSize ?? 25;
  const maxPerCompound = opts?.maxPerCompound ?? 5;
  const errors: string[] = [];
  const byCompound: Wave1CtgovResult['byCompound'] = [];
  let trialsUpserted = 0;
  let linksUpserted = 0;
  let redactionEvents = 0;
  let compoundsMatched = 0;
  let doseLexiconClean = true;
  let semaglutideProof: Wave1CtgovResult['semaglutideRedactionProof'] = {
    nctId: null,
    beforeSample: null,
    afterSample: null,
    afterPassesLexicon: null,
  };

  const { data: coll } = await admin
    .from('kb_collections')
    .select('id')
    .eq('slug', 'peptide_education')
    .maybeSingle();
  if (!coll?.id) {
    return {
      ok: false,
      compoundsAttempted: 0,
      compoundsMatched: 0,
      trialsUpserted: 0,
      linksUpserted: 0,
      queryTermsSeeded: 0,
      redactionEvents: 0,
      doseLexiconClean: false,
      byCompound: [],
      semaglutideRedactionProof: semaglutideProof,
      errors: ['peptide_education_collection_missing'],
    };
  }

  let queryTermsSeeded = 0;
  try {
    queryTermsSeeded = await seedQueryTerms(admin);
  } catch (e) {
    errors.push(
      `query_terms:${e instanceof Error ? e.message : String(e)}`.slice(0, 200),
    );
  }

  // Dedicated semaglutide redaction proof (NCT record with dose language)
  try {
    const proofList = await fetchCtgovStudies({
      queryIntr: 'semaglutide',
      pageSize: 5,
      filterOverallStatus: 'COMPLETED',
    });
    if (proofList.ok) {
      for (const study of proofList.studies) {
        const norm = normalizeCtgovStudy(study);
        if (norm?.redactionProof) {
          semaglutideProof = {
            nctId: norm.nctId,
            beforeSample: norm.redactionProof.beforeSample,
            afterSample: norm.redactionProof.afterSample,
            afterPassesLexicon: assertNoDoseLexicon(
              norm.redactionProof.afterSample,
            ),
          };
          break;
        }
      }
    }
  } catch (e) {
    errors.push(
      `semaglutide_proof:${e instanceof Error ? e.message : String(e)}`.slice(
        0,
        160,
      ),
    );
  }

  for (const compound of WAVE1_COMPOUNDS) {
    const { data: peptide } = await admin
      .from('kb_peptides')
      .select('id, slug')
      .eq('slug', compound.slug)
      .maybeSingle();

    if (!peptide?.id) {
      byCompound.push({
        slug: compound.slug,
        found: false,
        fetched: 0,
        upserted: 0,
        redactions: 0,
      });
      continue;
    }
    compoundsMatched += 1;

    const primaryTerm =
      compound.terms.find((t) => t.termSource === 'canonical')?.term ??
      compound.terms[0]?.term;
    if (!primaryTerm) continue;

    let fetched = 0;
    let upserted = 0;
    let redactions = 0;

    try {
      const list = await fetchCtgovStudies({
        queryIntr: primaryTerm,
        pageSize,
      });
      if (!list.ok) {
        errors.push(`${compound.slug}:ctgov_${list.reason ?? 'fail'}`);
        byCompound.push({
          slug: compound.slug,
          found: true,
          fetched: 0,
          upserted: 0,
          redactions: 0,
        });
        continue;
      }

      const studies = list.studies.slice(0, maxPerCompound);
      fetched = studies.length;

      for (const study of studies) {
        const norm = normalizeCtgovStudy(study);
        if (!norm) continue;
        redactions += norm.redactionCount;
        redactionEvents += norm.redactionCount;

        const storedBlob = [
          norm.briefTitle,
          norm.officialTitle,
          ...norm.interventionNames,
          ...norm.primaryOutcomeTitles,
          norm.statusReason ?? '',
        ].join('\n');
        if (!assertNoDoseLexicon(storedBlob)) {
          doseLexiconClean = false;
          errors.push(`${norm.nctId}:dose_lexicon_survived`);
          continue;
        }

        if (!semaglutideProof.nctId && norm.redactionProof) {
          const looksLikeSemaglutide =
            /semaglutide/i.test(norm.briefTitle) ||
            norm.interventionNames.some((n) => /semaglutide/i.test(n)) ||
            primaryTerm.toLowerCase() === 'semaglutide';
          if (looksLikeSemaglutide) {
            semaglutideProof = {
              nctId: norm.nctId,
              beforeSample: norm.redactionProof.beforeSample,
              afterSample: norm.redactionProof.afterSample,
              afterPassesLexicon: assertNoDoseLexicon(
                norm.redactionProof.afterSample,
              ),
            };
          }
        }

        const itemHash = contentHash([
          '225a-trial',
          norm.canonicalTrialId,
          norm.rawHash,
        ]);

        const { data: existingTrial } = await admin
          .from('kb_trials')
          .select('id, kb_item_id')
          .eq('canonical_trial_id', norm.canonicalTrialId)
          .maybeSingle();

        let kbItemId = existingTrial?.kb_item_id as string | undefined;
        if (!kbItemId) {
          const { data: item, error: itemErr } = await admin
            .from('kb_items')
            .insert({
              primary_collection_id: coll.id,
              payload_type: 'clinical_trial',
              title: norm.briefTitle.slice(0, 240),
              summary: `ClinicalTrials.gov ${norm.nctId}. Phase ${norm.phase}. Status ${norm.status}. Dose-redacted educational trial record.`,
              content_hash: itemHash,
              gate_status: 'pending',
              consumer_safe: false,
              jeffery_verdict: 'pending',
              provenance: {
                source: 'ctgov_v2',
                nctId: norm.nctId,
                prompt: '225a',
              },
            })
            .select('id')
            .maybeSingle();
          if (itemErr || !item?.id) {
            // content_hash conflict: fetch existing
            const { data: byHash } = await admin
              .from('kb_items')
              .select('id')
              .eq('content_hash', itemHash)
              .maybeSingle();
            kbItemId = byHash?.id;
            if (!kbItemId) {
              errors.push(
                `${norm.nctId}:item_${itemErr?.message ?? 'insert_failed'}`.slice(
                  0,
                  180,
                ),
              );
              continue;
            }
          } else {
            kbItemId = item.id;
          }
        }

        const trialRow = {
          kb_item_id: kbItemId,
          canonical_trial_id: norm.canonicalTrialId,
          primary_registry: 'clinicaltrials_gov',
          registry_ids: { nctId: norm.nctId },
          brief_title: norm.briefTitle,
          official_title: norm.officialTitle,
          status: norm.status,
          status_reason: norm.statusReason,
          phase: norm.phase,
          study_type: norm.studyType,
          allocation: norm.allocation,
          masking: norm.masking,
          intervention_model: norm.interventionModel,
          enrollment_count: norm.enrollmentCount,
          enrollment_type: norm.enrollmentType,
          conditions: norm.conditions,
          intervention_names: norm.interventionNames,
          arm_count: norm.armCount,
          has_comparator: norm.hasComparator,
          comparator_type: norm.comparatorType,
          has_results_posted: norm.hasResultsPosted,
          primary_outcome_titles: norm.primaryOutcomeTitles,
          sponsor_name: norm.sponsorName,
          sponsor_class: norm.sponsorClass,
          countries: norm.countries,
          start_date: norm.startDate,
          completion_date: norm.completionDate,
          last_update_posted: norm.lastUpdatePosted,
          source_url: norm.sourceUrl,
          dose_redaction_applied: true,
          raw_hash: norm.rawHash,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: trial, error: trialErr } = await admin
          .from('kb_trials')
          .upsert(trialRow, { onConflict: 'canonical_trial_id' })
          .select('id')
          .maybeSingle();

        if (trialErr || !trial?.id) {
          errors.push(
            `${norm.nctId}:trial_${trialErr?.message ?? 'upsert_failed'}`.slice(
              0,
              180,
            ),
          );
          continue;
        }

        upserted += 1;
        trialsUpserted += 1;

        const { error: linkErr } = await admin
          .from('kb_peptide_evidence_links')
          .upsert(
            {
              peptide_id: peptide.id,
              trial_id: trial.id,
              publication_id: null,
              relevance: 'direct_intervention',
              indication_context: (norm.conditions[0] ?? 'unspecified').slice(
                0,
                240,
              ),
              curated_by: 'thanos',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'peptide_id,trial_id' },
          );
        // unique index is partial - upsert onConflict may need ignore
        if (!linkErr) {
          linksUpserted += 1;
        } else if (!/duplicate|unique/i.test(linkErr.message)) {
          // try insert-ignore via select
          const { data: existingLink } = await admin
            .from('kb_peptide_evidence_links')
            .select('id')
            .eq('peptide_id', peptide.id)
            .eq('trial_id', trial.id)
            .maybeSingle();
          if (!existingLink) {
            const { error: insErr } = await admin
              .from('kb_peptide_evidence_links')
              .insert({
                peptide_id: peptide.id,
                trial_id: trial.id,
                relevance: 'direct_intervention',
                indication_context: (norm.conditions[0] ?? 'unspecified').slice(
                  0,
                  240,
                ),
                curated_by: 'thanos',
              });
            if (!insErr) linksUpserted += 1;
            else
              errors.push(
                `${norm.nctId}:link_${insErr.message}`.slice(0, 160),
              );
          } else {
            linksUpserted += 1;
          }
        } else {
          linksUpserted += 1;
        }
      }
    } catch (e) {
      errors.push(
        `${compound.slug}:${e instanceof Error ? e.message : String(e)}`.slice(
          0,
          200,
        ),
      );
    }

    byCompound.push({
      slug: compound.slug,
      found: true,
      fetched,
      upserted,
      redactions,
    });

    // polite pause between compounds
    await new Promise((r) => setTimeout(r, 250));
  }

  // Update source status last successful run
  await admin
    .from('kb_ingest_source_status')
    .update({
      last_successful_run: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'live',
    })
    .eq('source_system', 'ctgov');

  safeLog.info('thanos.ctgov.wave1', 'complete', {
    trialsUpserted,
    linksUpserted,
    doseLexiconClean,
  });

  return {
    ok: trialsUpserted > 0 && doseLexiconClean && errors.length < 20,
    compoundsAttempted: WAVE1_COMPOUNDS.length,
    compoundsMatched,
    trialsUpserted,
    linksUpserted,
    queryTermsSeeded,
    redactionEvents,
    doseLexiconClean,
    byCompound,
    semaglutideRedactionProof: semaglutideProof,
    errors: errors.slice(0, 25),
  };
}
