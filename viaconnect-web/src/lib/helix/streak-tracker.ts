// Helix Streak Tracker — Tracks consecutive-day streaks across multiple types

import { createClient } from "@/lib/supabase/client";

export type StreakType = "supplement_adherence" | "daily_checkin" | "exercise" | "steps_10k" | "sleep_7plus";

export async function updateStreak(userId: string, streakType: StreakType): Promise<{ current: number; longest: number; isNew: boolean }> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("helix_streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("streak_type", streakType)
    .single();

  if (!existing) {
    // First time — create streak
    await supabase.from("helix_streaks").insert({
      user_id: userId,
      streak_type: streakType,
      current_count: 1,
      longest_count: 1,
      last_logged_date: today,
    });
    return { current: 1, longest: 1, isNew: true };
  }

  const lastDate = existing.last_logged_date;
  if (lastDate === today) {
    // Already logged today
    return { current: existing.current_count, longest: existing.longest_count, isNew: false };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const isConsecutive = lastDate === yesterday;
  const newCount = isConsecutive ? existing.current_count + 1 : 1;
  const newLongest = Math.max(existing.longest_count, newCount);

  await supabase.from("helix_streaks").update({
    current_count: newCount,
    longest_count: newLongest,
    last_logged_date: today,
    updated_at: new Date().toISOString(),
  }).eq("id", existing.id);

  return { current: newCount, longest: newLongest, isNew: true };
}

export async function getStreaks(userId: string): Promise<Record<StreakType, { current: number; longest: number }>> {
  const supabase = createClient();
  const { data } = await supabase.from("helix_streaks").select("*").eq("user_id", userId);

  const result: Record<string, { current: number; longest: number }> = {};
  for (const streak of data || []) {
    result[streak.streak_type] = { current: streak.current_count, longest: streak.longest_count };
  }
  return result as Record<StreakType, { current: number; longest: number }>;
}
