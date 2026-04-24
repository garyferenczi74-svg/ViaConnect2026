// Prompt #122 P3: precheck-sessions — session-level summary, zero draft content.
// CC4.2, C1.3.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = [
  'id', 'session_id', 'practitioner_id', 'source', 'draft_hash_sha256',
  'normalization_version', 'rule_registry_version', 'status',
  'recursion_count', 'target_platform', 'cleared_at', 'closed_at',
  'created_at', 'updated_at',
] as const;

export const precheckSessionsCollector: SOC2Collector = {
  id: 'precheck-sessions-collector',
  version: '1.0.0',
  dataSource: 'precheck_sessions',
  controls: ['CC4.2', 'C1.3'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'precheck_sessions',
      columns: COLS,
      filters: [
        { column: 'created_at', op: 'gte' as const, value: period.start },
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }],
      sqlRepresentation:
        'SELECT ... FROM public.precheck_sessions WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('precheck_sessions', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('CC4-monitoring-activities/precheck-sessions-summary.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: precheckSessionsCollector.id,
        collectorVersion: precheckSessionsCollector.version,
        dataSource: precheckSessionsCollector.dataSource,
        query, parameters: periodParams(period), rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
