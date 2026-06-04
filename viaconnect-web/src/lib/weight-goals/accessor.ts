// Canonical weight-goal accessor (Prompt 173 Task 2 rebuild on main 2026-06-03).
//
// SINGLE read path AND SINGLE write path for public.user_weight_goals. The
// CAQ, Body Tracker (Arnold), and the Gordon macros engine all import
// readWeightGoal / writeWeightGoal from here.
//
// INVARIANTS (do not violate in any caller):
//   1. NO caller writes public.user_weight_goals directly. Always go through
//      writeWeightGoal so the DB trigger owns goal_direction.
//   2. NO caller recomputes goal_direction for storage. The database trigger
//      public.fn_compute_weight_goal_direction is the ONE authoritative place
//      direction is computed (migration
//      20260603100000_prompt_173_user_weight_goals.sql). writeWeightGoal never
//      sends goal_direction; it relies on the BEFORE trigger to overwrite any
//      client value and return the authoritative direction in the RETURNING
//      projection.
//   3. previewGoalDirection is for CLIENT-SIDE PREVIEW ONLY (e.g. the CAQ
//      showing the direction live as the user types). On readback the DB
//      value wins.
//
// App-level types use camelCase; the DB row shape is snake_case to match the
// SQL columns. Mapping happens in rowToWeightGoal.

import type { SupabaseClient } from '@supabase/supabase-js';
import { MACRO_CONFIG } from '@/lib/gordon/macro-config';

export type GoalDirection = 'lose' | 'gain' | 'maintain';

// Source of a weight-goal write. 'caq' is the default; later edits from the
// Body Tracker or settings are attributable via the other values.
export type WeightGoalSource = 'caq' | 'body_tracker' | 'settings';

// Raw DB row shape (snake_case), mirroring public.user_weight_goals columns.
export interface UserWeightGoalRow {
  id: string;
  user_id: string;
  current_weight_kg: number;
  goal_weight_kg: number;
  goal_direction: GoalDirection;
  source: string;
  created_at: string;
  updated_at: string;
}

// App-level weight goal (camelCase).
export interface WeightGoal {
  id: string;
  userId: string;
  // Capture-time snapshot, NOT the live current weight (a later Prompt 173
  // phase resolves the live weight separately).
  currentWeightKg: number;
  goalWeightKg: number;
  // DB-owned: authoritative direction as computed by the trigger on write.
  goalDirection: GoalDirection;
  source: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Map a raw public.user_weight_goals row into the app-level WeightGoal shape.
 * Pure; no IO. Exported so it can be unit-tested in isolation.
 */
export function rowToWeightGoal(row: UserWeightGoalRow): WeightGoal {
  return {
    id: row.id,
    userId: row.user_id,
    currentWeightKg: row.current_weight_kg,
    goalWeightKg: row.goal_weight_kg,
    goalDirection: row.goal_direction,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * SINGLE read path. Returns the user's CURRENT weight goal, defined as the
 * most recently created row (ORDER BY created_at DESC LIMIT 1). Writes are
 * append-or-update via writeWeightGoal; the latest created row is the live
 * intent, and history is retained for auditability. Returns null when the
 * user has no weight goal yet.
 */
export async function readWeightGoal(
  userId: string,
  supabase: SupabaseClient,
): Promise<WeightGoal | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_weight_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`readWeightGoal failed: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return rowToWeightGoal(data as UserWeightGoalRow);
}

export interface WriteWeightGoalInput {
  userId: string;
  currentWeightKg: number;
  goalWeightKg: number;
  // Defaults to 'caq' when omitted (matches the DB column default).
  source?: WeightGoalSource;
}

/**
 * SINGLE write path. Inserts a new weight-goal row for the user. MUST NOT and
 * does NOT send goal_direction: the database trigger
 * public.fn_compute_weight_goal_direction owns it and overwrites any client
 * value. The RETURNING row reflects the trigger-computed direction (BEFORE
 * INSERT runs before the projection), so the caller receives the AUTHORITATIVE
 * direction the trigger computed, never a client guess.
 *
 * No caller may write public.user_weight_goals directly or recompute
 * direction for storage; route every write through here.
 */
export async function writeWeightGoal(
  input: WriteWeightGoalInput,
  supabase: SupabaseClient,
): Promise<WeightGoal> {
  // Deliberately omit goal_direction: it is trigger-owned. Sending it would
  // be ignored (overwritten) by the trigger, so we never send it.
  const insertRow = {
    user_id: input.userId,
    current_weight_kg: input.currentWeightKg,
    goal_weight_kg: input.goalWeightKg,
    source: input.source ?? 'caq',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_weight_goals')
    .insert(insertRow)
    .select('*')
    .single();

  if (error) {
    throw new Error(`writeWeightGoal failed: ${error.message}`);
  }
  return rowToWeightGoal(data as UserWeightGoalRow);
}

/**
 * PURE client-side preview helper. Returns the goal direction the DB trigger
 * WOULD compute, using MACRO_CONFIG.maintain_threshold_kg as the maintain band.
 *
 * FOR LIVE CLIENT-SIDE PREVIEW ONLY (e.g. the CAQ updating the direction label
 * as the user types a goal weight). The stored goal_direction read back from
 * the database is authoritative; do NOT persist this value or treat it as
 * canonical.
 *
 * Band semantics (MUST match the trigger exactly):
 *   goalWeightKg - currentWeightKg >  threshold -> 'gain'
 *   currentWeightKg - goalWeightKg >  threshold -> 'lose'
 *   otherwise (abs diff <= threshold, inclusive boundary) -> 'maintain'
 */
export function previewGoalDirection(
  currentWeightKg: number,
  goalWeightKg: number,
): GoalDirection {
  const threshold = MACRO_CONFIG.maintain_threshold_kg;
  if (goalWeightKg - currentWeightKg > threshold) {
    return 'gain';
  }
  if (currentWeightKg - goalWeightKg > threshold) {
    return 'lose';
  }
  return 'maintain';
}
