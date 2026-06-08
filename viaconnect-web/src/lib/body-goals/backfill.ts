// Prompt 179a Section 7: lazy, idempotent backfill. When a member has a
// user_weight_goals row but no active body_goals, seed one (origin
// caq_backfill, rate driver Steady default) and fire the initial_plan target.
// Idempotent: returns the existing active goal if one already exists; the
// one-active-goal partial unique index guards a concurrent double-seed.

import type { SupabaseClient } from '@supabase/supabase-js';
import { readWeightGoal } from '@/lib/weight-goals/accessor';
import { kgToLbs } from '@/lib/weight-goals/guardrails';
import { safeLog } from '@/lib/utils/safe-log';
import { getActiveGoal, getLatestWeight } from './goalsData';
import { readGoalProfile } from './profile';
import { createBodyGoal } from './createGoal';
import type { BodyGoalRow } from './types';

const STEADY_RATE_LB_PER_WEEK = 1.0;
const MAINTAIN_BAND_LB = 2.2;

export async function backfillActiveGoalIfMissing(
  userId: string,
  supabase: SupabaseClient,
): Promise<BodyGoalRow | null> {
  try {
    // Idempotent guard: if an active goal already exists, do nothing.
    const existing = await getActiveGoal(userId, supabase);
    if (existing) return existing;

    const uwg = await readWeightGoal(userId, supabase);
    if (!uwg || !(uwg.goalWeightKg > 0)) return null; // nothing to seed from

    const [latest, profile] = await Promise.all([
      getLatestWeight(userId, supabase),
      readGoalProfile(userId, supabase),
    ]);

    const goalWeightLb = kgToLbs(uwg.goalWeightKg);
    const startWeightLb =
      latest?.weightLb ?? (uwg.currentWeightKg > 0 ? kgToLbs(uwg.currentWeightKg) : goalWeightLb);
    const isMaintain = Math.abs(startWeightLb - goalWeightLb) <= MAINTAIN_BAND_LB;

    await createBodyGoal(
      {
        userId,
        driver: 'rate',
        goalWeightLb,
        startWeightLb,
        startDate: new Date().toISOString().slice(0, 10),
        targetDate: null,
        targetRateLbPerWeek: isMaintain ? 0 : STEADY_RATE_LB_PER_WEEK,
        goalBodyfatPct: null,
        sex: profile.sex,
        ageYears: profile.ageYears,
        heightIn: profile.heightIn,
        activityLevel: profile.activityLevel,
        latestWeightLb: startWeightLb,
        currentBodyFatPct: latest?.bodyFatPct ?? null,
        dietaryChoice: null,
        origin: 'caq_backfill',
        targetPacePreset: isMaintain ? null : 'steady',
        requireTarget: false,
        closePriorActive: false,
      },
      supabase,
    );

    // Return whatever is now active (the row we seeded, or a race winner).
    return getActiveGoal(userId, supabase);
  } catch (err) {
    safeLog.warn('backfillActiveGoalIfMissing', 'backfill failed', { err, userId });
    return null;
  }
}
