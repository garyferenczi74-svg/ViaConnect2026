// Prompt #122 P4: MFA enforcement collector.
//
// CC6.1 (logical access, authentication strength): per-user MFA status.

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
  'id', 'user_id', 'mfa_enabled', 'factor_count', 'factor_types', 'captured_at',
] as const;
const OUTPUT_PATH = 'CC6-logical-access/mfa-status.csv';
const COLLECTOR_ID = 'mfa-enforcement-collector';

export const mfaEnforcementCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'soc2_external_mfa_status',
  controls: ['CC6.1'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const cfg = await loadCollectorConfig(COLLECTOR_ID, ctx.fetch);
    if (!cfg.enabled) {
      return buildDisabledOutput({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_mfa_status',
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
      table: 'soc2_external_mfa_status',
      columns: COLS,
      filters: [
        { column: 'captured_at', op: 'gte' as const, value: period.start },
        { column: 'captured_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'captured_at', ascending: true },
        { column: 'id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, user_id, mfa_enabled, factor_count, factor_types, captured_at FROM public.soc2_external_mfa_status WHERE captured_at BETWEEN $1 AND $2 ORDER BY captured_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('soc2_external_mfa_status', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_mfa_status',
        query,
        parameters: periodParams(period),
        rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
        nonDeterministicSources: ['supabase_auth_mfa_factors_scan'],
      }),
    };
  },
};

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
