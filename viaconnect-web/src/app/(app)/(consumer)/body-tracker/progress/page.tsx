'use client';

// Prompt 179 + 179b: the Body Tracker "Progress" surface, reached from the My
// Biology hub (Prompt 180). Prompt 201 (2026-06-15): recomposed into the
// instrument-panel bento that matches the My Biology and My Nutrition hubs,
// using the ProgressCard shell over the shared primitives (hub-card-frame edge,
// CardMedia seam, PlasmaGauge). Presentation only: the goal engine, its routes,
// and the active-goal read are unchanged.
//
// IMPORTANT: this is a client component. Never add `export const metadata` here.
// Next.js forbids a metadata export under "use client" and it fails the
// production build; the 180b placeholder hit exactly that.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getDisplayName } from '@/lib/getDisplayName';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import { useActiveGoal } from '@/components/body-tracker/progress/useActiveGoal';
import { TrajectoryPlanner } from '@/components/body-tracker/progress/TrajectoryPlanner';
import { TrajectoryChart } from '@/components/body-tracker/progress/TrajectoryChart';
import { ProgressToGoalCard } from '@/components/body-tracker/progress/ProgressToGoalCard';
import { DailyTargetsPanel } from '@/components/body-tracker/progress/DailyTargetsPanel';
import { AdaptiveRecalibrationPanel } from '@/components/body-tracker/progress/AdaptiveRecalibrationPanel';
import { Adherence } from '@/components/body-tracker/progress/Adherence';
import { SafetyDisclaimer } from '@/components/body-tracker/progress/SafetyDisclaimer';

export default function ProgressPage() {
  const { data, loading, refetch } = useActiveGoal();
  const goal = data?.goal ?? null;
  const target = data?.latestTarget ?? null;
  const trajectory = data?.trajectory ?? null;
  const prefillWeightLb = data?.latestWeightLb ?? trajectory?.latestSmoothedLb ?? null;
  const currentLb = trajectory?.latestSmoothedLb ?? data?.latestWeightLb ?? null;

  // Resolve the signed-in user once for the Daily Targets today-vs-target rings,
  // the same pattern the hubs use. The page itself never writes through this.
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: u }) => setUserId(u.user?.id ?? null));
  }, []);

  return (
    <div aria-label="Goals and Progress">
      <BackToHubLink />
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2DA5A0]">My Biology</p>
        <h1 className="mt-1 text-lg font-semibold text-white md:text-2xl">Goals and Progress</h1>
        <p className="mt-1 text-xs text-white/55 md:text-sm">
          Your weight trajectory and the daily targets Gordon sets to keep it on pace.
        </p>
        <p className="mt-1 text-[11px] text-white/40">
          guided by {getDisplayName('arnold')} and {getDisplayName('gordon')}
        </p>
      </header>

      {loading && !data ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-8 text-center text-sm text-white/40">
          Loading your progress...
        </div>
      ) : (
        <div className="space-y-5">
          {/* Band 1: Trajectory Planner + Progress to Goal. On mobile the gauge
              sits first so the member sees the motivational metric, then the
              controls. */}
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="order-1 lg:order-2 lg:col-span-5">
              <ProgressToGoalCard
                startLb={goal?.start_weight_lb}
                currentLb={currentLb}
                goalLb={goal?.goal_weight_lb}
              />
            </div>
            <div className="order-2 lg:order-1 lg:col-span-7">
              <TrajectoryPlanner
                existing={goal}
                prefillWeightLb={prefillWeightLb}
                caqGoalWeightLb={data?.caqGoalWeightLb ?? null}
                onSaved={refetch}
              />
            </div>
          </div>

          {goal && trajectory ? (
            <>
              {/* Band 2: Trajectory chart hero, full width. */}
              <TrajectoryChart
                actual={trajectory.actual}
                startWeightLb={trajectory.startWeightLb}
                startDate={trajectory.startDate}
                goalWeightLb={trajectory.goalWeightLb}
                projectedDate={trajectory.projectedDate}
                targetDate={goal.target_date}
              />

              {/* Band 3: Daily Targets instrument grid. */}
              <DailyTargetsPanel target={target} userId={userId} />

              {/* Band 4: Adaptive Recalibration + Adherence. */}
              <div className="grid gap-5 lg:grid-cols-2">
                <AdaptiveRecalibrationPanel
                  goalId={goal.id}
                  latestTarget={target}
                  recalibrations={data?.recalibrations ?? []}
                  onChange={refetch}
                />
                <Adherence
                  adherence={data?.adherence ?? null}
                  target={target}
                  projectedDate={data?.projectedDate ?? null}
                />
              </div>
            </>
          ) : null}

          {/* Band 5: Safety, low-emphasis footnote. */}
          <SafetyDisclaimer />
        </div>
      )}
    </div>
  );
}
