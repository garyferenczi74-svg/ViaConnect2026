// Prompt #122 P4: Anthropic API usage collector.
//
// CC7.1 (system operations; capacity, spend, API dependency).

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
  'id', 'day', 'model', 'input_tokens', 'output_tokens', 'request_count',
] as const;
const OUTPUT_PATH = 'CC7-system-operations/anthropic-usage.csv';
const COLLECTOR_ID = 'anthropic-usage-collector';

export const anthropicUsageCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'soc2_external_anthropic_usage',
  controls: ['CC7.1'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const cfg = await loadCollectorConfig(COLLECTOR_ID, ctx.fetch);
    if (!cfg.enabled) {
      return buildDisabledOutput({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_anthropic_usage',
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
      table: 'soc2_external_anthropic_usage',
      columns: COLS,
      filters: [
        { column: 'day', op: 'gte' as const, value: period.start.substring(0, 10) },
        { column: 'day', op: 'lte' as const, value: period.end.substring(0, 10) },
      ],
      orderBy: [
        { column: 'day', ascending: true },
        { column: 'model', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, day, model, input_tokens, output_tokens, request_count FROM public.soc2_external_anthropic_usage WHERE day BETWEEN $1 AND $2 ORDER BY day ASC, model ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('soc2_external_anthropic_usage', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_anthropic_usage',
        query,
        parameters: periodParams(period),
        rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
        nonDeterministicSources: ['anthropic_admin_api'],
      }),
    };
  },
};

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
