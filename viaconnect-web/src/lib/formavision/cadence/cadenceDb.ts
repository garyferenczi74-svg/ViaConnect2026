// Prompt 211a Workstream 4 (Part 2) - Typed thin accessors for cadence tables
// that are not yet in the generated Supabase Database type.
//
// scan_streak and scan_cadence_reminders are created by migration
// 20260710120000 but that migration is built, not yet applied, so
// src/lib/supabase/types.ts has not been regenerated to include them. Querying a
// table absent from the Database type makes supabase-js fall back to a deeply
// recursive builder type (TS2589 "excessively deep") and rejects insert/upsert
// overloads. Rather than reach for `any` (banned), this module wraps the client
// in a narrow, hand-written interface that describes ONLY the couple of shapes
// the cadence surfaces use. When the migration is applied and types regenerate,
// these helpers can be deleted and the callers can use the generated types
// directly. Zero `any`: every shape is explicit.

import type { SupabaseClient } from '@supabase/supabase-js';

/** The scan_streak columns the streak surface reads. */
export interface ScanStreakRow {
  current_streak: number;
  longest_streak: number;
}

/** The scan_cadence_reminders columns the opt-in surface reads. */
export interface CadenceReminderRow {
  opt_in: boolean;
  reminder_time_of_day: string | null;
}

/** The opt-in upsert payload the opt-in surface writes. */
export interface CadenceReminderUpsert {
  user_id: string;
  opt_in: boolean;
  reminder_time_of_day: string | null;
  opted_in_at: string | null;
}

/** Minimal single-row read result. */
interface SingleResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Minimal write result (no returned rows needed). */
interface WriteResult {
  error: { message: string } | null;
}

/**
 * Reads the caller's own scan_streak row (own-row; scan_streak has own-row RLS).
 * Returns { data, error } like any supabase-js single read. Never throws here;
 * the caller wraps this in withTimeout + try/catch and fails open.
 */
export function readOwnScanStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<SingleResult<ScanStreakRow>> {
  // The single `as unknown` hop is confined to this thin accessor so the callers
  // stay fully typed against ScanStreakRow. No `any`.
  const builder = supabase.from('scan_streak') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<SingleResult<ScanStreakRow>>;
      };
    };
  };
  return builder.select('current_streak, longest_streak').eq('user_id', userId).maybeSingle();
}

/**
 * Reads the caller's own scan_cadence_reminders opt-in row (own-row RLS).
 */
export function readOwnCadenceReminder(
  supabase: SupabaseClient,
  userId: string,
): Promise<SingleResult<CadenceReminderRow>> {
  const builder = supabase.from('scan_cadence_reminders') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<SingleResult<CadenceReminderRow>>;
      };
    };
  };
  return builder
    .select('opt_in, reminder_time_of_day')
    .eq('user_id', userId)
    .maybeSingle();
}

/**
 * Upserts the caller's own scan_cadence_reminders opt-in row (own-row RLS),
 * conflict-resolved on user_id so a repeated toggle updates in place.
 */
export function upsertOwnCadenceReminder(
  supabase: SupabaseClient,
  row: CadenceReminderUpsert,
): Promise<WriteResult> {
  const builder = supabase.from('scan_cadence_reminders') as unknown as {
    upsert: (values: CadenceReminderUpsert, options: { onConflict: string }) => Promise<WriteResult>;
  };
  return builder.upsert(row, { onConflict: 'user_id' });
}
