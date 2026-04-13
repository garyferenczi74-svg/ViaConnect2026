'use client';

import { useEffect, useState } from 'react';
import { Activity, Apple, Bed, Brain, Footprints, HeartPulse, Pill, Flame, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DashboardBioHistory, DashboardAdherence } from '@/hooks/useUserDashboardData';
import { DailyMetricGauge } from './DailyMetricGauge';
import { EngagementNudge } from './EngagementNudge';
import { topNudge } from '@/lib/scoring/engagementNudges';

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
  // Fetch today's check-in scores from daily_score_inputs so manual
  // slider values populate the gauges even without wearable data.
  const [checkinScores, setCheckinScores] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];

        const { data } = await (supabase as any)
          .from('daily_score_inputs')
          .select('gauge_id, normalized_score')
          .eq('user_id', user.id)
          .eq('score_date', today);

        if (data && Array.isArray(data)) {
          const scores: Record<string, number> = {};
          for (const row of data) {
            const existing = scores[row.gauge_id];
            if (existing === undefined || row.normalized_score > existing) {
              scores[row.gauge_id] = row.normalized_score;
            }
          }
          setCheckinScores(scores);
        }
      } catch { /* table may not exist yet */ }
    })();

    // Re-fetch when check-in is submitted (custom event from DailyCheckIn)
    const refresh = () => {
      (async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const today = new Date().toISOString().split('T')[0];
          const { data } = await (supabase as any)
            .from('daily_score_inputs')
            .select('gauge_id, normalized_score')
            .eq('user_id', user.id)
            .eq('score_date', today);
          if (data && Array.isArray(data)) {
            const scores: Record<string, number> = {};
            for (const row of data) {
              const existing = scores[row.gauge_id];
              if (existing === undefined || row.normalized_score > existing) {
                scores[row.gauge_id] = row.normalized_score;
              }
            }
            setCheckinScores(scores);
          }
        } catch { /* ignore */ }
      })();
    };
    window.addEventListener('checkin-submitted', refresh);
    return () => window.removeEventListener('checkin-submitted', refresh);
  }, []);

  // Latest breakdown row (if any)
  const latest = bioHistory.length > 0 ? bioHistory[bioHistory.length - 1] : null;
  const breakdown = (latest?.breakdown ?? {}) as Record<string, number | undefined>;

  // Merge: check-in scores fill in when breakdown is 0 or missing.
  // Breakdown (wearable/cron) wins when it has a real value.
  const merged = (gauge: string, breakdownVal: number | undefined): number => {
    const bv = breakdownVal ?? 0;
    const cv = checkinScores[gauge] ?? 0;
    return bv > 0 ? bv : cv;
  };

  // Sleep — already 0–100 in breakdown when present
  const sleepScore = Math.round(merged('sleep', breakdown.sleep));

  // Exercise — breakdown stores raw minutes; check-in stores normalized 0-100
  const exerciseFromBreakdown = (breakdown.exercise as number | undefined) ?? (breakdown.exercise_min as number | undefined) ?? 0;
  const exerciseMin = Math.round(exerciseFromBreakdown);
  const exerciseScoreFromBreakdown = exerciseFromBreakdown > 0
    ? Math.min(100, Math.round((exerciseMin / EXERCISE_TARGET_MIN) * 100))
    : 0;
  const exerciseScore = exerciseScoreFromBreakdown > 0
    ? exerciseScoreFromBreakdown
    : (checkinScores.exercise ?? 0);

  // Steps — breakdown stores raw count; check-in stores normalized 0-100
  const stepsFromBreakdown = Math.round((breakdown.steps as number | undefined) ?? 0);
  const stepsScoreFromBreakdown = stepsFromBreakdown > 0
    ? Math.min(100, Math.round((stepsFromBreakdown / STEP_TARGET) * 100))
    : 0;
  const steps = stepsFromBreakdown;
  const stepsScore = stepsScoreFromBreakdown > 0
    ? stepsScoreFromBreakdown
    : (checkinScores.steps ?? 0);

  // Stress — breakdown stores raw 0-100 (lower=better); check-in stores
  // normalized 0-100 (higher=better, already inverted)
  const stressFromBreakdown = Math.round((breakdown.stress as number | undefined) ?? 0);
  const stressInverted = stressFromBreakdown > 0
    ? Math.max(0, 100 - stressFromBreakdown)
    : (checkinScores.stress ?? 0);
  const stressRaw = stressFromBreakdown > 0
    ? stressFromBreakdown
    : Math.max(0, 100 - (checkinScores.stress ?? 0));

  // Recovery — already 0–100
  const recoveryScore = Math.round(merged('recovery', breakdown.recovery));

  // Streak — display as days, normalize to target for gauge fill
  const streakScore = Math.min(100, Math.round((currentStreak / STREAK_TARGET_DAYS) * 100));

  // Supplements — average adherence across active supplements
  const supplementScore = adherence.length > 0
    ? Math.round(
        adherence.reduce((sum, a) => sum + (a.adherence_percent || 0), 0) /
          adherence.length,
      )
    : 0;

  // Nutrition — backend cron will populate breakdown.nutrition once the
  // server-side scoring formula (CAQ diet quality + supplement adherence +
  // gap coverage) is wired up. Until then, fall back to supplement adherence
  // as the only client-side signal so the gauge shows a meaningful value.
  const nutritionRaw = (breakdown.nutrition as number | undefined);
  const nutritionScore = Math.round(
    typeof nutritionRaw === 'number' ? nutritionRaw : supplementScore,
  );

  // Composite "personal wellness" snapshot — average of the 8 gauge fills
  const composite = Math.round(
    (sleepScore +
      exerciseScore +
      stepsScore +
      stressInverted +
      recoveryScore +
      streakScore +
      supplementScore +
      nutritionScore) /
      8,
  );

  // Highest-priority nudge for the EngagementNudge card under the grid.
  const nudge = topNudge({
    snapshots: [
      { id: 'sleep', score: sleepScore },
      { id: 'exercise', score: exerciseScore },
      { id: 'steps', score: stepsScore },
      { id: 'stress', score: stressInverted },
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
            Today&apos;s readiness across 8 core metrics
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

      {/* Gauge grid — 2×4 mobile, 4×2 tablet+ (8 gauges, no orphans) */}
      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        <DailyMetricGauge
          score={nutritionScore}
          displayValue={`${nutritionScore}`}
          displayUnit="/100"
          label="Nutrition"
          icon={Apple}
          delay={0.35}
        />
      </div>
    </section>
    <EngagementNudge nudge={nudge} />
    </div>
  );
}
