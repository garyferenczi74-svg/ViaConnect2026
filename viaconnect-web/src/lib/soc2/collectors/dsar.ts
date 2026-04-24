// Prompt #122 P3: DSAR requests collector. P5, P6.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = [
  'id', 'user_id', 'email', 'request_type', 'jurisdiction', 'opened_at',
  'sla_due_at', 'completed_at', 'status', 'notes', 'created_at',
] as const;

export const dsarCollector: SOC2Collector = {
  id: 'dsar-collector',
  version: '1.0.0',
  dataSource: 'dsar_requests',
  controls: ['P5', 'P6'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'dsar_requests',
      columns: COLS,
      filters: [
        { column: 'opened_at', op: 'gte' as const, value: period.start },
        { column: 'opened_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'opened_at', ascending: true }, { column: 'id', ascending: true }],
      sqlRepresentation:
        'SELECT ... FROM public.dsar_requests WHERE opened_at BETWEEN $1 AND $2 ORDER BY opened_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('dsar_requests', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('P-privacy/dsar-completion.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: dsarCollector.id,
        collectorVersion: dsarCollector.version,
        dataSource: dsarCollector.dataSource,
        query, parameters: periodParams(period), rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
