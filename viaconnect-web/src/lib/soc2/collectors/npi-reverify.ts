// Prompt #122 P4: NPI re-verification collector (DB-only).
//
// CC6.1 (logical access, periodic reviews). Reads compliance_audit_log
// filtered to event_type='npi_reverify'. These events are emitted by the
// NPI registry verifier whenever a practitioner's NPI record is refreshed.

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
  'id', 'event_type', 'actor_type', 'actor_id',
  'payload', 'prev_hash', 'row_hash', 'created_at',
] as const;
const OUTPUT_PATH = 'CC6-logical-access/npi-reverify-events.csv';
const COLLECTOR_ID = 'npi-reverify-collector';

export const npiReverifyCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'compliance_audit_log',
  controls: ['CC6.1'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const cfg = await loadCollectorConfig(COLLECTOR_ID, ctx.fetch);
    if (!cfg.enabled) {
      return buildDisabledOutput({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'compliance_audit_log',
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
      table: 'compliance_audit_log',
      columns: COLS,
      filters: [
        { column: 'event_type', op: 'eq' as const, value: 'npi_reverify' },
        { column: 'created_at', op: 'gte' as const, value: period.start },
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'created_at', ascending: true },
        { column: 'id', ascending: true },
      ],
      sqlRepresentation:
        "SELECT id, event_type, actor_type, actor_id, payload, prev_hash, row_hash, created_at FROM public.compliance_audit_log WHERE event_type = 'npi_reverify' AND created_at BETWEEN $1 AND $2 ORDER BY created_at ASC, id ASC",
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('compliance_audit_log', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'compliance_audit_log',
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

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
