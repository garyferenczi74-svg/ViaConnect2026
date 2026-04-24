// Prompt #122 P3: precheck-receipts — issuance + revocation ledger.
// CC5.2.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = [
  'id', 'receipt_id', 'session_id', 'practitioner_id', 'draft_hash_sha256',
  'signing_key_id', 'issued_at', 'expires_at', 'revoked', 'revoked_at', 'revoked_reason',
] as const;

export const precheckReceiptsCollector: SOC2Collector = {
  id: 'precheck-receipts-collector',
  version: '1.0.0',
  dataSource: 'precheck_clearance_receipts',
  controls: ['CC5.2'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'precheck_clearance_receipts',
      columns: COLS,
      filters: [
        { column: 'issued_at', op: 'gte' as const, value: period.start },
        { column: 'issued_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'issued_at', ascending: true }, { column: 'id', ascending: true }],
      sqlRepresentation:
        'SELECT ... FROM public.precheck_clearance_receipts WHERE issued_at BETWEEN $1 AND $2 ORDER BY issued_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('precheck_clearance_receipts', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('CC5-control-activities/precheck-receipts-ledger.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: precheckReceiptsCollector.id,
        collectorVersion: precheckReceiptsCollector.version,
        dataSource: precheckReceiptsCollector.dataSource,
        query, parameters: periodParams(period), rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
