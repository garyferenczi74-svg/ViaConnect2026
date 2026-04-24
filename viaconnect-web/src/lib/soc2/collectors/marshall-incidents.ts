// Prompt #122 P3: marshall-incidents collector.
//
// CC4.2 (incident detection), CC7.3 (response, recovery).

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import {
  buildAttestation, collectorFileFromCsv, frozenTimer, periodParams,
  realTimer, redactAndCsv, utf8,
} from './helpers';

const COLS = [
  'id', 'incident_id', 'title', 'severity', 'opened_by', 'opened_at', 'closed_at',
  'root_cause', 'dev_side_escape', 'related_finding_ids', 'narrative', 'owner', 'created_at',
] as const;

export const marshallIncidentsCollector: SOC2Collector = {
  id: 'marshall-incidents-collector',
  version: '1.0.0',
  dataSource: 'compliance_incidents',
  controls: ['CC4.2', 'CC7.3'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'compliance_incidents',
      columns: COLS,
      filters: [
        { column: 'opened_at', op: 'gte' as const, value: period.start },
        { column: 'opened_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'opened_at', ascending: true },
        { column: 'id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, incident_id, title, severity, opened_by, opened_at, closed_at, root_cause, dev_side_escape, related_finding_ids, narrative, owner, created_at FROM public.compliance_incidents WHERE opened_at BETWEEN $1 AND $2 ORDER BY opened_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('compliance_incidents', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv(
      'CC4-monitoring-activities/marshall-incidents-summary.csv',
      csv,
    );

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: marshallIncidentsCollector.id,
        collectorVersion: marshallIncidentsCollector.version,
        dataSource: marshallIncidentsCollector.dataSource,
        query,
        parameters: periodParams(period),
        rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
      }),
    };
  },
};
