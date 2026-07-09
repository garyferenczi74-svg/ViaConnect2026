import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { reportSupabaseError } from "@/lib/utils/schema-drift";
import type { ScorePoint, TimeRange } from "../utils/trendCalculations";
import { RANGE_DAYS } from "../utils/trendCalculations";

const supabase = createClient();

// Prompt 210d P0-4: the daily_scores columns selected by the windowed journey
// graph read below, centralized (208k CHECKIN_COLUMNS pattern) so the shape
// test (src/app/actions/__tests__/daily-scores-shape.test.ts) can assert every
// column exists in the live schema union the P0-4 additive migration. The
// selected keys are UNCHANGED from the previous inline string.
export const DAILY_SCORES_COLUMNS =
  "overall_score, sleep_score, nutrition_score, activity_score, mood_stress_score, energy_score, score_date" as const;

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
          .select(DAILY_SCORES_COLUMNS)
          .eq("user_id", userId!)
          .gte("score_date", sinceDate)
          .order("score_date", { ascending: true }),
      ]);

      // Prompt 210d P0-4: schema drift on this select was previously invisible
      // (the error object was discarded and dailyScores rendered silently
      // empty). Report it via the P0-1 classifier: production stays fail-open
      // (log only, the empty-array fallback below is unchanged) while strict
      // mode (dev/preview/test) rethrows so the query surfaces the failure.
      // Context carries object names only.
      if (dailyRes.error) {
        reportSupabaseError("journeyGraph.read", dailyRes.error, { table: "daily_scores" });
      }

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
