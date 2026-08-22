/**
 * Prompt 227a Section 8: freshness SLA keyed to last_item_yielded_at.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export type FreshnessEvalResult = {
  ok: boolean;
  evaluated: number;
  fresh: number;
  quiet: number;
  breached: number;
  alertsRaised: number;
  aggregateBreach: boolean;
  runId: string;
  error?: string;
};

function parseThresholdMs(raw: unknown, fallbackDays = 14): number {
  if (typeof raw === 'string' && raw.includes(':')) {
    // Postgres interval often comes as "14 days" or "336:00:00"
    const days = raw.match(/(\d+)\s*day/i);
    if (days) return Number(days[1]) * 86400000;
    const hours = raw.match(/^(\d+):/);
    if (hours) return Number(hours[1]) * 3600000;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return fallbackDays * 86400000;
}

export async function evaluateFreshnessSla(options?: {
  syntheticBreachDomain?: string | null;
}): Promise<FreshnessEvalResult> {
  const runId = `ops-research-hub-freshness-${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  const admin = createAdminClient();
  const result: FreshnessEvalResult = {
    ok: false,
    evaluated: 0,
    fresh: 0,
    quiet: 0,
    breached: 0,
    alertsRaised: 0,
    aggregateBreach: false,
    runId,
  };

  try {
    // Optional synthetic four-month silence for drill
    if (options?.syntheticBreachDomain) {
      await admin
        .from('authorities_sources')
        .update({
          last_item_yielded_at: new Date(
            Date.now() - 120 * 86400000,
          ).toISOString(),
          last_successful_run: new Date().toISOString(),
        })
        .eq('domain', options.syntheticBreachDomain);
    }

    const { data: sources, error } = await admin
      .from('authorities_sources')
      .select(
        'domain,label,lane,registry_status,last_item_yielded_at,last_successful_run,staleness_threshold,staleness_state',
      )
      .in('lane', ['evidence', 'signal'])
      .eq('registry_status', 'live')
      .eq('is_active', true)
      .limit(200);

    if (error) {
      result.error = error.message;
      return result;
    }

    const now = Date.now();
    const breachedDomains: string[] = [];

    for (const src of sources ?? []) {
      result.evaluated += 1;
      const thresholdMs = parseThresholdMs(src.staleness_threshold, 14);
      const yielded = src.last_item_yielded_at
        ? new Date(String(src.last_item_yielded_at)).getTime()
        : null;
      let state: 'fresh' | 'quiet' | 'breached' = 'quiet';
      if (yielded != null && Number.isFinite(yielded)) {
        const age = now - yielded;
        if (age <= thresholdMs / 2) state = 'fresh';
        else if (age <= thresholdMs) state = 'quiet';
        else state = 'breached';
      } else {
        // Never yielded: if last_successful_run exists for a long time, still breached
        const lastRun = src.last_successful_run
          ? new Date(String(src.last_successful_run)).getTime()
          : null;
        if (lastRun != null && now - lastRun > thresholdMs) state = 'breached';
        else state = 'quiet';
      }

      if (state === 'fresh') result.fresh += 1;
      if (state === 'quiet') result.quiet += 1;
      if (state === 'breached') {
        result.breached += 1;
        breachedDomains.push(String(src.domain));
      }

      await admin
        .from('authorities_sources')
        .update({ staleness_state: state })
        .eq('domain', src.domain);

      if (state === 'breached') {
        const { error: alertErr } = await admin
          .from('source_freshness_alerts')
          .insert({
            source_domain: src.domain,
            alert_kind: 'breached',
            message: `Freshness SLA breached for ${src.label ?? src.domain}: no new item within threshold. Alert keyed to last_item_yielded_at, not run success.`,
            last_item_yielded_at: src.last_item_yielded_at,
            last_successful_run: src.last_successful_run,
            escalated: false,
          });
        if (!alertErr) result.alertsRaised += 1;
      }
    }

    if (breachedDomains.length >= 3) {
      result.aggregateBreach = true;
      await admin.from('source_freshness_alerts').insert({
        source_domain: '_aggregate_',
        alert_kind: 'aggregate_breach',
        message: `Aggregate freshness breach: ${breachedDomains.length} live sources silent. Escalating as pipeline-level fault.`,
        escalated: true,
      });
      result.alertsRaised += 1;
    }

    result.ok = true;
    await admin.from('pipeline_runs').upsert(
      {
        run_id: runId,
        run_date: startedAt.slice(0, 10),
        status: 'ok',
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        stages: {
          phase: '227a-freshness-sla',
          evaluated: result.evaluated,
          fresh: result.fresh,
          quiet: result.quiet,
          breached: result.breached,
          alertsRaised: result.alertsRaised,
          aggregateBreach: result.aggregateBreach,
          breachedDomains,
        },
      },
      { onConflict: 'run_id' },
    );
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    safeLog.error('research-hub.freshness', 'threw', { error: result.error });
    return result;
  }
}
