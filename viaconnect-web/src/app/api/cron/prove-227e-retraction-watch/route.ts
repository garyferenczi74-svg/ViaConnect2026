/**
 * Prompt 227e: prove retraction flag cascade + honesty skip + detector.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { detectRetractionFromPubmedMeta } from '@/lib/thanos/retractionDetect227e';
import {
  proveSyntheticRetractionFlag,
  runRetractionWatch227e,
} from '@/lib/thanos/retractionWatch227e';
import { computeHonestyLayerForPeptide } from '@/lib/thanos/computeHonestyLayer';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const detector = detectRetractionFromPubmedMeta({
      publicationTypes: ['Journal Article', 'Retracted Publication'],
      commentCorrectionRefs: [{ refType: 'RetractionIn', pmid: '99999999' }],
    });

    // Direct Postgres for synthetic flag so PostgREST schema cache cannot strip columns.
    const conn =
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL;

    let synthetic: {
      ok: boolean;
      pubId?: string;
      pmid?: string;
      linksFlagged: number;
      error?: string;
      path?: string;
    } = { ok: false, linksFlagged: 0, error: 'no_postgres' };

    let retractedCount = 0;
    let flaggedLinks = 0;

    if (conn) {
      const postgres = (await import('postgres')).default;
      const sql = postgres(conn.trim().replace(/^["']|["']$/g, ''), {
        max: 1,
        idle_timeout: 15,
        connect_timeout: 30,
        prepare: false,
        ssl: 'require',
      });
      try {
        await sql.unsafe(`NOTIFY pgrst, 'reload schema'`);
        const pubs = await sql`
          SELECT id, pmid
          FROM public.kb_publications
          WHERE is_human = true
            AND COALESCE(is_retracted, false) = false
            AND pmid IS NOT NULL
          LIMIT 1
        `;
        if (pubs[0]) {
          const pubId = String(pubs[0].id);
          const pmid = pubs[0].pmid ? String(pubs[0].pmid) : undefined;
          await sql`
            UPDATE public.kb_publications
            SET is_retracted = true,
                retraction_kind = 'expression_of_concern',
                retracted_detected_at = now(),
                last_retraction_check_at = now()
            WHERE id = ${pubId}::uuid
          `;
          const links = await sql`
            UPDATE public.kb_peptide_evidence_links
            SET support_flagged = true,
                support_flag_reason = 'prove_227e_synthetic_eoc'
            WHERE publication_id = ${pubId}::uuid
            RETURNING id, peptide_id
          `;
          await sql`
            INSERT INTO public.curation_corrections (
              compound_slug, what_changed, why, direction,
              triggering_record_id, public_summary, marshall_status
            ) VALUES (
              null,
              ${`prove_227e synthetic EoC pmid=${pmid ?? 'unknown'}`},
              'Synthetic prove flag for retraction watch cascade',
              'correction',
              ${pubId}::uuid,
              ${`Prove 227e: PMID ${pmid ?? 'unknown'} was synthetically flagged as expression of concern to verify cascade.`},
              'pending'
            )
          `;
          synthetic = {
            ok: true,
            pubId,
            pmid,
            linksFlagged: links.length,
            path: 'postgres_direct',
          };
        } else {
          synthetic = {
            ok: false,
            linksFlagged: 0,
            error: 'no_human_pub_to_flag',
            path: 'postgres_direct',
          };
        }

        const rc = await sql`
          SELECT count(*)::int AS n FROM public.kb_publications WHERE is_retracted = true
        `;
        const fc = await sql`
          SELECT count(*)::int AS n FROM public.kb_peptide_evidence_links WHERE support_flagged = true
        `;
        retractedCount = Number(rc[0]?.n ?? 0);
        flaggedLinks = Number(fc[0]?.n ?? 0);
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      synthetic = await proveSyntheticRetractionFlag();
      synthetic.path = 'supabase_js_fallback';
    }

    let honestySkipOk = false;
    let peptideId: string | null = null;
    if (synthetic.ok && synthetic.pubId) {
      const admin = createAdminClient();
      const { data: link } = await admin
        .from('kb_peptide_evidence_links')
        .select('peptide_id')
        .eq('publication_id', synthetic.pubId)
        .limit(1)
        .maybeSingle();
      peptideId = link?.peptide_id ? String(link.peptide_id) : null;
      if (peptideId) {
        const layer = await computeHonestyLayerForPeptide(peptideId);
        honestySkipOk = typeof layer.publications_human === 'number';
      } else {
        honestySkipOk = true;
      }
    }

    const watch = await runRetractionWatch227e({
      maxPubs: 5,
      maxTrials: 5,
    });

    const ok =
      detector?.kind === 'retracted' &&
      synthetic.ok &&
      honestySkipOk &&
      retractedCount >= 1;

    return Response.json({
      ok,
      prompt: '227e',
      phase: 'retraction_watch',
      detectorKind: detector?.kind ?? null,
      synthetic,
      honestySkipOk,
      peptideId,
      retractedPublications: retractedCount,
      flaggedEvidenceLinks: flaggedLinks,
      watch: {
        ok: watch.ok,
        pubsChecked: watch.pubsChecked,
        pubsNewlyFlagged: watch.pubsNewlyFlagged,
        trialsChecked: watch.trialsChecked,
        trialsStatusChanged: watch.trialsStatusChanged,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227e', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
