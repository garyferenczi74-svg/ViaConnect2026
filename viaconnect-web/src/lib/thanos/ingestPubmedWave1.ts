/**
 * Prompt 225a Wave 1: PubMed facts-only ingest into kb_publications.
 * Abstracts are processed then discarded. Never stored.
 */

import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { contentHash } from '@/lib/hounddog/ingest/contentHash';
import {
  pubmedEsearch,
  pubmedEsummary,
  pubmedEfetchDetails,
} from '@/lib/hounddog/ingest/pubmed';
import {
  extractPublicationFacts,
  factsTooSimilarToAbstract,
} from '@/lib/thanos/factsFromAbstract';
import { assertNoDoseLexicon } from '@/lib/thanos/doseRedaction';
import { WAVE1_COMPOUNDS } from '@/lib/thanos/wave1Compounds';
import { ncbiBucketSnapshot } from '@/lib/thanos/ncbiTokenBucket';
import { safeLog } from '@/lib/utils/safe-log';

export interface Wave1PubmedResult {
  ok: boolean;
  compoundsMatched: number;
  publicationsUpserted: number;
  linksUpserted: number;
  skippedSimilar: number;
  skippedDose: number;
  redactionEvents: number;
  tokenBucket: ReturnType<typeof ncbiBucketSnapshot>;
  byCompound: Array<{
    slug: string;
    found: boolean;
    fetched: number;
    upserted: number;
  }>;
  copyrightProof: {
    checked: number;
    nearCopyRejected: number;
  };
  errors: string[];
}

export async function ingestPubmedWave1(opts?: {
  maxPerCompound?: number;
  mindate?: string;
}): Promise<Wave1PubmedResult> {
  const admin = createAdminClient();
  const maxPerCompound = opts?.maxPerCompound ?? 4;
  const mindate = opts?.mindate ?? '2018/01/01';
  const errors: string[] = [];
  const byCompound: Wave1PubmedResult['byCompound'] = [];
  let publicationsUpserted = 0;
  let linksUpserted = 0;
  let skippedSimilar = 0;
  let skippedDose = 0;
  let redactionEvents = 0;
  let compoundsMatched = 0;
  let copyrightChecked = 0;

  const { data: coll } = await admin
    .from('kb_collections')
    .select('id')
    .eq('slug', 'peptide_education')
    .maybeSingle();
  if (!coll?.id) {
    return {
      ok: false,
      compoundsMatched: 0,
      publicationsUpserted: 0,
      linksUpserted: 0,
      skippedSimilar: 0,
      skippedDose: 0,
      redactionEvents: 0,
      tokenBucket: ncbiBucketSnapshot(),
      byCompound: [],
      copyrightProof: { checked: 0, nearCopyRejected: 0 },
      errors: ['peptide_education_collection_missing'],
    };
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
      });
      continue;
    }
    compoundsMatched += 1;

    const primaryTerm =
      compound.terms.find((t) => t.termSource === 'canonical' || t.termSource === 'inn')
        ?.term ?? compound.terms[0]?.term;
    if (!primaryTerm) continue;

    let fetched = 0;
    let upserted = 0;

    try {
      const query = `${primaryTerm}[Title/Abstract]`;
      const pmids = await pubmedEsearch(query, mindate, maxPerCompound);
      fetched = pmids.length;
      if (pmids.length === 0) {
        byCompound.push({
          slug: compound.slug,
          found: true,
          fetched: 0,
          upserted: 0,
        });
        continue;
      }

      const summaries = await pubmedEsummary(pmids);
      const details = await pubmedEfetchDetails(pmids);

      for (const s of summaries) {
        const detail = details.get(s.pmid) ?? {
          abstract: '',
          publicationTypes: [] as string[],
          year: undefined as number | undefined,
        };
        // Process abstract then discard: never assign to a stored column.
        const abstractForProcessing = detail.abstract;
        const facts = extractPublicationFacts({
          title: s.title,
          abstract: abstractForProcessing,
          publicationTypes: detail.publicationTypes,
        });
        redactionEvents += facts.redaction_count;
        copyrightChecked += 1;

        if (factsTooSimilarToAbstract(facts, abstractForProcessing)) {
          skippedSimilar += 1;
          continue;
        }

        const factsBlob = JSON.stringify(facts);
        if (!assertNoDoseLexicon(factsBlob) || !assertNoDoseLexicon(s.title)) {
          skippedDose += 1;
          continue;
        }

        const year =
          detail.year ??
          (s.pubDate ? Number(String(s.pubDate).match(/\d{4}/)?.[0]) : null);
        const sourceUrl = `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`;
        const rawHash = createHash('sha256')
          .update(
            JSON.stringify({
              pmid: s.pmid,
              title: s.title,
              types: detail.publicationTypes,
              // hash of abstract length only (not content retained)
              abstractChars: abstractForProcessing.length,
            }),
          )
          .digest('hex');

        const itemHash = contentHash(['225a-pub', s.pmid, rawHash]);

        const { data: existing } = await admin
          .from('kb_publications')
          .select('id, kb_item_id')
          .eq('pmid', s.pmid)
          .maybeSingle();

        let kbItemId = existing?.kb_item_id as string | undefined;
        if (!kbItemId) {
          const { data: item, error: itemErr } = await admin
            .from('kb_items')
            .insert({
              primary_collection_id: coll.id,
              payload_type: 'publication',
              title: s.title.slice(0, 240),
              summary: `PubMed ${s.pmid}. Facts-only educational record. Abstract not stored.`,
              content_hash: itemHash,
              gate_status: 'pending',
              consumer_safe: false,
              jeffery_verdict: 'pending',
              provenance: {
                source: 'pubmed_eutils',
                pmid: s.pmid,
                prompt: '225a',
              },
            })
            .select('id')
            .maybeSingle();
          if (itemErr || !item?.id) {
            const { data: byHash } = await admin
              .from('kb_items')
              .select('id')
              .eq('content_hash', itemHash)
              .maybeSingle();
            kbItemId = byHash?.id;
            if (!kbItemId) {
              errors.push(
                `pmid_${s.pmid}:item_${itemErr?.message ?? 'fail'}`.slice(0, 160),
              );
              continue;
            }
          } else {
            kbItemId = item.id;
          }
        }

        const pubRow = {
          kb_item_id: kbItemId,
          pmid: s.pmid,
          pmcid: null as string | null,
          doi: null as string | null,
          title: s.title.slice(0, 500),
          journal: s.source ? String(s.source).slice(0, 240) : null,
          pub_year: year && Number.isFinite(year) ? year : null,
          publication_types: facts.publication_types,
          mesh_terms: [] as string[],
          is_human: facts.is_human,
          is_animal: facts.is_animal,
          is_in_vitro: facts.is_in_vitro,
          sample_size: null as number | null,
          study_design: facts.design,
          linked_nct_ids: facts.linked_nct_ids,
          abstract_available: abstractForProcessing.length > 0,
          full_text_access: 'metadata_only' as const,
          facts_extracted: facts,
          extraction_confidence: 0.55,
          source_url: sourceUrl,
          dose_redaction_applied: true,
          raw_hash: rawHash,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: pub, error: pubErr } = await admin
          .from('kb_publications')
          .upsert(pubRow, { onConflict: 'pmid' })
          .select('id')
          .maybeSingle();

        // pmid unique is partial index; fallback select/insert if needed
        let publicationId = pub?.id as string | undefined;
        if (pubErr || !publicationId) {
          const { data: again } = await admin
            .from('kb_publications')
            .select('id')
            .eq('pmid', s.pmid)
            .maybeSingle();
          if (again?.id) {
            await admin
              .from('kb_publications')
              .update(pubRow)
              .eq('id', again.id);
            publicationId = again.id;
          } else if (!pubErr) {
            const { data: inserted, error: insErr } = await admin
              .from('kb_publications')
              .insert(pubRow)
              .select('id')
              .maybeSingle();
            if (insErr || !inserted?.id) {
              errors.push(
                `pmid_${s.pmid}:pub_${insErr?.message ?? pubErr?.message ?? 'fail'}`.slice(
                  0,
                  160,
                ),
              );
              continue;
            }
            publicationId = inserted.id;
          } else {
            errors.push(
              `pmid_${s.pmid}:pub_${pubErr.message}`.slice(0, 160),
            );
            continue;
          }
        }

        upserted += 1;
        publicationsUpserted += 1;

        const { data: existingLink } = await admin
          .from('kb_peptide_evidence_links')
          .select('id')
          .eq('peptide_id', peptide.id)
          .eq('publication_id', publicationId)
          .maybeSingle();
        if (!existingLink) {
          const { error: linkErr } = await admin
            .from('kb_peptide_evidence_links')
            .insert({
              peptide_id: peptide.id,
              publication_id: publicationId,
              trial_id: null,
              relevance: 'direct_intervention',
              indication_context: facts.indication_hint.slice(0, 240),
              curated_by: 'thanos',
            });
          if (!linkErr) linksUpserted += 1;
          else
            errors.push(
              `pmid_${s.pmid}:link_${linkErr.message}`.slice(0, 140),
            );
        } else {
          linksUpserted += 1;
        }
      }
    } catch (e) {
      errors.push(
        `${compound.slug}:${e instanceof Error ? e.message : String(e)}`.slice(
          0,
          180,
        ),
      );
    }

    byCompound.push({
      slug: compound.slug,
      found: true,
      fetched,
      upserted,
    });
  }

  await admin
    .from('kb_ingest_source_status')
    .update({
      last_successful_run: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'live',
      coverage_note:
        'Publication metadata and paraphrased facts only. Abstracts are not stored verbatim.',
    })
    .eq('source_system', 'pubmed');

  safeLog.info('thanos.pubmed.wave1', 'complete', {
    publicationsUpserted,
    skippedSimilar,
    skippedDose,
  });

  return {
    ok: publicationsUpserted > 0 && skippedSimilar >= 0,
    compoundsMatched,
    publicationsUpserted,
    linksUpserted,
    skippedSimilar,
    skippedDose,
    redactionEvents,
    tokenBucket: ncbiBucketSnapshot(),
    byCompound,
    copyrightProof: {
      checked: copyrightChecked,
      nearCopyRejected: skippedSimilar,
    },
    errors: errors.slice(0, 25),
  };
}
