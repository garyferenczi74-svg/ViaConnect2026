'use client';

import { Activity, Apple, Bed, Brain, Footprints, HeartPulse, Pill, Flame, Sparkles } from 'lucide-react';
import type { DashboardBioHistory, DashboardAdherence } from '@/hooks/useUserDashboardData';
import { DailyMetricGauge } from './DailyMetricGauge';
import { EngagementNudge } from './EngagementNudge';
import { topNudge } from '@/lib/scoring/engagementNudges';

interface DailyScoresGridProps {
  bioHistory: DashboardBioHistory[];
  adherence: DashboardAdherence[];
  currentStreak: number;
  /** Normalized 0-100 scores from Quick Daily Check Ins, keyed by gauge id. */
  checkinScores?: Record<string, number>;
}

const EXERCISE_TARGET_MIN = 60;
const STEP_TARGET = 10000;
const STREAK_TARGET_DAYS = 30;

const formatSteps = (steps: number): string => {
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
  return `${Math.round(steps)}`;
};

export function DailyScoresGrid({
  bioHistory,
  adherence,
  currentStreak,
  checkinScores = {},
}: DailyScoresGridProps) {
  // Latest breakdown from bio_optimization_history (wearable/cron data)
  const latest = bioHistory.length > 0 ? bioHistory[bioHistory.length - 1] : null;
  const bd = (latest?.breakdown ?? {}) as Record<string, number | undefined>;

  // pick: wearable/cron data wins when > 0, otherwise use check-in score
  const pick = (gauge: string, breakdownVal: number | undefined): number => {
    const bv = breakdownVal ?? 0;
    const cv = checkinScores[gauge] ?? 0;
    return bv > 0 ? bv : cv;
  };

  // ── Sleep ──────────────────────────────────────────────────
  const sleepScore = Math.round(pick('sleep', bd.sleep));

  // ── Exercise ───────────────────────────────────────────────
  const exerciseFromBd = (bd.exercise as number | undefined) ?? (bd.exercise_min as number | undefined) ?? 0;
  const exerciseScoreBd = exerciseFromBd > 0
    ? Math.min(100, Math.round((exerciseFromBd / EXERCISE_TARGET_MIN) * 100))
    : 0;
  const exerciseScore = exerciseScoreBd > 0 ? exerciseScoreBd : (checkinScores.exercise ?? 0);
  const exerciseDisplay = exerciseFromBd > 0
    ? `${Math.round(exerciseFromBd)}`
    : `${exerciseScore}`;

  // ── Steps ──────────────────────────────────────────────────
  const stepsFromBd = Math.round((bd.steps as number | undefined) ?? 0);
  const stepsScoreBd = stepsFromBd > 0
    ? Math.min(100, Math.round((stepsFromBd / STEP_TARGET) * 100))
    : 0;
  const stepsScore = stepsScoreBd > 0 ? stepsScoreBd : (checkinScores.steps ?? 0);

  // ── Stress (high score = bad; display inverted for gauge fill) ──
  // Check-in bridge stores stress as 0-100 where HIGH = GOOD (already
  // inverted by stressCheckinScore: low user stress → high score).
  // Breakdown stores raw 0-100 where HIGH = BAD (needs inversion).
  const stressBd = Math.round((bd.stress as number | undefined) ?? 0);
  const stressFromCheckin = checkinScores.stress ?? 0;
  // For gauge fill: higher = better (low stress = high fill)
  const stressGaugeFill = stressBd > 0 ? Math.max(0, 100 - stressBd) : stressFromCheckin;
  // For display value: show the "wellness" score (higher = better)
  const stressDisplay = stressGaugeFill;

  // ── Recovery ───────────────────────────────────────────────
  const recoveryScore = Math.round(pick('recovery', bd.recovery));

  // ── Streak ─────────────────────────────────────────────────
  const streakScore = Math.min(100, Math.round((currentStreak / STREAK_TARGET_DAYS) * 100));

  // ── Supplements ────────────────────────────────────────────
  const supplementScore = adherence.length > 0
    ? Math.round(
        adherence.reduce((sum, a) => sum + (a.adherence_percent || 0), 0) /
          adherence.length,
      )
    : 0;

  // ── Nutrition ──────────────────────────────────────────────
  const nutritionRaw = (bd.nutrition as number | undefined);
  const nutritionScore = Math.round(
    typeof nutritionRaw === 'number' && nutritionRaw > 0 ? nutritionRaw : supplementScore,
  );

  // ── Composite ──────────────────────────────────────────────
  const composite = Math.round(
    (sleepScore +
      exerciseScore +
      stepsScore +
      stressGaugeFill +
      recoveryScore +
      streakScore +
      supplementScore +
      nutritionScore) /
      8,
  );

  // ── Engagement nudge ──────────────────────────────────────
  const nudge = topNudge({
    snapshots: [
      { id: 'sleep', score: sleepScore },
      { id: 'exercise', score: exerciseScore },
      { id: 'steps', score: stepsScore },
      { id: 'stress', score: stressGaugeFill },
      { id: 'recovery', score: recoveryScore },
      { id: 'streak', score: streakScore },
      { id: 'supplements', score: supplementScore },
      { id: 'nutrition', score: nutritionScore },
    ],
    currentStreak,
    hourOfDay: new Date().getHours(),
  });

  return (
    <div className="space-y-4">
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60 backdrop-blur-md p-5 sm:p-6 md:p-7">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-15 blur-3xl"
        style={{ backgroundColor: '#2DA5A0' }}
      />

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
            Today&apos;s readiness across 8 core metrics
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-white/40">Composite</p>
            <p className="text-base font-bold text-[#2DA5A0]">{composite}/100</p>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DailyMetricGauge score={sleepScore} displayValue={`${sleepScore}`} displayUnit="/100" label="Sleep" icon={Bed} delay={0} />
        <DailyMetricGauge score={exerciseScore} displayValue={exerciseDisplay} displayUnit={exerciseFromBd > 0 ? 'min' : '/100'} label="Exercise" icon={Activity} delay={0.05} />
        <DailyMetricGauge score={stepsScore} displayValue={stepsFromBd > 0 ? formatSteps(stepsFromBd) : `${stepsScore}`} displayUnit={stepsFromBd > 0 ? 'steps' : '/100'} label="Steps" icon={Footprints} delay={0.1} />
        <DailyMetricGauge score={stressGaugeFill} displayValue={`${stressDisplay}`} displayUnit="/100" label="Stress" icon={Brain} delay={0.15} />
        <DailyMetricGauge score={recoveryScore} displayValue={`${recoveryScore}`} displayUnit="/100" label="Recovery" icon={HeartPulse} delay={0.2} />
        <DailyMetricGauge score={streakScore} displayValue={`${currentStreak}`} displayUnit={currentStreak === 1 ? 'day' : 'days'} label="Streak" icon={Flame} delay={0.25} />
        <DailyMetricGauge score={supplementScore} displayValue={`${supplementScore}`} displayUnit="%" label="Supplements" icon={Pill} delay={0.3} />
        <DailyMetricGauge score={nutritionScore} displayValue={`${nutritionScore}`} displayUnit="/100" label="Nutrition" icon={Apple} delay={0.35} />
      </div>
    </section>
    <EngagementNudge nudge={nudge} />
    </div>
  );
}
