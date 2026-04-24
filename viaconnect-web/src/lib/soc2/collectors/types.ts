// Prompt #122 P3: Collector-specific types.
//
// Isolates the abstract "fetch rows from a source" operation from the
// concrete Supabase client. Production injects a Supabase-backed fetcher;
// tests inject fixture data. This keeps every collector pure + testable.

import type { CollectorCtx, SOC2Collector } from '../types';

export interface CollectorQuery {
  /** Source table name — used by the redactor to look up the column policy. */
  readonly table: string;
  /** Columns to read. Must be an explicit list, not '*', so the redaction policy
   *  can audit coverage. */
  readonly columns: readonly string[];
  /** Filters applied in order. */
  readonly filters: readonly Filter[];
  /** Deterministic ordering. REQUIRED for reproducibility. */
  readonly orderBy: readonly OrderBy[];
  /** Maximum rows to return; unset = all matching. */
  readonly limit?: number;
  /** Human-readable SQL representation for the attestation. */
  readonly sqlRepresentation: string;
}

export interface Filter {
  readonly column: string;
  readonly op: 'eq' | 'neq' | 'gte' | 'lte' | 'gt' | 'lt' | 'in' | 'is_not_null';
  readonly value: unknown;
}

export interface OrderBy {
  readonly column: string;
  readonly ascending: boolean;
}

/** The abstract fetcher. `CollectorCtx.fetch` is implemented by the orchestrator. */
export type CollectorFetcher = <T = Record<string, unknown>>(
  query: CollectorQuery,
) => Promise<T[]>;

export interface CollectorRunCtx extends CollectorCtx {
  fetch: CollectorFetcher;
  /** Optional frozen timer for deterministic attestations. Collectors fall back to realTimer() when absent. */
  timer?: { now: () => string; elapsedMs: () => number };
}

export type { SOC2Collector };
