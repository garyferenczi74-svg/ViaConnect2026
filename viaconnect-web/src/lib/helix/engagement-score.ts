// Helix Engagement Score — The ONLY Helix metric visible to practitioners/naturopaths
// Returns a single 0-100 number. NO gamification details exposed.

import { createClient } from "@/lib/supabase/client";

export interface EngagementScoreResult {
  engagementScore: number;      // 0-100
  daysActiveThisMonth: number;
  supplementAdherenceRate: number;
}

export async function calculateEngagementScore(userId: string): Promise<EngagementScoreResult> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Days active (from helix transactions — count distinct dates)
  const { data: txns } = await supabase
    .from("helix_transactions")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  const uniqueDays = new Set((txns || []).map((t) => t.created_at.split("T")[0]));
  const daysActiveThisMonth = uniqueDays.size;
  const daysSoFar = now.getDate();
  const activityRate = Math.min(100, (daysActiveThisMonth / daysSoFar) * 100);

  // Supplement adherence (from daily_scores regimen_score — NOT helix-specific)
  const { data: scores } = await supabase
    .from("daily_scores")
    .select("regimen_score")
    .eq("user_id", userId)
    .gte("date", monthStart);

  const adherenceScores = (scores || []).map((s) => s.regimen_score || 0);
  const supplementAdherenceRate = adherenceScores.length > 0
    ? Math.round(adherenceScores.reduce((a, b) => a + b, 0) / adherenceScores.length)
    : 0;

  // Active challenges count
  const { count: activeChallenges } = await supabase
    .from("helix_challenge_participants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  // Current streak (longest active)
  const { data: streaks } = await supabase
    .from("helix_streaks")
    .select("current_count")
    .eq("user_id", userId)
    .order("current_count", { ascending: false })
    .limit(1);

  const longestStreak = streaks?.[0]?.current_count || 0;
  const streakScore = Math.min(100, longestStreak * 3.3);

  // Composite engagement score
  const engagementScore = Math.round(
    (activityRate * 0.30) +
    (supplementAdherenceRate * 0.30) +
    (Math.min(100, (activeChallenges || 0) * 25) * 0.15) +
    (streakScore * 0.15) +
    (Math.min(100, daysActiveThisMonth * 5) * 0.10)
  );

  return {
    engagementScore: Math.min(100, Math.max(0, engagementScore)),
    daysActiveThisMonth,
    supplementAdherenceRate,
  };
}
