/**
 * ViaConnect Gamification Engine — Compliance Streak Processing
 *
 * Tracks daily supplement compliance streaks, streak recovery,
 * milestone rewards, and multiplier calculation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreakResult {
  streakUpdated: boolean;
  currentStreak: number;
  multiplier: number;
  milestonesHit: number[];
}

interface StreakRecord {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  recovery_available: boolean;
  multiplier: number;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STREAK_MILESTONES: Record<number, { source: string; amount: number }> = {
  7: { source: 'weekly_streak', amount: 25 },
  30: { source: 'monthly_streak', amount: 100 },
  90: { source: 'quarterly_streak', amount: 500 },
  365: { source: 'weekly_streak', amount: 1000 }, // annual bonus
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function todayUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// calculateMultiplier
// ---------------------------------------------------------------------------

export function calculateMultiplier(streakDays: number): number {
  if (streakDays >= 90) return 3;
  if (streakDays >= 30) return 2;
  if (streakDays >= 7) return 1.5;
  return 1;
}

// ---------------------------------------------------------------------------
// processComplianceCheckin
// ---------------------------------------------------------------------------

export async function processComplianceCheckin(
  userId: string,
): Promise<StreakResult> {
  const supabase = getSupabase();
  const today = todayUTC();

  // Get or create streak record
  let { data: streak, error } = await supabase
    .from('compliance_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Streak fetch failed: ${error.message}`);

  // First-time user — create record
  if (!streak) {
    const newStreak: Partial<StreakRecord> = {
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_checkin_date: today,
      recovery_available: false,
      multiplier: 1,
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('compliance_streaks')
      .insert(newStreak)
      .select()
      .single();

    if (insertError) throw new Error(`Streak insert failed: ${insertError.message}`);

    return {
      streakUpdated: true,
      currentStreak: 1,
      multiplier: 1,
      milestonesHit: [],
    };
  }

  // Already checked in today — no-op
  if (streak.last_checkin_date === today) {
    return {
      streakUpdated: false,
      currentStreak: streak.current_streak,
      multiplier: streak.multiplier,
      milestonesHit: [],
    };
  }

  const gap = streak.last_checkin_date ? daysBetween(streak.last_checkin_date, today) : 999;

  let newStreak = streak.current_streak;
  let recoveryAvailable = streak.recovery_available;

  if (gap === 1) {
    // Consecutive day — increment
    newStreak += 1;
  } else if (gap === 2 && recoveryAvailable) {
    // Missed one day but recovery is available — preserve streak
    newStreak += 1;
    recoveryAvailable = false; // consume recovery
  } else {
    // Streak broken — reset
    newStreak = 1;
    recoveryAvailable = false;
  }

  // Grant recovery at streak >= 7
  if (newStreak >= 7) {
    recoveryAvailable = true;
  }

  // Update longest streak
  const longestStreak = Math.max(streak.longest_streak, newStreak);

  // Calculate multiplier
  const multiplier = calculateMultiplier(newStreak);

  // Persist
  const { error: updateError } = await supabase
    .from('compliance_streaks')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_checkin_date: today,
      recovery_available: recoveryAvailable,
      multiplier,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) throw new Error(`Streak update failed: ${updateError.message}`);

  // Check milestones and award tokens
  const milestonesHit: number[] = [];
  const previousStreak = streak.current_streak;

  for (const [milestoneStr, reward] of Object.entries(STREAK_MILESTONES)) {
    const milestone = Number(milestoneStr);
    // Fire only when crossing the milestone boundary
    if (newStreak >= milestone && previousStreak < milestone) {
      milestonesHit.push(milestone);

      try {
        const { awardTokens } = await import('./token-engine');
        await awardTokens(userId, reward.source, undefined, reward.amount);
      } catch {
        // Token award is non-fatal to streak processing
      }
    }
  }

  return {
    streakUpdated: true,
    currentStreak: newStreak,
    multiplier,
    milestonesHit,
  };
}
