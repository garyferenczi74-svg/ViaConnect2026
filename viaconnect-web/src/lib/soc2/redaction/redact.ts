// Prompt #122 P1: Apply a RedactionPolicy to a row-stream.
//
// Contract:
//   - Fail-closed: any column without an explicit policy entry throws.
//     This is the primary guarantee that new-schema-introductions don't
//     silently leak PHI through the exporter.
//   - block_entire_table: the table is never eligible for inclusion; the
//     redactor refuses to process even if called. This catches accidental
//     collector wiring.
//   - pseudonymize: uses the per-packet HMAC key passed via ctx.

import { pseudonymize } from './pseudonymize';
import type { RedactionPolicy, RedactionTreatment } from '../types';
import { SOC2_REDACTION_POLICY } from './policy';

export interface RedactCtx {
  packetUuid: string;
  pseudonymKey: Buffer;
  policy?: RedactionPolicy;
}

/**
 * Redact a single row from a named table. Returns a new object with PHI
 * removed/pseudonymized/generalized per the policy.
 */
export function redactRow(
  table: string,
  row: Record<string, unknown>,
  ctx: RedactCtx,
): Record<string, unknown> {
  const policy = ctx.policy ?? SOC2_REDACTION_POLICY;
  const tablePolicy = policy.tables[table];

  if (!tablePolicy) {
    throw new Error(
      `SOC2 redactor: table "${table}" has no policy entry. Add to src/lib/soc2/redaction/policy.ts before routing through a collector.`,
    );
  }

  const tableLevel = (tablePolicy as { _table?: RedactionTreatment })._table;
  if (tableLevel && tableLevel.kind === 'block_entire_table') {
    throw new Error(
      `SOC2 redactor: table "${table}" is explicitly blocked from any SOC 2 packet. Do not include it in a collector.`,
    );
  }

  const out: Record<string, unknown> = {};
  for (const [col, rawValue] of Object.entries(row)) {
    if (col === '_table') continue;
    const treatment = tablePolicy[col];
    if (!treatment) {
      throw new Error(
        `SOC2 redactor: column "${table}.${col}" has no policy entry. Every emitted column must have an explicit treatment.`,
      );
    }
    out[col] = applyTreatment(treatment, rawValue, ctx);
  }
  return out;
}

/**
 * Redact many rows for a table at once. Fast path; same fail-closed contract.
 */
export function redactRows(
  table: string,
  rows: readonly Record<string, unknown>[],
  ctx: RedactCtx,
): Record<string, unknown>[] {
  return rows.map((r) => redactRow(table, r, ctx));
}

function applyTreatment(
  t: RedactionTreatment,
  value: unknown,
  ctx: RedactCtx,
): unknown {
  switch (t.kind) {
    case 'remove':
      return null;

    case 'retain':
      return value;

    case 'pseudonymize': {
      if (value === null || value === undefined || value === '') return null;
      return pseudonymize({
        packetUuid: ctx.packetUuid,
        context: t.context,
        realId: String(value),
        key: ctx.pseudonymKey,
      });
    }

    case 'pseudonymize_array': {
      if (value === null || value === undefined) return null;
      if (!Array.isArray(value)) {
        throw new Error(`pseudonymize_array expects an array, got ${typeof value}`);
      }
      return value.map((el) => {
        if (el === null || el === undefined || el === '') return null;
        return pseudonymize({
          packetUuid: ctx.packetUuid,
          context: t.context,
          realId: String(el),
          key: ctx.pseudonymKey,
        });
      });
    }

    case 'truncate_timestamp_seconds':
      return truncateTimestampSeconds(value);

    case 'truncate_ip':
      return truncateIp(value);

    case 'generalize_user_agent':
      return generalizeUserAgent(value);

    case 'block_entire_table':
      throw new Error('block_entire_table reached per-column path; should have been caught at table level');
  }
}

function truncateTimestampSeconds(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  // ISO-8601: trim fractional seconds, keep the Z/offset suffix.
  const m = s.match(/^(.*?)(\.\d+)?([Zz]|[+-]\d{2}:?\d{2})?$/);
  if (!m) return s;
  const [, base, , suffix] = m;
  return base + (suffix ?? '');
}

function truncateIp(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value);
  // IPv4 → /24
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)) {
    const parts = s.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  // IPv6 → /64 (first 4 groups + ::/64)
  if (s.includes(':')) {
    const expanded = s.split(':').filter(Boolean);
    const first4 = expanded.slice(0, 4).join(':');
    return `${first4}::/64`;
  }
  return s;
}

function generalizeUserAgent(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value);
  // Extract the first browser/engine token with major version.
  const m =
    s.match(/(Chrome|Firefox|Safari|Edg|OPR|Opera|Chromium|Brave)\/(\d+)/) ||
    s.match(/(AppleWebKit|Gecko|Trident|Presto)\/(\d+)/);
  if (m) {
    return `${m[1]} ${m[2]}`;
  }
  // Fallback: first token before a slash or space, no version.
  const fallback = s.split(/[\s/(]/)[0] ?? 'Unknown';
  return fallback || 'Unknown';
}
