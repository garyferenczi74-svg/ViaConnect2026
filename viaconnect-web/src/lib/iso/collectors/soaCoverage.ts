// Prompt #127 P5: ISO 27001 Statement of Applicability coverage collector.
//
// Walks the currently-effective SoA rows for the period and emits a CSV
// of control_ref, applicability, implementation_status, justification
// length, and approval state. This is the evidence that auditors use
// to verify the SoA was in place and maintained during the audit period.

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
  'control_ref', 'version', 'applicability', 'implementation_status',
  'justification_length', 'effective_from', 'effective_until', 'approved',
] as const;

const OUTPUT_PATH = 'statement-of-applicability/iso-soa-coverage.csv';
const COLLECTOR_ID = 'iso-soa-coverage-collector';

interface DbRow {
  control_ref: string;
  version: number;
  applicability: string;
  implementation_status: string;
  justification: string;
  effective_from: string;
  effective_until: string | null;
  approved_at: string | null;
}

export const isoSoaCoverageCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'iso_statements_of_applicability',
  controls: ['Clause 6.1', 'SoA'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'iso_statements_of_applicability',
      columns: ['control_ref', 'version', 'applicability', 'implementation_status', 'justification', 'effective_from', 'effective_until', 'approved_at'],
      filters: [
        { column: 'effective_from', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [
        { column: 'control_ref', ascending: true },
        { column: 'version', ascending: false },
      ],
      sqlRepresentation:
        'SELECT control_ref, version, applicability, implementation_status, justification, effective_from, effective_until, approved_at FROM public.iso_statements_of_applicability WHERE effective_from <= $1 ORDER BY control_ref ASC, version DESC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      control_ref: r.control_ref,
      version: r.version,
      applicability: r.applicability,
      implementation_status: r.implementation_status,
      justification_length: (r.justification ?? '').length,
      effective_from: r.effective_from,
      effective_until: r.effective_until ?? '',
      approved: r.approved_at ? 'yes' : 'no',
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: isoSoaCoverageCollector.dataSource,
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
