'use client';

// Prompt #85n: muscle-mass twin of useFatChangeData. Reads from
// body_tracker_segmental_muscle (lbs columns) and produces the same
// RegionChangeData shape so the same heat-map + callout components handle
// both metrics. The fat / muscle inversion (gain of muscle is good) lives
// in heatmap-colors.ts, not here, so this hook reports raw direction only.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getChangeDirection,
  type RegionChange,
  type RegionChangeData,
} from '@/lib/body-tracker/heatmap-colors';

interface MuscleRow {
  trunk_lbs: number | null;
  left_arm_lbs: number | null;
  right_arm_lbs: number | null;
  left_leg_lbs: number | null;
  right_leg_lbs: number | null;
  created_at: string;
}

const REGION_TO_SEGMENT: Record<string, keyof MuscleRow> = {
  neck: 'trunk_lbs',
  shoulders: 'trunk_lbs',
  chest: 'trunk_lbs',
  l_bicep: 'left_arm_lbs',
  r_bicep: 'right_arm_lbs',
  l_forearm: 'left_arm_lbs',
  r_forearm: 'right_arm_lbs',
  hip: 'trunk_lbs',
  waist: 'trunk_lbs',
  l_quad: 'left_leg_lbs',
  r_quad: 'right_leg_lbs',
  l_calf: 'left_leg_lbs',
  r_calf: 'right_leg_lbs',
};

export interface UseMuscleChangeDataResult {
  data: RegionChangeData;
  hasAnyData: boolean;
  hasPreviousEntry: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY: Pick<UseMuscleChangeDataResult, 'data' | 'hasAnyData' | 'hasPreviousEntry'> = {
  data: {},
  hasAnyData: false,
  hasPreviousEntry: false,
};

function buildChangeMap(latest: MuscleRow, previous: MuscleRow | null): RegionChangeData {
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

export function useMuscleChangeData(userId: string | null): UseMuscleChangeDataResult {
  const [state, setState] = useState<Pick<UseMuscleChangeDataResult, 'data' | 'hasAnyData' | 'hasPreviousEntry'>>(EMPTY);
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
                  limit: (n: number) => Promise<{ data: MuscleRow[] | null; error: { message: string } | null }>;
                };
              };
            };
          };
        })
          .from('body_tracker_segmental_muscle')
          .select('trunk_lbs, left_arm_lbs, right_arm_lbs, left_leg_lbs, right_leg_lbs, created_at')
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
        setError(e instanceof Error ? e.message : 'Failed to load muscle change data');
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
