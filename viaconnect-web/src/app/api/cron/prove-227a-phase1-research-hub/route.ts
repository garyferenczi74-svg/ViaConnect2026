/**
 * Prompt 227a Phase 1 proof: rows for pipeline_runs, research_hub_items, cursor.
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

    const { data: items, error: itemsErr } = await admin
      .from('research_hub_items')
      .select('id, source_name, title, original_url, published_at, created_at, raw_metadata')
      .eq('source_name', 'Aging Cell')
      .order('created_at', { ascending: false })
      .limit(20);

    const liveItems = (items ?? []).filter((row) => {
      const meta = (row.raw_metadata ?? {}) as { pmid?: string; prompt?: string };
      return Boolean(meta.pmid) && !String(row.original_url ?? '').includes('/sample/');
    });

    const { data: ajcn } = await admin
      .from('research_hub_items')
      .select('id, source_name, title, original_url, created_at, raw_metadata')
      .eq('source_name', 'American Journal of Clinical Nutrition')
      .order('created_at', { ascending: false })
      .limit(10);

    const liveAjcn = (ajcn ?? []).filter((row) => {
      const meta = (row.raw_metadata ?? {}) as { pmid?: string };
      return Boolean(meta.pmid) && !String(row.original_url ?? '').includes('/sample/');
    });

    const { data: runs } = await admin
      .from('pipeline_runs')
      .select('run_id, status, started_at, ended_at, stages')
      .like('run_id', 'ops-research-hub-phase1-%')
      .order('started_at', { ascending: false })
      .limit(10);

    const { data: cursors } = await admin
      .from('discovery_cursors')
      .select(
        'source_key, topic_key, cursor_date, last_run_at, last_run_status, last_new_items, config',
      )
      .eq('source_key', 'research_hub')
      .in('topic_key', ['aging-cell', 'ajcn']);

    const pmids = liveItems
      .map((r) => (r.raw_metadata as { pmid?: string } | null)?.pmid)
      .filter(Boolean);
    const uniquePmids = new Set(pmids);

    const okRuns = (runs ?? []).filter((r) => r.status === 'ok');
    const ok =
      !itemsErr &&
      liveItems.length >= 2 &&
      okRuns.length >= 2 &&
      uniquePmids.size === pmids.length &&
      (cursors?.length ?? 0) >= 1;

    return Response.json({
      ok,
      prompt: '227a',
      phase: 'phase1-proof',
      liveAgingCellCount: liveItems.length,
      liveAjcnCount: liveAjcn.length,
      uniquePmids: uniquePmids.size,
      pipelineRuns: runs ?? [],
      okPipelineRuns: okRuns.length,
      cursors: cursors ?? [],
      sampleItems: liveItems.slice(0, 5).map((r) => ({
        id: r.id,
        title: String(r.title ?? '').slice(0, 120),
        url: r.original_url,
        created_at: r.created_at,
        pmid: (r.raw_metadata as { pmid?: string } | null)?.pmid ?? null,
      })),
      notes: [
        'ok requires >=2 live Aging Cell items (pmid metadata, non-sample URL),',
        '>=2 ok phase1 pipeline_runs, unique PMIDs, and a research_hub cursor row.',
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227a-phase1-rh', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
