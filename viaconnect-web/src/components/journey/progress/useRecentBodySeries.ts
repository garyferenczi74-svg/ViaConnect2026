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
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  entryToSourceName,
  unwrapRelatedEntry,
  type DatedSourcedPoint,
} from '@/lib/analytics/provenance';

export interface RecentBodySeries {
  /** Recent weight in lbs, oldest first. */
  weightLbs: number[];
  /** Recent body-fat percentage, oldest first. */
  bodyFatPct: number[];
  /** Dated weight points (oldest first) for trend math. */
  weightPoints: Array<{ date: string; value: number }>;
  /** Dated sourced points for Brief 32 trend/chip gates. */
  weightSourced: DatedSourcedPoint[];
  bodyFatSourced: DatedSourcedPoint[];
  leanMassSourced: DatedSourcedPoint[];
  loading: boolean;
}

// A bounded recent window: enough to read a trend, small enough to stay light.
const RECENT_LIMIT = 30;

export function useRecentBodySeries(userId: string | null): RecentBodySeries {
  const emptySeries = (): RecentBodySeries => ({
    weightLbs: [],
    bodyFatPct: [],
    weightPoints: [],
    weightSourced: [],
    bodyFatSourced: [],
    leanMassSourced: [],
    loading: false,
  });

  const [series, setSeries] = useState<RecentBodySeries>(emptySeries);

  useEffect(() => {
    if (!userId) {
      setSeries(emptySeries());
      return;
    }

    let active = true;
    setSeries((s) => ({ ...s, loading: true }));

    (async () => {
      const empty = emptySeries();
      try {
        const supabase = createClient();

        // Newest first from the DB (so LIMIT keeps the most recent), then we
        // reverse to oldest-first for a left-to-right sparkline.
        type BodyRow = {
          weight_lbs: number | null;
          body_fat_pct: number | null;
          lean_body_mass_lbs: number | null;
          created_at: string | null;
          body_tracker_entries?: unknown;
        };
        const { data } = await withTimeout(
          supabase
            .from('body_tracker_weight')
            .select('weight_lbs, body_fat_pct, lean_body_mass_lbs, created_at, body_tracker_entries(source, device_name, manual_source_id)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(RECENT_LIMIT) as unknown as Promise<{ data: BodyRow[] | null; error: unknown }>,
          4000,
          'useRecentBodySeries read',
        );

        if (!active) return;

        const rows = (Array.isArray(data) ? data : []) as BodyRow[];
        const ordered = [...rows].reverse();

        const weightPoints: Array<{ date: string; value: number }> = [];
        const weightLbs: number[] = [];
        const bodyFatPct: number[] = [];
        const weightSourced: DatedSourcedPoint[] = [];
        const bodyFatSourced: DatedSourcedPoint[] = [];
        const leanMassSourced: DatedSourcedPoint[] = [];

        for (const r of ordered) {
          const sourceName = entryToSourceName(unwrapRelatedEntry(r.body_tracker_entries));
          const dated = typeof r.created_at === 'string' ? r.created_at : '';
          const w = typeof r.weight_lbs === 'number' ? r.weight_lbs : Number(r.weight_lbs);
          if (Number.isFinite(w) && w > 0 && dated) {
            weightLbs.push(w);
            weightPoints.push({ date: dated, value: w });
            weightSourced.push({ value: w, date: dated, sourceName });
          }
          const bf =
            typeof r.body_fat_pct === 'number' ? r.body_fat_pct : Number(r.body_fat_pct);
          if (Number.isFinite(bf) && bf > 0) {
            bodyFatPct.push(bf);
            if (dated) bodyFatSourced.push({ value: bf, date: dated, sourceName });
          }
          const lean =
            typeof r.lean_body_mass_lbs === 'number'
              ? r.lean_body_mass_lbs
              : Number(r.lean_body_mass_lbs);
          if (Number.isFinite(lean) && lean > 0 && dated) {
            leanMassSourced.push({ value: lean, date: dated, sourceName });
          }
        }

        setSeries({
          weightLbs,
          bodyFatPct,
          weightPoints,
          weightSourced,
          bodyFatSourced,
          leanMassSourced,
          loading: false,
        });
      } catch (error) {
        if (!active) return;
        safeLog.warn('useRecentBodySeries', 'read failed, failing open', { error });
        setSeries(empty);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  return series;
}
