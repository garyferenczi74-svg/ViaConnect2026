import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const ANALYTICS_TABLES = [
  "daily_checkins",
  "daily_scores",
  "health_scores",
  "supplement_logs",
  "protocol_adherence_log",
  "user_current_supplements",
  "user_protocols",
  "hannah_trend_insights",
  "journey_recommendations",
] as const;

const ANALYTICS_QUERY_PREFIXES = [
  "analytics-",
  "bio-opt-trend",
];

/**
 * Subscribes to postgres_changes for every table that feeds the analytics
 * page. On any change for the current user, invalidate the analytics query
 * keys so React Query refetches. One channel per mount.
 */
export function useAnalyticsRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey?.[0];
          if (typeof key !== "string") return false;
          return ANALYTICS_QUERY_PREFIXES.some((p) => key.startsWith(p));
        },
      });
    };

    const channel = supabase.channel(`analytics-rt-${userId}`);

    for (const table of ANALYTICS_TABLES) {
      channel.on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${userId}`,
        } as never,
        invalidate,
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
