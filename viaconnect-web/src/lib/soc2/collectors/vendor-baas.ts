// Prompt #122 P3: vendor BAA inventory. CC9.2, P3.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = [
  'id', 'vendor_name', 'scope', 'baa_signed_on', 'baa_expires_on',
  'document_url', 'notes', 'created_at', 'updated_at',
] as const;

export const vendorBaasCollector: SOC2Collector = {
  id: 'vendor-baas-collector',
  version: '1.0.0',
  dataSource: 'vendor_baas',
  controls: ['CC9.2', 'P3'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    // Snapshot-in-time (vendor roster as of period end) — not filtered by date.
    const query = {
      table: 'vendor_baas',
      columns: COLS,
      filters: [],
      orderBy: [{ column: 'vendor_name', ascending: true }],
      sqlRepresentation:
        'SELECT id, vendor_name, scope, baa_signed_on, baa_expires_on, document_url, notes, created_at, updated_at FROM public.vendor_baas ORDER BY vendor_name ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('vendor_baas', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('vendors/vendor-inventory.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: vendorBaasCollector.id,
        collectorVersion: vendorBaasCollector.version,
        dataSource: vendorBaasCollector.dataSource,
        query, parameters: periodParams(period), rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
