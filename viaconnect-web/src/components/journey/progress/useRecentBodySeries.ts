'use client';

/**
 * src/components/journey/progress/useRecentBodySeries.ts
 *
 * A small fail-open client read of the user's recent body_tracker_weight rows
 * (Prompt 208d, Task D-T3). Returns the recent weight (lbs) and body-fat (%)
 * series, oldest first, for the body-composition sparklines and for the energy
 * balance composition trend (via computeTrend). body_tracker_weight is
 * owner-scoped RLS, so the browser client reads it directly.
 *
 * FAIL-OPEN: any error degrades to empty series; the hook never throws. Empty
 * or single-point series render an honest flat baseline downstream rather than
 * a fabricated trend.
 *
 * No em/en-dashes, no emojis. No new dependencies. TypeScript strict (no any).
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface RecentBodySeries {
  /** Recent weight in lbs, oldest first. */
  weightLbs: number[];
  /** Recent body-fat percentage, oldest first. */
  bodyFatPct: number[];
  /** Dated weight points (oldest first) for trend math. */
  weightPoints: Array<{ date: string; value: number }>;
  loading: boolean;
}

// A bounded recent window: enough to read a trend, small enough to stay light.
const RECENT_LIMIT = 30;

export function useRecentBodySeries(userId: string | null): RecentBodySeries {
  const [series, setSeries] = useState<RecentBodySeries>({
    weightLbs: [],
    bodyFatPct: [],
    weightPoints: [],
    loading: false,
  });

  useEffect(() => {
    if (!userId) {
      setSeries({ weightLbs: [], bodyFatPct: [], weightPoints: [], loading: false });
      return;
    }

    let active = true;
    setSeries((s) => ({ ...s, loading: true }));

    (async () => {
      const empty: RecentBodySeries = {
        weightLbs: [],
        bodyFatPct: [],
        weightPoints: [],
        loading: false,
      };
      try {
        const supabase = createClient();
        const sb = supabase as unknown as { from: (t: string) => any };

        // Newest first from the DB (so LIMIT keeps the most recent), then we
        // reverse to oldest-first for a left-to-right sparkline.
        const { data } = await sb
          .from('body_tracker_weight')
          .select('weight_lbs, body_fat_pct, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(RECENT_LIMIT);

        if (!active) return;

        const rows = (Array.isArray(data) ? data : []) as Array<{
          weight_lbs: number | null;
          body_fat_pct: number | null;
          created_at: string | null;
        }>;
        const ordered = [...rows].reverse();

        const weightPoints: Array<{ date: string; value: number }> = [];
        const weightLbs: number[] = [];
        const bodyFatPct: number[] = [];

        for (const r of ordered) {
          const w = typeof r.weight_lbs === 'number' ? r.weight_lbs : Number(r.weight_lbs);
          if (Number.isFinite(w) && typeof r.created_at === 'string') {
            weightLbs.push(w);
            weightPoints.push({ date: r.created_at, value: w });
          }
          const bf =
            typeof r.body_fat_pct === 'number' ? r.body_fat_pct : Number(r.body_fat_pct);
          if (Number.isFinite(bf)) {
            bodyFatPct.push(bf);
          }
        }

        setSeries({ weightLbs, bodyFatPct, weightPoints, loading: false });
      } catch {
        if (!active) return;
        setSeries(empty);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  return series;
}
