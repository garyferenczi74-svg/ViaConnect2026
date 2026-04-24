// Prompt #122 P3: hounddog-findings — subset of compliance_findings where source='hounddog'.
// CC4.2.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = [
  'id', 'finding_id', 'rule_id', 'severity', 'surface', 'source', 'location',
  'message', 'citation', 'remediation', 'status', 'assigned_to',
  'resolved_at', 'created_at', 'evidence_bundle_id',
] as const;

export const hounddogFindingsCollector: SOC2Collector = {
  id: 'hounddog-findings-collector',
  version: '1.0.0',
  dataSource: 'compliance_findings',
  controls: ['CC4.2'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'compliance_findings',
      columns: COLS,
      filters: [
        { column: 'source', op: 'eq' as const, value: 'hounddog' },
        { column: 'created_at', op: 'gte' as const, value: period.start },
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }],
      sqlRepresentation:
        "SELECT ... FROM public.compliance_findings WHERE source='hounddog' AND created_at BETWEEN $1 AND $2 ORDER BY created_at ASC, id ASC",
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('compliance_findings', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('CC4-monitoring-activities/hounddog-findings-summary.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: hounddogFindingsCollector.id,
        collectorVersion: hounddogFindingsCollector.version,
        dataSource: hounddogFindingsCollector.dataSource,
        query, parameters: periodParams(period), rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
