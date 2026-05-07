'use client';

import { Flame, Target, Zap, Info } from 'lucide-react';
import type { ActivitySnapshot } from '@/hooks/body-tracker/useUserActivityData';

interface ActivityPerformanceCardProps {
  data: ActivitySnapshot | null;
  loading?: boolean;
}

function formatCalories(value: number | null): string {
  if (value === null || value === undefined) return '·';
  return value.toLocaleString();
}

export function ActivityPerformanceCard({ data, loading = false }: ActivityPerformanceCardProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B75E18]/15">
          <Flame size={16} strokeWidth={1.5} className="text-[#B75E18]" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">Activity Performance</h3>
          <p className="text-xs text-white/50">Active calories versus your daily target</p>
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-white/40">
          Loading activity data
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-white/55">
          No activity logged yet. Connect a wearable or log calories from the Body Tracker entry form
          to see your daily Active Calories, target, and BMR here.
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-white/40">Active Calories</p>
            <p className="mt-1 flex items-baseline gap-2 text-3xl font-bold text-white">
              {formatCalories(data.activeCalories)}
              <span className="text-sm text-white/40">kcal</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
                <Target size={12} strokeWidth={1.5} /> Target
              </div>
              <p className="text-base font-semibold text-white">
                {formatCalories(data.targetCalories)}{' '}
                <span className="text-xs text-white/40">kcal</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
                <Zap size={12} strokeWidth={1.5} /> BMR
              </div>
              <p className="text-base font-semibold text-white">
                {formatCalories(data.bmrCalories)}{' '}
                <span className="text-xs text-white/40">kcal</span>
              </p>
            </div>
          </div>

          {typeof data.cohortPercentile === 'number' && (
            <p className="mt-3 text-xs text-white/55">
              Top {Math.max(0, Math.min(100, 100 - data.cohortPercentile))} percent in your age and gender bracket.
            </p>
          )}

          {data.cohortPercentile === null && (
            <div className="mt-3 flex items-start gap-1.5 text-xs text-white/40">
              <Info size={12} strokeWidth={1.5} className="mt-0.5 flex-none" />
              <span>Cohort comparison available once we have enough peer data; in the meantime, your daily numbers are tracked above.</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
