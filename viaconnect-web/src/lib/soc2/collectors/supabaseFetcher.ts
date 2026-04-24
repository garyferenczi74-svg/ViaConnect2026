// Prompt #122 P5: Supabase-backed CollectorFetcher.
//
// Translates a CollectorQuery (abstract filter/order/limit DSL) into a
// Supabase postgrest chain. Used exclusively by the server-side packet
// generator; the collectors themselves remain pure and testable because
// they consume the abstract fetcher interface, not this concrete one.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CollectorFetcher, CollectorQuery } from './types';

/** Build a CollectorFetcher backed by a service-role Supabase client. */
export function buildSupabaseFetcher(supabase: SupabaseClient): CollectorFetcher {
  return async <T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> => {
    // Cast: table names are strings and we validate column lists via the
    // redaction-policy coverage audit elsewhere.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let builder: any = supabase.from(q.table).select(q.columns.join(','));

    for (const f of q.filters) {
      switch (f.op) {
        case 'eq':          builder = builder.eq(f.column, f.value); break;
        case 'neq':         builder = builder.neq(f.column, f.value); break;
        case 'gt':          builder = builder.gt(f.column, f.value); break;
        case 'gte':         builder = builder.gte(f.column, f.value); break;
        case 'lt':          builder = builder.lt(f.column, f.value); break;
        case 'lte':         builder = builder.lte(f.column, f.value); break;
        case 'in':          builder = builder.in(f.column, f.value as unknown[]); break;
        case 'is_not_null': builder = builder.not(f.column, 'is', null); break;
      }
    }

    for (const o of q.orderBy) {
      builder = builder.order(o.column, { ascending: o.ascending });
    }

    if (typeof q.limit === 'number') {
      builder = builder.limit(q.limit);
    }

    const { data, error } = await builder;
    if (error) {
      // Surface the query + table for debuggability; the outer orchestrator
      // already funnels collector errors into the attestation.
      throw new Error(`supabase fetch failed (${q.table}): ${error.message}`);
    }
    return (data ?? []) as T[];
  };
}
