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
