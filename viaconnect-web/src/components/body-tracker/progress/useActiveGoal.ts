'use client';

// Prompt 179: client hook for the Progress tab. Reads GET /api/body/goals/active
// (session-authed) and exposes typed views so the page + panels avoid `any`.

import { useCallback, useEffect, useState } from 'react';

export interface GoalView {
  id: string;
  goal_weight_lb: number;
  start_weight_lb: number;
  driver: 'rate' | 'date';
  target_date: string | null;
  target_rate_lb_per_week: number | null;
  goal_bodyfat_pct: number | null;
  start_date: string;
}

export interface TargetView {
  id: string;
  calorie_target_kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  fiber_g: number;
  added_sugar_limit_g: number | null;
  hydration_ml: number | null;
  estimated_tdee_kcal: number | null;
  source: string;
}

export interface RecalView {
  window_start: string;
  window_end: string;
  avg_logged_kcal: number;
  estimated_tdee_kcal: number | null;
  prev_calorie_target: number | null;
  new_calorie_target: number | null;
  created_at: string;
}

export interface TrajectoryView {
  actual: Array<{ date: string; smoothedLb: number; rawLb: number }>;
  startWeightLb: number;
  startDate: string;
  goalWeightLb: number;
  latestSmoothedLb: number;
  projectedDate: string | null;
}

export interface AdherenceView {
  daysLogged: number;
  avgKcal: number;
  windowDays: number;
  adherencePct: number;
  latestWeightLb: number;
}

export interface ActiveGoalData {
  ok: boolean;
  goal: GoalView | null;
  latestWeightLb?: number | null;
  // Prompt 201d: present only when there is no active goal, so the planner can
  // prefill the goal weight from the CAQ Weight Goals step for new-goal members.
  caqGoalWeightLb?: number | null;
  latestTarget?: TargetView | null;
  recalibrations?: RecalView[];
  trajectory?: TrajectoryView | null;
  adherence?: AdherenceView | null;
  projectedDate?: string | null;
}

export interface UseActiveGoalResult {
  data: ActiveGoalData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useActiveGoal(): UseActiveGoalResult {
  const [data, setData] = useState<ActiveGoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/body/goals/active', { method: 'GET' });
      if (!res.ok) throw new Error(`active goal fetch failed: ${res.status}`);
      setData((await res.json()) as ActiveGoalData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
