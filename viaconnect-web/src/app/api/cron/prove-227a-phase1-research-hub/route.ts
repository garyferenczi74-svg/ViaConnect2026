/**
 * Prompt 227a proof: evidence-lane Research Hub rows + 6h cron + no Mercola.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { createAdminClient } from '@/lib/supabase/admin';
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

    const { data: liveItems } = await admin
      .from('research_hub_items')
      .select('id, source_name, original_url, created_at, raw_metadata')
      .contains('raw_metadata', { prompt: '227a-evidence-lane' })
      .order('created_at', { ascending: false })
      .limit(50);

    // Also count Phase 1 Aging Cell live items
    const { data: aging } = await admin
      .from('research_hub_items')
      .select('id, original_url, raw_metadata')
      .eq('source_name', 'Aging Cell')
      .order('created_at', { ascending: false })
      .limit(30);

    const agingLive = (aging ?? []).filter(
      (r) =>
        Boolean((r.raw_metadata as { pmid?: string } | null)?.pmid) &&
        !String(r.original_url ?? '').includes('/sample/'),
    );

    const evidenceLive = (liveItems ?? []).filter(
      (r) => !String(r.original_url ?? '').includes('/sample/'),
    );

    const { data: runs } = await admin
      .from('pipeline_runs')
      .select('run_id, status, started_at, stages')
      .or(
        'run_id.like.ops-research-hub-phase1-%,run_id.like.ops-research-hub-evidence-%',
      )
      .order('started_at', { ascending: false })
      .limit(15);

    const { data: registry } = await admin
      .from('authorities_sources')
      .select(
        'domain,label,lane,transport,source_tier,registry_status,is_active,approval_status,journal_filter,feed_url',
      )
      .eq('lane', 'evidence')
      .order('source_tier', { ascending: true });

    const { data: mercola } = await admin
      .from('authorities_sources')
      .select('domain,lane,approval_status,registry_status,is_active')
      .ilike('domain', '%mercola%');

    const liveRegistry = (registry ?? []).filter(
      (r) =>
        r.is_active &&
        r.approval_status === 'approved' &&
        r.registry_status === 'live',
    );
    const eutilsLive = liveRegistry.filter((r) => r.transport === 'eutils');
    const rssLive = liveRegistry.filter((r) => r.transport === 'rss');

    const mercolaBlocked =
      (mercola ?? []).length === 0 ||
      (mercola ?? []).every(
        (m) =>
          m.lane === 'excluded' ||
          m.approval_status === 'rejected' ||
          m.registry_status === 'blocked' ||
          m.is_active === false,
      );

    const distinctSources = new Set(
      [...evidenceLive, ...agingLive].map((r) => r.source_name),
    );

    const ok =
      agingLive.length >= 2 &&
      eutilsLive.length >= 10 &&
      mercolaBlocked &&
      (runs?.length ?? 0) >= 2;

    return Response.json({
      ok,
      prompt: '227a',
      phase: 'evidence-lane-proof',
      agingLiveCount: agingLive.length,
      evidenceLaneItemCount: evidenceLive.length,
      distinctLiveSources: [...distinctSources],
      registryEvidenceLive: liveRegistry.length,
      eutilsLive: eutilsLive.length,
      rssLive: rssLive.length,
      mercolaBlocked,
      mercolaRows: mercola ?? [],
      recentRuns: (runs ?? []).slice(0, 5),
      sampleRegistry: liveRegistry.slice(0, 12).map((r) => ({
        domain: r.domain,
        label: r.label,
        tier: r.source_tier,
        transport: r.transport,
      })),
      notes: [
        'ok requires >=2 live Aging Cell items, >=10 live eutils registry rows,',
        'Mercola blocked/excluded, and >=2 research-hub pipeline runs.',
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227a-evidence', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
