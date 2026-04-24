// Prompt #122 P4: TLS certificate expiry collector.
//
// CC6.7 (data in transit), A1.1 (availability).

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
  'id', 'hostname', 'not_before', 'not_after', 'issuer', 'captured_at', 'days_to_expiry',
] as const;
const OUTPUT_PATH = 'CC6-logical-access/cert-expiry.csv';
const COLLECTOR_ID = 'cert-expiry-collector';

export const certExpiryCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'soc2_external_cert_expiry',
  controls: ['CC6.7', 'A1.1'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const cfg = await loadCollectorConfig(COLLECTOR_ID, ctx.fetch);
    if (!cfg.enabled) {
      return buildDisabledOutput({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_cert_expiry',
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
      table: 'soc2_external_cert_expiry',
      columns: COLS,
      filters: [
        { column: 'captured_at', op: 'gte' as const, value: period.start },
        { column: 'captured_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'captured_at', ascending: true },
        { column: 'hostname', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, hostname, not_before, not_after, issuer, captured_at, days_to_expiry FROM public.soc2_external_cert_expiry WHERE captured_at BETWEEN $1 AND $2 ORDER BY captured_at ASC, hostname ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('soc2_external_cert_expiry', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_cert_expiry',
        query,
        parameters: periodParams(period),
        rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
        nonDeterministicSources: ['tls_endpoint_probing'],
      }),
    };
  },
};

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
