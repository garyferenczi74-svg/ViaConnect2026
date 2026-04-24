// Prompt #122 P3: hounddog-signals collector. CC4.1, CC4.2.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = [
  'id', 'collector_id', 'url', 'captured_at', 'matched_practitioner_id',
  'practitioner_match_confidence', 'language', 'jurisdiction_country',
  'overall_confidence', 'status', 'created_at',
  // Note: author_handle / author_external_id / author_display_name / text_derived
  // are excluded by the redactor's `remove` treatment. We still include them in
  // COLS so the redactor can audit coverage — it returns null for each.
  'author_handle', 'author_external_id', 'author_display_name', 'text_derived',
] as const;

export const hounddogSignalsCollector: SOC2Collector = {
  id: 'hounddog-signals-collector',
  version: '1.0.0',
  dataSource: 'social_signals',
  controls: ['CC4.1', 'CC4.2'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'social_signals',
      columns: COLS,
      filters: [
        { column: 'captured_at', op: 'gte' as const, value: period.start },
        { column: 'captured_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'captured_at', ascending: true }, { column: 'id', ascending: true }],
      sqlRepresentation:
        'SELECT ... FROM public.social_signals WHERE captured_at BETWEEN $1 AND $2 ORDER BY captured_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('social_signals', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('CC4-monitoring-activities/hounddog-signals-summary.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: hounddogSignalsCollector.id,
        collectorVersion: hounddogSignalsCollector.version,
        dataSource: hounddogSignalsCollector.dataSource,
        query, parameters: periodParams(period), rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
