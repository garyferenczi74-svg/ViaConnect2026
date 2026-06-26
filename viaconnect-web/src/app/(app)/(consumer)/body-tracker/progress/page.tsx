'use client';

// Prompt 179 + 179b: the Body Tracker "Progress" tab. Renders the six sections
// top to bottom (Trajectory Planner, Trajectory Chart, Daily Targets, Adaptive
// Recalibration, Adherence, Safety) responsively. Data model + API keep the
// body_goals namespace; only the surface is named Progress.

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
    <main aria-label="Progress" className="mx-auto w-full max-w-4xl px-4 py-5 md:px-6">
      <BackToHubLink />
      <header className="mb-5">
        <h1 className="text-lg font-semibold text-white">Progress</h1>
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
    </main>
  );
}
