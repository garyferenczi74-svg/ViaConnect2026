// Task 211b-W4b - Client-safe, own-row accessors for user_health_context's
// pregnancy_status. This is deliberately separate from
// src/lib/protocol/healthContext.ts, which reads/writes via createAdminClient
// (service role, server-only) for the CAQ aggregation pipeline. A consumer-
// facing pregnancy-indication control cannot use the admin client (it would
// require shipping the service role key to the browser), so this module reads
// and writes through the normal browser client, scoped by the table's real RLS:
//   - user_health_context_select_own (SELECT, auth.uid() = user_id)
//   - user_health_context_insert_own (INSERT, auth.uid() = user_id)
// There is NO update-own policy (migration 20260621134000), so this is an
// append-only write: a status change inserts a NEW row (carrying forward the
// other fields from the latest row so they are not silently reset to empty),
// matching the "read latest by updated_at" convention
// getLatestUserHealthContext already uses.
//
// Zero `any`. No em or en dashes.

import type { SupabaseClient } from '@supabase/supabase-js';

/** The subset of user_health_context this module reads/writes. */
export interface HealthContextRow {
  demographics: unknown;
  conditions: unknown;
  medications: unknown;
  allergies: unknown;
  pregnancy_status: string | null;
  goals: unknown;
}

/** The insert payload for a new (append-only) user_health_context row. */
export interface HealthContextInsert {
  user_id: string;
  demographics: unknown;
  conditions: unknown;
  medications: unknown;
  allergies: unknown;
  pregnancy_status: string | null;
  goals: unknown;
}

interface SingleResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface WriteResult {
  error: { message: string } | null;
}

/**
 * Reads the caller's own latest user_health_context row (own-row RLS,
 * ordered by updated_at desc, matching getLatestUserHealthContext's read
 * shape). Returns null data when the user has no row yet (never an error).
 */
export function readOwnLatestHealthContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<SingleResult<HealthContextRow>> {
  const builder = supabase.from('user_health_context') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<SingleResult<HealthContextRow>>;
          };
        };
      };
    };
  };
  return builder
    .select('demographics, conditions, medications, allergies, pregnancy_status, goals')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/**
 * Inserts a new user_health_context row (own-row RLS INSERT only; there is no
 * UPDATE policy on this table, by design -- see module header). The caller is
 * responsible for carrying forward any prior fields it wants preserved.
 */
export function insertOwnHealthContext(
  supabase: SupabaseClient,
  row: HealthContextInsert,
): Promise<WriteResult> {
  const builder = supabase.from('user_health_context') as unknown as {
    insert: (values: HealthContextInsert) => Promise<WriteResult>;
  };
  return builder.insert(row);
}
