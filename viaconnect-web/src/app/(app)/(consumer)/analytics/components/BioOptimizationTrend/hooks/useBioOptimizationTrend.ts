import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ScorePoint, TimeRange } from "../utils/trendCalculations";
import { RANGE_DAYS } from "../utils/trendCalculations";

const supabase = createClient();

export type BioTrendData = {
  bioScores: ScorePoint[];
  dailyScores: ScorePoint[];
  categoryAverages: {
    sleep: number;
    nutrition: number;
    movement: number;
    stress: number;
    adherence: number;
  };
  current: number;
};

export function useBioOptimizationTrend(userId: string | null, range: TimeRange) {
  return useQuery<BioTrendData>({
    queryKey: ["bio-opt-trend", userId, range],
    enabled: !!userId,
    queryFn: async () => {
      const days = RANGE_DAYS[range];
      const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const sinceDate = sinceIso.slice(0, 10);
      const sb = supabase as any;

      const [bioRes, dailyRes] = await Promise.all([
        supabase
          .from("health_scores")
          .select("score, created_at")
          .eq("user_id", userId!)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: true }),
        sb
          .from("daily_scores")
          .select("overall_score, sleep_score, nutrition_score, activity_score, mood_stress_score, energy_score, score_date")
          .eq("user_id", userId!)
          .gte("score_date", sinceDate)
          .order("score_date", { ascending: true }),
      ]);

      const bioScores: ScorePoint[] = (bioRes.data ?? [])
        .filter((r: any) => typeof r.score === "number" && r.created_at)
        .map((r: any) => ({ date: r.created_at as string, score: Number(r.score) }));

      const dailyRaw = (dailyRes.data ?? []) as Array<{
        overall_score: number | null;
        sleep_score: number | null;
        nutrition_score: number | null;
        activity_score: number | null;
        mood_stress_score: number | null;
        energy_score: number | null;
        score_date: string;
      }>;

      const dailyScores: ScorePoint[] = dailyRaw
        .filter((r) => typeof r.overall_score === "number")
        .map((r) => ({ date: r.score_date, score: Number(r.overall_score) }));

      const avg = (key: keyof (typeof dailyRaw)[number]) => {
        const nums = dailyRaw.map((r) => r[key]).filter((v): v is number => typeof v === "number");
        if (nums.length === 0) return 0;
        return Math.round(nums.reduce((s, v) => s + v, 0) / nums.length);
      };

      const current =
        bioScores.length > 0
          ? Math.round(bioScores[bioScores.length - 1].score)
          : dailyScores.length > 0
            ? Math.round(dailyScores[dailyScores.length - 1].score)
            : 0;

      return {
        bioScores,
        dailyScores,
        categoryAverages: {
          sleep: avg("sleep_score"),
          nutrition: avg("nutrition_score"),
          movement: avg("activity_score"),
          stress: avg("mood_stress_score"),
          adherence: avg("energy_score"),
        },
        current,
      };
    },
    staleTime: 60_000,
  });
}
