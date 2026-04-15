/**
 * Shared server loader for consumer analytics.
 *
 * Gives any portal (consumer, practitioner, naturopath) a single entry
 * point that returns the assembled analytics snapshot for a given user_id.
 * RLS governs what each caller can actually read; this loader trusts the
 * DB to filter.
 *
 * Intended future callers:
 *   - practitioner/patients/[id]/page.tsx  (Gordon view)
 *   - naturopath/patients/[id]/page.tsx    (Arnold view)
 *
 * The consumer analytics page queries Supabase directly today; when we
 * unify those queries, they should collapse into this loader.
 */

import { createClient } from "@/lib/supabase/server";
import { detectMilestones, tierForScore } from "@/lib/agents/jeffery/milestones";

export type ConsumerAnalyticsSnapshot = {
  userId: string;
  viewerRole: "consumer" | "practitioner" | "naturopath";
  bio: {
    current: number;
    tier: string;
    history: Array<{ date: string; score: number }>;
    milestones: ReturnType<typeof detectMilestones>;
  };
  daily: {
    count: number;
    lastDate: string | null;
    categoryAverages: {
      sleep: number;
      nutrition: number;
      movement: number;
      stress: number;
      energy: number;
    };
  };
  streak: number;
  protocolCount: number;
  adherenceOverall: number;
  confidenceLevel: number;
};

function avg(nums: Array<number | null | undefined>): number {
  const clean = nums.filter((n): n is number => typeof n === "number");
  if (clean.length === 0) return 0;
  return Math.round(clean.reduce((s, v) => s + v, 0) / clean.length);
}

function consecutiveDaysFromToday(dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export async function loadConsumerAnalytics(
  userId: string,
  viewerRole: "consumer" | "practitioner" | "naturopath" = "consumer",
): Promise<ConsumerAnalyticsSnapshot> {
  const supabase = createClient();
  const client = supabase as any;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [healthRes, dailyRes, checkinRes, currentRes, logsRes, protocolsRes] = await Promise.all([
    client
      .from("health_scores")
      .select("score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(365),
    client
      .from("daily_scores")
      .select(
        "overall_score, sleep_score, nutrition_score, activity_score, mood_stress_score, energy_score, score_date",
      )
      .eq("user_id", userId)
      .gte("score_date", ninetyDaysAgo)
      .order("score_date", { ascending: true }),
    client
      .from("daily_checkins")
      .select("check_in_date")
      .eq("user_id", userId)
      .order("check_in_date", { ascending: false })
      .limit(365),
    client
      .from("user_current_supplements")
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true),
    client
      .from("supplement_logs")
      .select("logged_at")
      .eq("user_id", userId)
      .gte("logged_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
    client
      .from("user_protocols")
      .select("id, active")
      .eq("user_id", userId)
      .eq("active", true),
  ]);

  const bioHistory = (healthRes.data ?? [])
    .filter((r: any) => typeof r.score === "number")
    .map((r: any) => ({ date: r.created_at as string, score: Number(r.score) }));

  const dailyRows = (dailyRes.data ?? []) as Array<any>;
  const checkinDates = new Set(
    ((checkinRes.data ?? []) as Array<{ check_in_date: string }>).map(
      (r) => r.check_in_date,
    ),
  );
  const protocolCountCurrent = (currentRes.data ?? []).length;
  const protocolCountLegacy = (protocolsRes.data ?? []).length;
  const protocolCount = protocolCountCurrent > 0 ? protocolCountCurrent : protocolCountLegacy;

  const currentScore = bioHistory.length > 0
    ? Math.round(bioHistory[bioHistory.length - 1].score)
    : 0;

  const expectedDoses = protocolCount * 30; // assume one dose/day baseline
  const loggedDoses = (logsRes.data ?? []).length;
  const adherenceOverall = expectedDoses > 0
    ? Math.min(100, Math.round((loggedDoses / expectedDoses) * 100))
    : 0;

  const categoryAverages = {
    sleep: avg(dailyRows.map((r) => r.sleep_score)),
    nutrition: avg(dailyRows.map((r) => r.nutrition_score)),
    movement: avg(dailyRows.map((r) => r.activity_score)),
    stress: avg(dailyRows.map((r) => r.mood_stress_score)),
    energy: avg(dailyRows.map((r) => r.energy_score)),
  };

  // Confidence gating (spec §2.5): 72% CAQ only, 86% CAQ+labs, 96% +genetics.
  // Without a labs table at load time, fall back to the score-linked value or
  // 72% when any CAQ data is present.
  const [caqRes, geneticsRes] = await Promise.all([
    client.from("assessment_results").select("id").eq("user_id", userId).limit(1),
    client.from("genetic_variants").select("id").eq("user_id", userId).limit(1),
  ]);
  const hasCAQ = (caqRes.data ?? []).length > 0;
  const hasGenetics = (geneticsRes.data ?? []).length > 0;
  const confidenceLevel = hasCAQ && hasGenetics ? 96 : hasCAQ ? 72 : 0;

  return {
    userId,
    viewerRole,
    bio: {
      current: currentScore,
      tier: tierForScore(currentScore),
      history: bioHistory,
      milestones: detectMilestones(bioHistory),
    },
    daily: {
      count: dailyRows.length,
      lastDate: dailyRows.length > 0 ? dailyRows[dailyRows.length - 1].score_date : null,
      categoryAverages,
    },
    streak: consecutiveDaysFromToday(checkinDates),
    protocolCount,
    adherenceOverall,
    confidenceLevel,
  };
}

