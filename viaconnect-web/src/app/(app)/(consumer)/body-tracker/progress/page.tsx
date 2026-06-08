'use client';

// Prompt 179 + 179b: the Body Tracker "Progress" surface, reached from the My
// Biology hub (Prompt 180). Replaces the 180b coming-soon placeholder with the
// full six-section trajectory + targets view (Trajectory Planner, Trajectory
// Chart, Daily Targets, Adaptive Recalibration, Adherence, Safety). Data model
// and API keep the body_goals namespace; only the surface is named Progress.
// The My Biology hub card already routes here, so no hub config change is needed.
//
// IMPORTANT: this is a client component. Never add `export const metadata` here.
// Next.js forbids a metadata export under "use client" and it fails the
// production build; the 180b placeholder hit exactly that. (Rebuilt 2026-06-08
// to force a clean Vercel compile and clear a stale placeholder build cache.)

import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import { useActiveGoal } from '@/components/body-tracker/progress/useActiveGoal';
import { TrajectoryPlanner } from '@/components/body-tracker/progress/TrajectoryPlanner';
import { TrajectoryChart } from '@/components/body-tracker/progress/TrajectoryChart';
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

  return (
    <div aria-label="Progress">
      <BackToHubLink />
      <header className="mb-5">
        <h1 className="text-lg font-semibold text-white md:text-xl">Progress</h1>
        <p className="text-xs text-white/50">
          Your weight trajectory and the daily targets Gordon sets to keep it on pace.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-8 text-center text-sm text-white/40">
          Loading your progress...
        </div>
      ) : (
        <div className="space-y-5">
          <TrajectoryPlanner existing={goal} prefillWeightLb={prefillWeightLb} onSaved={refetch} />

          {goal && trajectory ? (
            <>
              <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-5 backdrop-blur-sm">
                <h2 className="mb-3 text-sm font-semibold text-white">Trajectory</h2>
                <TrajectoryChart
                  actual={trajectory.actual}
                  startWeightLb={trajectory.startWeightLb}
                  startDate={trajectory.startDate}
                  goalWeightLb={trajectory.goalWeightLb}
                  projectedDate={trajectory.projectedDate}
                />
              </section>

              <DailyTargetsPanel target={target} />

              <AdaptiveRecalibrationPanel
                goalId={goal.id}
                latestTarget={target}
                recalibrations={data?.recalibrations ?? []}
                onChange={refetch}
              />

              <Adherence adherence={data?.adherence ?? null} target={target} projectedDate={data?.projectedDate ?? null} />
            </>
          ) : null}

          <SafetyDisclaimer />
        </div>
      )}
    </div>
  );
}
