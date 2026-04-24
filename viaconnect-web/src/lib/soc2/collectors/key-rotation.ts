// Prompt #122 P4: Key rotation collector (DB-only).
//
// CC6.1, CC6.6 (logical access, encryption keys). Reads soc2_signing_keys
// and precheck_signing_keys — both tables exist in the live DB already,
// so this collector always runs (no external API, no config gate needed).
// Still respects soc2_collector_config.enabled for uniformity.

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
  'id', 'alg', 'public_key_pem', 'active', 'rotation_of',
  'created_at', 'retired_at',
] as const;
const SOC2_OUTPUT_PATH = 'CC6-logical-access/soc2-signing-keys.csv';
const PRECHECK_OUTPUT_PATH = 'CC6-logical-access/precheck-signing-keys.csv';
const COLLECTOR_ID = 'key-rotation-collector';

export const keyRotationCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'soc2_signing_keys + precheck_signing_keys',
  controls: ['CC6.1', 'CC6.6'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const cfg = await loadCollectorConfig(COLLECTOR_ID, ctx.fetch);
    if (!cfg.enabled) {
      return buildDisabledOutput({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_signing_keys',
        headers: COLS,
        outputPath: SOC2_OUTPUT_PATH,
        period,
        reason: cfg.notes ?? 'collector disabled',
        timer: ctx.timer,
      });
    }

    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const soc2Query = {
      table: 'soc2_signing_keys',
      columns: COLS,
      filters: [
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'created_at', ascending: true },
        { column: 'id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, alg, public_key_pem, active, rotation_of, created_at, retired_at FROM public.soc2_signing_keys WHERE created_at <= $2 ORDER BY created_at ASC, id ASC',
    };

    const precheckQuery = {
      table: 'precheck_signing_keys',
      columns: COLS,
      filters: [
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'created_at', ascending: true },
        { column: 'id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, alg, public_key_pem, active, rotation_of, created_at, retired_at FROM public.precheck_signing_keys WHERE created_at <= $2 ORDER BY created_at ASC, id ASC',
    };

    const soc2Rows = await ctx.fetch<Record<string, unknown>>(soc2Query);
    const precheckRows = await ctx.fetch<Record<string, unknown>>(precheckQuery);

    const { csv: soc2Csv, rowCount: soc2Count } = redactAndCsv(
      'soc2_signing_keys', COLS as unknown as string[], soc2Rows, ctx,
    );
    const { csv: precheckCsv, rowCount: precheckCount } = redactAndCsv(
      'precheck_signing_keys', COLS as unknown as string[], precheckRows, ctx,
    );

    const soc2File = collectorFileFromCsv(SOC2_OUTPUT_PATH, soc2Csv);
    const precheckFile = collectorFileFromCsv(PRECHECK_OUTPUT_PATH, precheckCsv);

    // Combined attestation covers both queries. We concatenate their bytes
    // in a stable order so the outputSha256 pins the pair.
    const combined = new Uint8Array(soc2File.bytes.length + precheckFile.bytes.length);
    combined.set(soc2File.bytes, 0);
    combined.set(precheckFile.bytes, soc2File.bytes.length);

    return {
      files: [soc2File, precheckFile],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_signing_keys + precheck_signing_keys',
        query: soc2Query, // Primary; precheckQuery recorded in nonDeterministicSources below
        parameters: periodParams(period),
        rowCount: soc2Count + precheckCount,
        outputBytes: combined,
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
        nonDeterministicSources: [
          `second_query:${precheckQuery.sqlRepresentation}`,
        ],
      }),
    };
  },
};

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
