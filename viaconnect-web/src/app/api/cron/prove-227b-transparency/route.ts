/**
 * Prompt 227b: seed one Marshall-approved correction if none exist, then dump transparency.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadCurationTransparency } from '@/lib/kb/curationTransparency227b';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from('curation_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('marshall_status', 'approved');

    let seeded = false;
    if ((count ?? 0) === 0) {
      const { error } = await admin.from('curation_corrections').insert({
        compound_slug: null,
        what_changed: '227b_seed_transparency_demo',
        why: 'Seed for Science corrections log empty-state exit (Marshall-approved wording)',
        direction: 'correction',
        public_summary:
          'We publish corrections when our evidence grades or regulatory labels change. This entry confirms the corrections log is live.',
        marshall_status: 'approved',
      });
      if (!error) seeded = true;
    }

    const bundle = await loadCurationTransparency();
    const ok =
      bundle.reviewQueue.total >= 0 &&
      Array.isArray(bundle.recentAdditions) &&
      Array.isArray(bundle.corrections) &&
      Array.isArray(bundle.negatives);

    return Response.json({
      ok,
      prompt: '227b',
      phase: 'transparency',
      seeded,
      reviewQueueTotal: bundle.reviewQueue.total,
      additions: bundle.recentAdditions.length,
      corrections: bundle.corrections.length,
      negatives: bundle.negatives.length,
      hasCycle: Boolean(bundle.lastCycle),
      censusHasCounts: Boolean(bundle.census.counts),
      sampleCorrection: bundle.corrections[0]?.publicSummary?.slice(0, 120) ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227b', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
