'use client';

// DailyScoresGrid — replaces the carousel with a row of 7 circular gauges
// (Sleep, Exercise min, Steps, Stress, Recovery, Streak, Supplements). Each
// gauge is a smaller sibling of the BioOptimizationGauge so the dashboard
// reads as one cohesive scoring system.

import { Activity, Bed, Brain, Footprints, HeartPulse, Pill, Flame, Sparkles } from 'lucide-react';
import type { DashboardBioHistory, DashboardAdherence } from '@/hooks/useUserDashboardData';
import { DailyMetricGauge } from './DailyMetricGauge';

interface DailyScoresGridProps {
  bioHistory: DashboardBioHistory[];
  adherence: DashboardAdherence[];
  currentStreak: number;
}

// Targets used to normalize raw values onto a 0–100 scale for the gauge fill.
const STEP_TARGET = 10000;
const EXERCISE_TARGET_MIN = 60;
const STREAK_TARGET_DAYS = 30;

const formatSteps = (steps: number): string => {
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
  return `${Math.round(steps)}`;
};

export function DailyScoresGrid({
  bioHistory,
  adherence,
  currentStreak,
}: DailyScoresGridProps) {
  // Latest breakdown row (if any)
  const latest = bioHistory.length > 0 ? bioHistory[bioHistory.length - 1] : null;
  const breakdown = (latest?.breakdown ?? {}) as Record<string, number | undefined>;

  // Sleep — already 0–100 in breakdown when present
  const sleepScore = Math.round(breakdown.sleep ?? 0);

  // Exercise minutes — raw minutes, normalize to target for gauge fill
  const exerciseMin = Math.round((breakdown.exercise as number | undefined) ?? breakdown.exercise_min ?? 0);
  const exerciseScore = Math.min(100, Math.round((exerciseMin / EXERCISE_TARGET_MIN) * 100));

  // Steps — raw count, normalize to target
  const steps = Math.round((breakdown.steps as number | undefined) ?? 0);
  const stepsScore = Math.min(100, Math.round((steps / STEP_TARGET) * 100));

  // Stress — stored as 0–100 (lower = better). Display the raw score, color
  // by inverted value so high stress = warning.
  const stressRaw = Math.round((breakdown.stress as number | undefined) ?? 0);
  const stressInverted = Math.max(0, 100 - stressRaw);

  // Recovery — already 0–100
  const recoveryScore = Math.round(breakdown.recovery ?? 0);

  // Streak — display as days, normalize to target for gauge fill
  const streakScore = Math.min(100, Math.round((currentStreak / STREAK_TARGET_DAYS) * 100));

  // Supplements — average adherence across active supplements
  const supplementScore = adherence.length > 0
    ? Math.round(
        adherence.reduce((sum, a) => sum + (a.adherence_percent || 0), 0) /
          adherence.length,
      )
    : 0;

  // Composite "personal wellness" snapshot — average of the 7 gauge fills
  const composite = Math.round(
    (sleepScore +
      exerciseScore +
      stepsScore +
      stressInverted +
      recoveryScore +
      streakScore +
      supplementScore) /
      7,
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60 backdrop-blur-md p-5 sm:p-6 md:p-7">
      {/* Soft glow background */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-15 blur-3xl"
        style={{ backgroundColor: '#2DA5A0' }}
      />

      {/* Header */}
      <div className="relative mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2DA5A0]">
              Personal Wellness Dashboard
            </p>
          </div>
          <h2 className="text-lg font-bold text-white sm:text-xl">Daily Scores</h2>
          <p className="mt-0.5 text-xs text-white/40">
            Today&apos;s readiness across 7 core metrics
          </p>
        </div>

        {/* Composite score badge */}
        <div className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-white/40">Composite</p>
            <p className="text-base font-bold text-[#2DA5A0]">{composite}/100</p>
          </div>
        </div>
      </div>

      {/* Gauge grid */}
      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <DailyMetricGauge
          score={sleepScore}
          displayValue={`${sleepScore}`}
          displayUnit="/100"
          label="Sleep"
          icon={Bed}
          delay={0}
        />
        <DailyMetricGauge
          score={exerciseScore}
          displayValue={`${exerciseMin}`}
          displayUnit="min"
          label="Exercise"
          icon={Activity}
          delay={0.05}
        />
        <DailyMetricGauge
          score={stepsScore}
          displayValue={formatSteps(steps)}
          displayUnit="steps"
          label="Steps"
          icon={Footprints}
          delay={0.1}
        />
        <DailyMetricGauge
          score={stressInverted}
          displayValue={`${stressRaw}`}
          displayUnit="/100"
          label="Stress"
          icon={Brain}
          delay={0.15}
        />
        <DailyMetricGauge
          score={recoveryScore}
          displayValue={`${recoveryScore}`}
          displayUnit="/100"
          label="Recovery"
          icon={HeartPulse}
          delay={0.2}
        />
        <DailyMetricGauge
          score={streakScore}
          displayValue={`${currentStreak}`}
          displayUnit={currentStreak === 1 ? 'day' : 'days'}
          label="Streak"
          icon={Flame}
          delay={0.25}
        />
        <DailyMetricGauge
          score={supplementScore}
          displayValue={`${supplementScore}`}
          displayUnit="%"
          label="Supplements"
          icon={Pill}
          delay={0.3}
        />
      </div>
    </section>
  );
}
