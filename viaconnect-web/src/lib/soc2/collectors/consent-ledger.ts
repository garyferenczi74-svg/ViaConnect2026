// Prompt #122 P3: consent-ledger. P1–P8.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = [
  'id', 'user_id', 'consent_type', 'version', 'granted', 'granted_at',
  'revoked_at', 'ip_address', 'user_agent', 'evidence', 'created_at',
] as const;

export const consentLedgerCollector: SOC2Collector = {
  id: 'consent-ledger-collector',
  version: '1.0.0',
  dataSource: 'consent_ledger',
  controls: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'consent_ledger',
      columns: COLS,
      filters: [
        { column: 'granted_at', op: 'gte' as const, value: period.start },
        { column: 'granted_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'granted_at', ascending: true }, { column: 'id', ascending: true }],
      sqlRepresentation:
        'SELECT ... FROM public.consent_ledger WHERE granted_at BETWEEN $1 AND $2 ORDER BY granted_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('consent_ledger', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('P-privacy/consent-ledger-summary.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: consentLedgerCollector.id,
        collectorVersion: consentLedgerCollector.version,
        dataSource: consentLedgerCollector.dataSource,
        query, parameters: periodParams(period), rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
