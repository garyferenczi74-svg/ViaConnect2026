// Prompt #122 P3: Shared collector helpers.
//
// Consistent CSV formatting (RFC 4180 UTF-8 LF, no BOM), deterministic query
// hashing, attestation building, and PHI redaction. Used by every collector;
// fixes quirks once and only once.

import { createHash } from 'node:crypto';
import type {
  CollectorAttestation,
  CollectorCtx,
  CollectorFile,
  Period,
} from '../types';
import { redactRows } from '../redaction/redact';
import type { CollectorQuery } from './types';

/**
 * RFC 4180 CSV serializer.
 *   - UTF-8, LF line endings
 *   - Quoted with "" escaping when a value contains comma, LF, CR, or quote
 *   - `null` / `undefined` → empty field
 *   - Arrays / objects → JSON.stringify (quoted)
 *   - Columns iterated in the order passed (not object key insertion order)
 */
export function toCsv(
  columns: readonly string[],
  rows: ReadonlyArray<Record<string, unknown>>,
): string {
  const lines: string[] = [];
  lines.push(columns.map(csvEscape).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(row[c])).join(','));
  }
  return lines.join('\n') + '\n';
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value) || (typeof value === 'object')) {
    return csvEscape(JSON.stringify(value));
  }
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * SHA-256 hex of a query's canonical representation. The canonical form
 * includes the table, columns (sorted), filters (in order), orderBy (in
 * order), and limit. Two queries that would produce identical SQL always
 * produce the same hash, so an auditor can re-hash and verify a collector's
 * attestation from a given packet.
 */
export function computeQueryHash(query: CollectorQuery, params: readonly unknown[]): string {
  const canonical = JSON.stringify({
    table: query.table,
    columns: query.columns.slice().sort(),
    filters: query.filters,
    orderBy: query.orderBy,
    limit: query.limit ?? null,
    params,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * SHA-256 hex of a byte buffer. Used for file-hash attestation.
 */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

/**
 * Convert a string to a Uint8Array (UTF-8).
 */
export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export interface BuildAttestationInput {
  collectorId: string;
  collectorVersion: string;
  dataSource: string;
  query: CollectorQuery;
  parameters: readonly unknown[];
  rowCount: number;
  outputBytes: Uint8Array;
  executedAt: string;
  durationMs: number;
  nonDeterministicSources?: readonly string[];
}

export function buildAttestation(input: BuildAttestationInput): CollectorAttestation {
  return {
    collectorId: input.collectorId,
    collectorVersion: input.collectorVersion,
    dataSource: input.dataSource,
    query: input.query.sqlRepresentation,
    queryHash: computeQueryHash(input.query, input.parameters),
    parameters: input.parameters.slice(),
    rowCount: input.rowCount,
    outputSha256: sha256Hex(input.outputBytes),
    executedAt: input.executedAt,
    durationMs: input.durationMs,
    deterministicReplayProof: {
      seedInputs: ['period.start', 'period.end', 'ruleRegistryVersion'],
      nonDeterministicSources: input.nonDeterministicSources ?? [],
    },
  };
}

/**
 * Convenience wrapper: apply redaction policy to the rows from a table, then
 * serialize as CSV. Most collectors call this after fetching.
 */
export function redactAndCsv(
  table: string,
  columns: readonly string[],
  rows: ReadonlyArray<Record<string, unknown>>,
  ctx: CollectorCtx,
): { csv: string; rowCount: number } {
  const redacted = redactRows(table, rows, {
    packetUuid: ctx.packetUuid,
    pseudonymKey: ctx.pseudonymKey,
  });
  return { csv: toCsv(columns, redacted), rowCount: redacted.length };
}

/**
 * Build the common `[period.start, period.end]` parameters in a stable order.
 */
export function periodParams(period: Period): readonly [string, string] {
  return [period.start, period.end];
}

/**
 * Build a CollectorFile tuple in one call.
 */
export function collectorFileFromCsv(
  relativePath: string,
  csv: string,
): CollectorFile {
  return {
    relativePath,
    contentType: 'text/csv',
    bytes: utf8(csv),
  };
}

export function collectorFileFromJson(
  relativePath: string,
  obj: unknown,
): CollectorFile {
  return {
    relativePath,
    contentType: 'application/json',
    bytes: utf8(JSON.stringify(obj, null, 2) + '\n'),
  };
}

/**
 * Deterministic "now" for executedAt. In production this is the real wall clock;
 * tests inject a fixed value via the ctx so identical fixture runs produce
 * identical attestation bytes.
 */
export interface ExecTimer {
  now(): string;
  elapsedMs(): number;
}

export function realTimer(): ExecTimer {
  const startedAt = Date.now();
  return {
    now: () => new Date().toISOString(),
    elapsedMs: () => Date.now() - startedAt,
  };
}

export function frozenTimer(nowIso: string, fixedDurationMs = 0): ExecTimer {
  return {
    now: () => nowIso,
    elapsedMs: () => fixedDurationMs,
  };
}
