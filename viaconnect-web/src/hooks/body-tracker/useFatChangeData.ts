'use client';

// Prompt #85n: fetch the latest two body_tracker_segmental_fat rows and
// derive a 12-region change map for the heat-map overlay + callout deltas.
// The five physical fat-percentage segments fan out across the 12 region
// IDs the UI uses:
//
//   trunk_pct      -> neck, shoulders, chest, waist
//   left_arm_pct   -> l_bicep, l_forearm
//   right_arm_pct  -> r_bicep, r_forearm
//   left_leg_pct   -> l_quad, l_calf
//   right_leg_pct  -> r_quad, r_calf
//
// Behaviour:
//   0 rows: empty map; `hasAnyData = false`. Caller treats every region
//           as neutral and the callouts surface a "first entry" hint.
//   1 row : `hasAnyData = true`, `previous = null`, `change = null`,
//           direction neutral. Callouts surface "first entry".
//   2 rows: full deltas; direction respects CHANGE_THRESHOLD.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getChangeDirection,
  type RegionChange,
  type RegionChangeData,
} from '@/lib/body-tracker/heatmap-colors';

interface FatRow {
  trunk_pct: number | null;
  left_arm_pct: number | null;
  right_arm_pct: number | null;
  left_leg_pct: number | null;
  right_leg_pct: number | null;
  created_at: string;
}

const REGION_TO_SEGMENT: Record<string, keyof FatRow> = {
  neck: 'trunk_pct',
  shoulders: 'trunk_pct',
  chest: 'trunk_pct',
  l_bicep: 'left_arm_pct',
  r_bicep: 'right_arm_pct',
  l_forearm: 'left_arm_pct',
  r_forearm: 'right_arm_pct',
  hip: 'trunk_pct',
  waist: 'trunk_pct',
  l_quad: 'left_leg_pct',
  r_quad: 'right_leg_pct',
  l_calf: 'left_leg_pct',
  r_calf: 'right_leg_pct',
};

export interface UseFatChangeDataResult {
  data: RegionChangeData;
  hasAnyData: boolean;
  hasPreviousEntry: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY: Pick<UseFatChangeDataResult, 'data' | 'hasAnyData' | 'hasPreviousEntry'> = {
  data: {},
  hasAnyData: false,
  hasPreviousEntry: false,
};

function buildChangeMap(latest: FatRow, previous: FatRow | null): RegionChangeData {
  const out: RegionChangeData = {};
  for (const [regionId, segmentKey] of Object.entries(REGION_TO_SEGMENT)) {
    const current = latest[segmentKey] as number | null;
    const prev = previous ? (previous[segmentKey] as number | null) : null;
    const change =
      current !== null && prev !== null ? Number((current - prev).toFixed(2)) : null;
    const entry: RegionChange = {
      current,
      previous: prev,
      change,
      direction: getChangeDirection(change),
    };
    out[regionId] = entry;
  }
  return out;
}

export function useFatChangeData(userId: string | null): UseFatChangeDataResult {
  const [state, setState] = useState<Pick<UseFatChangeDataResult, 'data' | 'hasAnyData' | 'hasPreviousEntry'>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!userId) {
      setState(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const supabase = createClient();
        const { data: rows, error: dbErr } = await (supabase as never as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: FatRow[] | null; error: { message: string } | null }>;
                };
              };
            };
          };
        })
          .from('body_tracker_segmental_fat')
          .select('trunk_pct, left_arm_pct, right_arm_pct, left_leg_pct, right_leg_pct, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(2);

        if (cancelled) return;
        if (dbErr) throw new Error(dbErr.message);

        const list = rows ?? [];
        if (list.length === 0) {
          setState(EMPTY);
          setLoading(false);
          return;
        }

        const latest = list[0];
        const previous = list.length > 1 ? list[1] : null;

        setState({
          data: buildChangeMap(latest, previous),
          hasAnyData: true,
          hasPreviousEntry: previous !== null,
        });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load fat change data');
        setState(EMPTY);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return { ...state, loading, error, refresh };
}
