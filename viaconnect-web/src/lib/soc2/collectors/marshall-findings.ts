// Prompt #122 P3: marshall-findings collector.
//
// CC4.1 (monitoring), CC4.2 (incident detection), CC7.2 (response).

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

const COLS = [
  'id', 'finding_id', 'rule_id', 'severity', 'surface', 'source',
  'location', 'message', 'citation', 'remediation', 'status',
  'assigned_to', 'resolved_at', 'created_at', 'evidence_bundle_id',
] as const;

export const marshallFindingsCollector: SOC2Collector = {
  id: 'marshall-findings-collector',
  version: '1.0.0',
  dataSource: 'compliance_findings',
  controls: ['CC4.1', 'CC4.2', 'CC7.2'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'compliance_findings',
      columns: COLS,
      filters: [
        { column: 'created_at', op: 'gte' as const, value: period.start },
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'created_at', ascending: true },
        { column: 'id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, finding_id, rule_id, severity, surface, source, location, message, citation, remediation, status, assigned_to, resolved_at, created_at, evidence_bundle_id FROM public.compliance_findings WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('compliance_findings', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv(
      'CC4-monitoring-activities/marshall-findings-summary.csv',
      csv,
    );

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: marshallFindingsCollector.id,
        collectorVersion: marshallFindingsCollector.version,
        dataSource: marshallFindingsCollector.dataSource,
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

// Reusable CollectorCtx shape that optionally carries a frozen timer for tests.
type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
