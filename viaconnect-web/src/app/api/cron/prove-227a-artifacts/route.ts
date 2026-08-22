/**
 * Prompt 227a: row-level proof of curation cycle artifacts (219l).
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

    const [
      cycles,
      census,
      proposals,
      negatives,
      classMap,
      killSwitch,
      classDist,
    ] = await Promise.all([
      admin
        .from('curation_cycles')
        .select(
          'id, agent_id, status, gaps_closed, proposals_raised, negative_results_count, budget, started_at, ended_at',
        )
        .order('started_at', { ascending: false })
        .limit(3),
      admin
        .from('curation_gap_census_snapshots')
        .select('id, cycle_id, computed_at, counts')
        .order('computed_at', { ascending: false })
        .limit(1),
      admin
        .from('curation_proposals')
        .select(
          'id, cycle_id, gap_type, target_table, target_field, change_class, direction, status, proposed_value, rationale',
        )
        .order('created_at', { ascending: false })
        .limit(10),
      admin
        .from('curation_negative_results')
        .select(
          'id, cycle_id, gap_type, result_count, sources_searched, interpretation',
        )
        .order('created_at', { ascending: false })
        .limit(10),
      admin
        .from('curation_field_class_map')
        .select('target_table, target_field, change_class', { count: 'exact' }),
      admin
        .from('sherlock_curation_kill_switch')
        .select('is_halted, set_by, reason')
        .eq('id', 1)
        .maybeSingle(),
      admin.from('curation_proposals').select('change_class'),
    ]);

    const byClass: Record<string, number> = {};
    for (const row of classDist.data ?? []) {
      const k = String(row.change_class);
      byClass[k] = (byClass[k] ?? 0) + 1;
    }

    const latest = cycles.data?.[0] ?? null;
    const sampleProposals = (proposals.data ?? []).map((p) => ({
      id: p.id,
      change_class: p.change_class,
      target_field: p.target_field,
      direction: p.direction,
      status: p.status,
      action: (p.proposed_value as { action?: string } | null)?.action ?? null,
      rationalePrefix: String(p.rationale ?? '').slice(0, 120),
    }));

    const inventingValues = sampleProposals.some(
      (p) =>
        p.change_class === 3 &&
        p.action !== 'investigate_and_fill' &&
        p.action !== null,
    );

    const ok =
      Boolean(latest?.id) &&
      latest?.status === 'completed' &&
      (latest?.gaps_closed ?? 0) > 0 &&
      (classMap.count ?? 0) >= 10 &&
      killSwitch.data?.is_halted === false &&
      !inventingValues &&
      (negatives.data ?? []).every((n) => n.result_count === 0);

    return Response.json({
      ok,
      prompt: '227a',
      phase: 'wave_a_artifacts',
      latestCycle: latest,
      census: census.data?.[0] ?? null,
      fieldClassMapCount: classMap.count ?? 0,
      proposalsByClass: byClass,
      sampleProposals,
      sampleNegatives: (negatives.data ?? []).slice(0, 5).map((n) => ({
        id: n.id,
        gap_type: n.gap_type,
        result_count: n.result_count,
        sources_searched: n.sources_searched,
      })),
      killSwitch: killSwitch.data,
      inventingRegulatoryValuesBlocked: !inventingValues,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227a', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
