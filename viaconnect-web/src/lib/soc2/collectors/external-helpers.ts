// Prompt #122 P4: helpers shared by external-API and DB-sourced P4 collectors.
//
// Each P4 collector obeys the soc2_collector_config gate: if enabled=false,
// it emits an empty-but-valid CSV (headers only) and an attestation noting
// the disabled state. This keeps packet generation deterministic even
// before API keys land.

import type { Period } from '../types';
import type { CollectorFetcher } from './types';
import {
  buildAttestation,
  collectorFileFromCsv,
  frozenTimer,
  realTimer,
  toCsv,
  utf8,
  type ExecTimer,
} from './helpers';

export interface CollectorConfigRow {
  collector_id: string;
  enabled: boolean;
  api_key_ref: string | null;
  last_run_at: string | null;
  last_heartbeat_at: string | null;
  notes: string | null;
}

/**
 * Loads a single collector's config row. Returns a safe default if the row
 * is missing (disabled, no api key).
 */
export async function loadCollectorConfig(
  collectorId: string,
  fetch: CollectorFetcher,
): Promise<CollectorConfigRow> {
  const rows = await fetch<CollectorConfigRow>({
    table: 'soc2_collector_config',
    columns: ['collector_id', 'enabled', 'api_key_ref', 'last_run_at', 'last_heartbeat_at', 'notes'],
    filters: [{ column: 'collector_id', op: 'eq', value: collectorId }],
    orderBy: [{ column: 'collector_id', ascending: true }],
    sqlRepresentation: `SELECT collector_id, enabled, api_key_ref, last_run_at, last_heartbeat_at, notes FROM public.soc2_collector_config WHERE collector_id = '${collectorId.replace(/'/g, "''")}' LIMIT 1`,
  });
  return rows[0] ?? {
    collector_id: collectorId,
    enabled: false,
    api_key_ref: null,
    last_run_at: null,
    last_heartbeat_at: null,
    notes: 'config row missing',
  };
}

export interface DisabledOutputInput {
  collectorId: string;
  collectorVersion: string;
  dataSource: string;
  headers: readonly string[];
  outputPath: string;
  period: Period;
  reason: string;
  timer?: ExecTimer;
}

/**
 * Builds a CollectorOutput for a disabled collector: CSV with only the header
 * row, and an attestation that records the disabled reason so an auditor can
 * see why the file is empty.
 */
export function buildDisabledOutput(input: DisabledOutputInput) {
  const timer = input.timer ?? realTimer();
  const startedAt = timer.now();

  const csv = toCsv(input.headers, []);
  const file = collectorFileFromCsv(input.outputPath, csv);

  const query = {
    table: input.dataSource,
    columns: input.headers,
    filters: [],
    orderBy: [],
    sqlRepresentation: `-- collector disabled: ${input.reason}`,
  };

  return {
    files: [file],
    attestation: buildAttestation({
      collectorId: input.collectorId,
      collectorVersion: input.collectorVersion,
      dataSource: input.dataSource,
      query,
      parameters: [input.period.start, input.period.end],
      rowCount: 0,
      outputBytes: file.bytes ?? utf8(''),
      executedAt: startedAt,
      durationMs: timer.elapsedMs(),
      nonDeterministicSources: [`disabled_in_soc2_collector_config: ${input.reason}`],
    }),
  };
}

/**
 * Convenience for tests + local dev: frozen timer with a deterministic clock.
 * Re-exported so P4 collector code doesn't need to import from ./helpers.
 */
export { frozenTimer };
