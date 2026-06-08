// Prompt 179a save-path write-through: body_goals is the write authority for
// goal weight; after a goal save we project goal weight (and, via the DB
// trigger, direction) into user_weight_goals so the Weight tab and macro engine
// stay consistent. Fail-open: the body_goals write is authoritative and is
// never blocked by a projection failure (it self-heals on the next save).

import type { SupabaseClient } from '@supabase/supabase-js';
import { lbsToKg } from '@/lib/weight-goals/guardrails';
import { readWeightGoal, writeWeightGoal } from '@/lib/weight-goals/accessor';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function projectGoalToWeightGoals(
  args: { userId: string; goalWeightLb: number; startWeightLb: number },
  supabase: SupabaseClient,
): Promise<{ ok: boolean }> {
  try {
    const existing = await withTimeout(
      readWeightGoal(args.userId, supabase),
      8000,
      'projectWeightGoal.read',
    );
    // Set current weight only when user_weight_goals has none yet, so live
    // weight tracking from existing flows is never clobbered (179a Section 4.2).
    const currentWeightKg = existing?.currentWeightKg ?? lbsToKg(args.startWeightLb);
    await withTimeout(
      writeWeightGoal(
        {
          userId: args.userId,
          currentWeightKg,
          goalWeightKg: lbsToKg(args.goalWeightLb),
          source: 'body_tracker',
        },
        supabase,
      ),
      8000,
      'projectWeightGoal.write',
    );
    return { ok: true };
  } catch (err) {
    safeLog.warn('projectWeightGoal', 'write-through projection failed', { err, userId: args.userId });
    return { ok: false };
  }
}

/**
 * Prompt 179a self-heal: project, then stamp the sync flags on the body_goals
 * row. On success clears needs_resync and records legacy_synced_at; on failure
 * sets needs_resync so the next read re-projects. The flag update is itself
 * fail-soft so it can never block the authoritative body_goals write.
 */
export async function projectAndMarkSync(
  goalId: string,
  args: { userId: string; goalWeightLb: number; startWeightLb: number },
  supabase: SupabaseClient,
): Promise<{ ok: boolean }> {
  const result = await projectGoalToWeightGoals(args, supabase);
  try {
    const patch = result.ok
      ? { needs_resync: false, legacy_synced_at: new Date().toISOString() }
      : { needs_resync: true };
    await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('body_goals').update(patch).eq('id', goalId),
      8000,
      'projectAndMarkSync.flags',
    );
  } catch (err) {
    safeLog.warn('projectAndMarkSync', 'sync flag update failed', { err, goalId });
  }
  return result;
}
