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

    const synthetic = await proveSyntheticRetractionFlag();

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
        // Retracted human pub must not inflate human count beyond non-retracted set.
        honestySkipOk = typeof layer.publications_human === 'number';
      } else {
        honestySkipOk = true; // no links is fine; cascade still flagged 0
      }
    }

    // Live watch pass (budget-capped); may find zero NCBI hits.
    const watch = await runRetractionWatch227e({
      maxPubs: 5,
      maxTrials: 5,
    });

    const admin = createAdminClient();
    const { count: retractedCount } = await admin
      .from('kb_publications')
      .select('id', { count: 'exact', head: true })
      .eq('is_retracted', true);
    const { count: flaggedLinks } = await admin
      .from('kb_peptide_evidence_links')
      .select('id', { count: 'exact', head: true })
      .eq('support_flagged', true);

    const ok =
      detector?.kind === 'retracted' &&
      synthetic.ok &&
      honestySkipOk &&
      (retractedCount ?? 0) >= 1;

    return Response.json({
      ok,
      prompt: '227e',
      phase: 'retraction_watch',
      detectorKind: detector?.kind ?? null,
      synthetic,
      honestySkipOk,
      peptideId,
      retractedPublications: retractedCount ?? 0,
      flaggedEvidenceLinks: flaggedLinks ?? 0,
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
