// Prompt #122 P3: Admin-role actions during period.
// Subset of compliance_audit_log filtered by actor_type in ('marshall','claude_code_marshall','user')
// AND actor having an admin role. Exact filter done server-side; we filter
// by actor_type here. CC6.2.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = ['id', 'event_type', 'actor_type', 'actor_id', 'payload', 'prev_hash', 'row_hash', 'created_at'] as const;

export const privilegedActionsCollector: SOC2Collector = {
  id: 'privileged-actions-collector',
  version: '1.0.0',
  dataSource: 'compliance_audit_log',
  controls: ['CC6.2'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'compliance_audit_log',
      columns: COLS,
      filters: [
        { column: 'actor_type', op: 'eq' as const, value: 'user' },
        { column: 'created_at', op: 'gte' as const, value: period.start },
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'id', ascending: true }],
      sqlRepresentation:
        "SELECT id, event_type, actor_type, actor_id, payload, prev_hash, row_hash, created_at FROM public.compliance_audit_log WHERE actor_type='user' AND created_at BETWEEN $1 AND $2 ORDER BY id ASC",
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('compliance_audit_log', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('CC6-logical-access/privileged-access-log.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: privilegedActionsCollector.id,
        collectorVersion: privilegedActionsCollector.version,
        dataSource: privilegedActionsCollector.dataSource,
        query, parameters: periodParams(period), rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
