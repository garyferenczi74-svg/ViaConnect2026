// Prompt #127 P5: ISO 27001 nonconformity and corrective action collector
// (Clause 10.2). Verifier pseudonymized with the per-packet HMAC key.

import { pseudonymize } from '@/lib/soc2/redaction/pseudonymize';
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
  'nc_ref', 'source', 'severity', 'status', 'recorded_at_day',
  'target_date', 'actual_closure_date', 'description_length',
  'root_cause_attached', 'corrective_action_attached',
  'verified_by_pseudonym', 'verified_at_day',
] as const;

const OUTPUT_PATH = 'isms-clauses/clause-10-improvement/iso-nonconformities.csv';
const COLLECTOR_ID = 'iso-nonconformity-collector';

interface DbRow {
  nc_ref: string;
  source: string;
  severity: string;
  status: string;
  description: string;
  root_cause: string | null;
  corrective_action: string | null;
  target_date: string | null;
  actual_closure_date: string | null;
  recorded_at: string;
  verified_by: string | null;
  verified_at: string | null;
}

export const isoNonconformityCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'iso_nonconformities',
  controls: ['Clause 10.1', 'Clause 10.2'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'iso_nonconformities',
      columns: ['nc_ref', 'source', 'severity', 'status', 'description', 'root_cause',
        'corrective_action', 'target_date', 'actual_closure_date', 'recorded_at',
        'verified_by', 'verified_at'],
      filters: [
        { column: 'recorded_at', op: 'gte' as const, value: period.start },
        { column: 'recorded_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'recorded_at', ascending: true }],
      sqlRepresentation:
        'SELECT nc_ref, source, severity, status, description, root_cause, corrective_action, target_date, actual_closure_date, recorded_at, verified_by, verified_at FROM public.iso_nonconformities WHERE recorded_at BETWEEN $1 AND $2 ORDER BY recorded_at ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      nc_ref: r.nc_ref,
      source: r.source,
      severity: r.severity,
      status: r.status,
      recorded_at_day: r.recorded_at.slice(0, 10),
      target_date: r.target_date ?? '',
      actual_closure_date: r.actual_closure_date ?? '',
      description_length: (r.description ?? '').length,
      root_cause_attached: r.root_cause ? 'yes' : 'no',
      corrective_action_attached: r.corrective_action ? 'yes' : 'no',
      verified_by_pseudonym: r.verified_by
        ? pseudonymize({ packetUuid: ctx.packetUuid, context: 'user', realId: r.verified_by, key: ctx.pseudonymKey })
        : '',
      verified_at_day: r.verified_at ? r.verified_at.slice(0, 10) : '',
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: isoNonconformityCollector.dataSource,
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
