// Task 211b-W4b - Typed thin accessors for user_cycle_context and the
// 'cycle_tracking' consent_ledger rows, following the exact pattern already
// established in src/lib/formavision/cadence/cadenceDb.ts.
//
// user_cycle_context is created by migration
// 20260713130000_prompt_211b_cycle_context.sql, which is merge-deferred (not
// yet applied), so it is absent from the generated Supabase Database type.
// Querying it through the typed client would fall back to a deeply recursive
// builder type (TS2589) and reject insert/upsert overloads. Rather than reach
// for `any` (banned), this module wraps the client in a narrow, hand-written
// interface describing ONLY the shapes the cycle opt-in surface uses. Zero `any`.
//
// consent_ledger IS in the generated Database type (Prompt #116 / Marshall
// compliance migration), but is queried the same thin way here for consistency
// with the read pattern src/lib/formavision/personalPrecision/personalPrecisionDb.ts
// already established for this exact table.

import type { SupabaseClient } from '@supabase/supabase-js';

/** The user_cycle_context columns the cycle opt-in surface reads. */
export interface CycleContextRow {
  opt_in: boolean;
  current_phase: string | null;
  cycle_length_days: number | null;
  last_period_start: string | null;
}

/** The user_cycle_context upsert payload the cycle opt-in surface writes. */
export interface CycleContextUpsert {
  user_id: string;
  opt_in: boolean;
  opted_in_at: string | null;
  current_phase: string | null;
  cycle_length_days: number | null;
  last_period_start: string | null;
}

/** consent_ledger row, narrowed to the fields the cycle consent gate needs. */
export interface CycleConsentRow {
  consent_type: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
}

/** The consent_ledger insert payload for a 'cycle_tracking' grant/revoke event. */
export interface CycleConsentInsert {
  user_id: string;
  consent_type: 'cycle_tracking';
  version: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
}

/** Minimal single-row read result. */
interface SingleResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Minimal list read result. */
interface ListResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/** Minimal write result (no returned rows needed). */
interface WriteResult {
  error: { message: string } | null;
}

/** The consent version pinned for the cycle_tracking consent copy shown today. */
export const CYCLE_TRACKING_CONSENT_VERSION = 'v1-2026-07';

/**
 * Reads the caller's own user_cycle_context row (own-row RLS; see the
 * merge-deferred migration's own-row SELECT policy). Never throws; the caller
 * wraps this in withTimeout + try/catch and fails open to opt_in: false.
 */
export function readOwnCycleContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<SingleResult<CycleContextRow>> {
  const builder = supabase.from('user_cycle_context') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<SingleResult<CycleContextRow>>;
      };
    };
  };
  return builder
    .select('opt_in, current_phase, cycle_length_days, last_period_start')
    .eq('user_id', userId)
    .maybeSingle();
}

/**
 * Upserts the caller's own user_cycle_context row (own-row RLS), conflict
 * resolved on user_id so a repeated save updates in place.
 */
export function upsertOwnCycleContext(
  supabase: SupabaseClient,
  row: CycleContextUpsert,
): Promise<WriteResult> {
  const builder = supabase.from('user_cycle_context') as unknown as {
    upsert: (values: CycleContextUpsert, options: { onConflict: string }) => Promise<WriteResult>;
  };
  return builder.upsert(row, { onConflict: 'user_id' });
}

/**
 * Reads the caller's own consent_ledger rows for consent_type='cycle_tracking'
 * (own-row; consent_ledger has no cross-user read policy for consumers).
 */
export function readOwnCycleConsent(
  supabase: SupabaseClient,
  userId: string,
): Promise<ListResult<CycleConsentRow>> {
  const builder = supabase.from('consent_ledger') as unknown as {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        eq: (col: string, val: string) => Promise<ListResult<CycleConsentRow>>;
      };
    };
  };
  return builder
    .select('consent_type, granted, granted_at, revoked_at')
    .eq('user_id', userId)
    .eq('consent_type', 'cycle_tracking');
}

/**
 * Determines whether the most recent 'cycle_tracking' consent row is an
 * active grant (granted and not revoked). Mirrors the same "latest by
 * granted_at, granted && revoked_at===null" rule
 * src/lib/arnold/scanning/accuracy/fusion/anchorIngestion.ts's hasActiveConsent
 * uses for its own AnchorConsentType union; duplicated here (not imported)
 * because that union does not include 'cycle_tracking' and this task must not
 * touch the fusion/ directory.
 */
export function hasActiveCycleConsent(rows: CycleConsentRow[]): boolean {
  if (rows.length === 0) return false;
  const latest = rows.reduce((a, b) => (a.granted_at >= b.granted_at ? a : b));
  return latest.granted && latest.revoked_at === null;
}

/**
 * Inserts a new consent_ledger row recording a grant or revoke of
 * 'cycle_tracking' consent. consent_ledger is append-only (no update policy
 * anywhere else in this repo touches it either); a revoke is its own new row
 * with granted: false, matching the ledger's version-pinned, evidence-of-intent
 * design (Prompt #116 / Marshall compliance migration).
 */
export function insertCycleConsent(
  supabase: SupabaseClient,
  row: CycleConsentInsert,
): Promise<WriteResult> {
  const builder = supabase.from('consent_ledger') as unknown as {
    insert: (values: CycleConsentInsert) => Promise<WriteResult>;
  };
  return builder.insert(row);
}
