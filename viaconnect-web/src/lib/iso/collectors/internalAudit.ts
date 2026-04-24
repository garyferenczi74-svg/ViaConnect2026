// Prompt #127 P5: ISO 27001 internal audit collector (Clause 9.2).

import type { Period } from '@/lib/soc2/types';
import type { CollectorRunCtx, SOC2Collector } from '@/lib/soc2/collectors/types';
import {
  buildAttestation,
  collectorFileFromCsv,
  frozenTimer,
  periodParams,
  realTimer,
  toCsv,
  utf8,
} from '@/lib/soc2/collectors/helpers';

const COLS = [
  'audit_ref', 'audit_date', 'scope_length', 'auditor_is_independent',
  'major_findings_count', 'minor_findings_count', 'observations_count',
  'summary_length', 'report_attached',
] as const;

const OUTPUT_PATH = 'isms-clauses/clause-9-performance-evaluation/iso-internal-audits.csv';
const COLLECTOR_ID = 'iso-internal-audit-collector';

interface DbRow {
  audit_ref: string;
  audit_date: string;
  scope: string;
  auditor_is_independent: boolean;
  major_findings_count: number;
  minor_findings_count: number;
  observations_count: number;
  summary: string;
  storage_key: string | null;
}

export const isoInternalAuditCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'iso_internal_audits',
  controls: ['Clause 9.2'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'iso_internal_audits',
      columns: ['audit_ref', 'audit_date', 'scope', 'auditor_is_independent',
        'major_findings_count', 'minor_findings_count', 'observations_count',
        'summary', 'storage_key'],
      filters: [
        { column: 'audit_date', op: 'gte' as const, value: period.start.slice(0, 10) },
        { column: 'audit_date', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [{ column: 'audit_date', ascending: true }],
      sqlRepresentation:
        'SELECT audit_ref, audit_date, scope, auditor_is_independent, major_findings_count, minor_findings_count, observations_count, summary, storage_key FROM public.iso_internal_audits WHERE audit_date BETWEEN $1 AND $2 ORDER BY audit_date ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      audit_ref: r.audit_ref,
      audit_date: r.audit_date,
      scope_length: (r.scope ?? '').length,
      auditor_is_independent: r.auditor_is_independent,
      major_findings_count: r.major_findings_count,
      minor_findings_count: r.minor_findings_count,
      observations_count: r.observations_count,
      summary_length: (r.summary ?? '').length,
      report_attached: r.storage_key ? 'yes' : 'no',
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: isoInternalAuditCollector.dataSource,
        query,
        parameters: periodParams(period),
        rowCount: emitted.length,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
      }),
    };
  },
};

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
