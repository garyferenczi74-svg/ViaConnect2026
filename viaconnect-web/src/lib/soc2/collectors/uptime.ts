// Prompt #122 P4: Uptime collector.
//
// A1.1, A1.2 (availability): service-level uptime + incident counts.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import {
  buildAttestation,
  collectorFileFromCsv,
  frozenTimer,
  periodParams,
  realTimer,
  redactAndCsv,
  utf8,
} from './helpers';
import { buildDisabledOutput, loadCollectorConfig } from './external-helpers';

const COLS = [
  'id', 'day', 'service', 'uptime_pct', 'incidents', 'p95_ms',
] as const;
const OUTPUT_PATH = 'A1-availability/uptime.csv';
const COLLECTOR_ID = 'uptime-collector';

export const uptimeCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'soc2_external_uptime',
  controls: ['A1.1', 'A1.2'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const cfg = await loadCollectorConfig(COLLECTOR_ID, ctx.fetch);
    if (!cfg.enabled) {
      return buildDisabledOutput({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_uptime',
        headers: COLS,
        outputPath: OUTPUT_PATH,
        period,
        reason: cfg.notes ?? 'collector disabled',
        timer: ctx.timer,
      });
    }

    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'soc2_external_uptime',
      columns: COLS,
      filters: [
        { column: 'day', op: 'gte' as const, value: period.start.substring(0, 10) },
        { column: 'day', op: 'lte' as const, value: period.end.substring(0, 10) },
      ],
      orderBy: [
        { column: 'day', ascending: true },
        { column: 'service', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, day, service, uptime_pct, incidents, p95_ms FROM public.soc2_external_uptime WHERE day BETWEEN $1 AND $2 ORDER BY day ASC, service ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('soc2_external_uptime', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_uptime',
        query,
        parameters: periodParams(period),
        rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
        nonDeterministicSources: ['vercel_analytics', 'supabase_health_api'],
      }),
    };
  },
};

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
