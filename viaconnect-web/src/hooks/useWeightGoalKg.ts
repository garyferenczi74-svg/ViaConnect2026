'use client';

// =============================================================================
// Prompt 173 Phase 7 (rebuild on main 2026-06-03): canonical weight goal read.
//
// Body Tracker (Arnold) reads the goal weight from public.user_weight_goals
// via the Phase 2 accessor, NOT from its own body_tracker_weight.goal_weight_
// lbs column. This hook is the single client-side read path so the WeightChart
// reference line + the rate-capped timeline projection both share one source.
//
// Returns { goalWeightKg, goalDirection, currentWeightKg, loading, refetch }.
// All values are null when the user has never set a goal (the WeightChart
// then renders without a reference line; the timeline card hides itself).
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { readWeightGoal, type GoalDirection } from '@/lib/weight-goals/accessor';

export interface UseWeightGoalKgResult {
  readonly goalWeightKg: number | null;
  readonly goalDirection: GoalDirection | null;
  readonly currentWeightKg: number | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refetch: () => Promise<void>;
}

export function useWeightGoalKg(
  userId: string | null | undefined,
): UseWeightGoalKgResult {
  const [goalWeightKg, setGoalWeightKg] = useState<number | null>(null);
  const [goalDirection, setGoalDirection] = useState<GoalDirection | null>(null);
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setGoalWeightKg(null);
      setGoalDirection(null);
      setCurrentWeightKg(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const goal = await readWeightGoal(userId, supabase);
      setGoalWeightKg(goal?.goalWeightKg ?? null);
      setGoalDirection(goal?.goalDirection ?? null);
      setCurrentWeightKg(goal?.currentWeightKg ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
      setGoalWeightKg(null);
      setGoalDirection(null);
      setCurrentWeightKg(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { goalWeightKg, goalDirection, currentWeightKg, loading, error, refetch };
}

export default useWeightGoalKg;
