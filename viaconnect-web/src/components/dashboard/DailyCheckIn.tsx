'use client';

// Quick Daily Check Ins — Prompt #65 slider overhaul.
// All 5 cards use CheckInSlider. Exercise has toggle buttons + duration
// sliders that expand/collapse via AnimatePresence. Single upsert to
// daily_checkins (raw values) + daily_score_inputs (normalized 0-100).

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Battery,
  Bed,
  Check,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  Heart,
  Moon,
  Star,
  Timer,
  Zap,
} from 'lucide-react';
import { CheckInSlider } from './CheckInSlider';
import {
  mergeScoreSources,
  calculateDayScore,
  sleepCheckinScore,
  exerciseCheckinScore,
  activityCheckinScore,
  stressCheckinScore,
  energyCheckinScore,
  type CheckInRaw,
} from '@/lib/scoring/checkinScoreBridge';

// ── Label helpers ──────────────────────────────────────────
const sleepQualityLabel = (v: number) =>
  ['', 'Terrible', 'Poor', 'OK', 'Good', 'Great'][Math.round(v)] ?? 'OK';

const activityLabel = (v: number) =>
  ['', 'Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'][Math.round(v)] ?? 'Moderate';

const stressLabel = (v: number) =>
  ['', 'Very Low', 'Low', 'Moderate', 'High', 'Very High'][Math.round(v)] ?? 'Moderate';

const energyLabel = (v: number) =>
  ['', 'Exhausted', 'Low', 'Fair', 'Good', 'Excellent'][Math.round(v)] ?? 'Fair';

const minLabel = (v: number) => `${v} min`;

// ── Normalize to 0-100 for daily_score_inputs ──────────────
const normalize1to5 = (v: number) => Math.round(((v - 1) / 4) * 80 + 10); // 1→10, 5→90
const normalizeSleepHours = (h: number) => Math.round(Math.min(100, (h / 8) * 90 + 10));
const normalizeExercise = (
  cardio: boolean,
  cDur: number,
  resistance: boolean,
  rDur: number,
) => {
  const total = (cardio ? cDur : 0) + (resistance ? rDur : 0);
  if (total === 0) return 0;
  return Math.round(Math.min(100, (total / 60) * 75 + 25));
};

interface DailyCheckInProps {
  onScoresUpdate?: (scores: Record<string, number>) => void;
}

export function DailyCheckIn({ onScoresUpdate }: DailyCheckInProps = {}) {
  // ── State ────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sleep
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);

  // Exercise
  const [cardioActive, setCardioActive] = useState(false);
  const [resistanceActive, setResistanceActive] = useState(false);
  const [cardioDuration, setCardioDuration] = useState(30);
  const [resistanceDuration, setResistanceDuration] = useState(30);

  // Activity / Stress / Energy
  const [activityLevel, setActivityLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(2);
  const [energyLevel, setEnergyLevel] = useState(3);

  // ── Load today's saved values on mount ───────────────────
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];

        const { data } = await (supabase as any)
          .from('daily_checkins')
          .select('*')
          .eq('user_id', user.id)
          .eq('check_in_date', today)
          .maybeSingle();

        if (data) {
          if (data.sleep_hours != null) setSleepHours(data.sleep_hours);
          if (data.sleep_quality_score != null) setSleepQuality(data.sleep_quality_score);
          if (data.cardio_active != null) setCardioActive(data.cardio_active);
          if (data.cardio_duration_min != null) setCardioDuration(data.cardio_duration_min);
          if (data.resistance_active != null) setResistanceActive(data.resistance_active);
          if (data.resistance_duration_min != null) setResistanceDuration(data.resistance_duration_min);
          if (data.activity_level_score != null) setActivityLevel(data.activity_level_score);
          if (data.stress_level_score != null) setStressLevel(data.stress_level_score);
          if (data.energy_recovery_score != null) setEnergyLevel(data.energy_recovery_score);
          setSubmitted(true);
          setCollapsed(true);
        }
      } catch {
        /* table may not exist yet */
      }
    })();
  }, []);

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];

      // 0. Compute gauge scores and dispatch to DailyScoresGrid FIRST
      //    (before any DB writes that might fail if tables don't exist)
      const gaugeRows = [
        { gauge_id: 'sleep', normalized_score: sleepCheckinScore(sleepHours, sleepQuality) },
        { gauge_id: 'exercise', normalized_score: exerciseCheckinScore(cardioActive, cardioDuration, resistanceActive, resistanceDuration) },
        { gauge_id: 'steps', normalized_score: activityCheckinScore(activityLevel) },
        { gauge_id: 'stress', normalized_score: stressCheckinScore(stressLevel) },
        { gauge_id: 'recovery', normalized_score: energyCheckinScore(energyLevel) },
      ];
      const scoreMap: Record<string, number> = {};
      for (const r of gaugeRows) scoreMap[r.gauge_id] = r.normalized_score;
      setSubmitted(true);

      // Update gauges via direct callback (most reliable) + event (backup)
      onScoresUpdate?.(scoreMap);
      try { window.dispatchEvent(new CustomEvent('checkin-submitted', { detail: scoreMap })); } catch {}

      // Persist to localStorage for page reload survival
      try {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('vc_checkin_scores', JSON.stringify({ date: today, scores: scoreMap }));
      } catch {}

      // 1. Upsert raw slider values to daily_checkins
      await (supabase as any).from('daily_checkins').upsert(
        {
          user_id: user.id,
          check_in_date: today,
          sleep_hours: sleepHours,
          sleep_quality_score: sleepQuality,
          cardio_active: cardioActive,
          cardio_duration_min: cardioActive ? cardioDuration : null,
          resistance_active: resistanceActive,
          resistance_duration_min: resistanceActive ? resistanceDuration : null,
          activity_level_score: activityLevel,
          stress_level_score: stressLevel,
          energy_recovery_score: energyLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,check_in_date' },
      );

      // 2. Upsert normalized 0-100 scores to daily_score_inputs (for gauges)
      const dbGaugeRows = gaugeRows.map((r) => ({
        user_id: user.id,
        gauge_id: r.gauge_id,
        source_id: 'manual_checkin',
        tier: 4,
        raw_value: r.normalized_score,
        normalized_score: r.normalized_score,
        confidence: 0.6,
        score_date: today,
      }));

      await (supabase as any)
        .from('daily_score_inputs')
        .upsert(dbGaugeRows, { onConflict: 'user_id,gauge_id,source_id,score_date' });

      // 3. Recalculate merged day score via check-in bridge (Prompt #66)
      const checkinRaw: CheckInRaw = {
        sleep_hours: sleepHours,
        sleep_quality_score: sleepQuality,
        cardio_active: cardioActive,
        cardio_duration_min: cardioActive ? cardioDuration : null,
        resistance_active: resistanceActive,
        resistance_duration_min: resistanceActive ? resistanceDuration : null,
        activity_level_score: activityLevel,
        stress_level_score: stressLevel,
        energy_recovery_score: energyLevel,
      };
      // No wearable fetch for now (wearable bridge deferred); pass empty
      const merged = mergeScoreSources({}, checkinRaw);
      const dayScore = calculateDayScore(merged);

      await (supabase as any)
        .from('daily_checkins')
        .update({
          day_score: dayScore,
          sleep_source: merged.sleepSource,
          activity_source: merged.activitySource,
          stress_source: merged.stressSource,
          recovery_source: merged.recoverySource,
          score_calculated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('check_in_date', today);

      // (submitted + dispatched above, before DB writes)
    } catch {
      /* table may not exist yet */
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    sleepHours,
    sleepQuality,
    cardioActive,
    cardioDuration,
    resistanceActive,
    resistanceDuration,
    activityLevel,
    stressLevel,
    energyLevel,
  ]);

  // ── Collapsed summary state ──────────────────────────────
  if (submitted && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-3"
      >
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span className="text-xs font-medium text-white/60">
            Quick Daily Check Ins complete
          </span>
        </div>
        <span className="text-xs text-[#2DA5A0]">+15 pts</span>
      </button>
    );
  }

  // ── Full form ────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Quick Daily Check Ins</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#2DA5A0]">+15 pts</span>
          <ChevronDown
            className={`h-4 w-4 text-white/40 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            strokeWidth={1.5}
          />
        </div>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-5">
              {/* ── Card 1: Sleep ──────────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  How did you sleep?
                </p>
                <CheckInSlider
                  id="sleep-hours"
                  title="Hours slept"
                  icon={<Moon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />}
                  min={0}
                  max={12}
                  step={0.5}
                  value={sleepHours}
                  onChange={setSleepHours}
                  formatLabel={(v) => `${v.toFixed(1)} h`}
                  leftLabel="0"
                  rightLabel="12h"
                />
                <CheckInSlider
                  id="sleep-quality"
                  title="Sleep quality"
                  icon={<Star className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />}
                  min={1}
                  max={5}
                  step={1}
                  value={sleepQuality}
                  onChange={setSleepQuality}
                  formatLabel={sleepQualityLabel}
                  leftLabel="Terrible"
                  rightLabel="Great"
                />
              </div>

              {/* ── Card 2: Exercise ───────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Exercise today?
                </p>
                <div className="mb-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCardioActive((p) => !p)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                      cardioActive
                        ? 'border-[#2DA5A0] bg-[#2DA5A0]/20 text-[#2DA5A0]'
                        : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/30'
                    }`}
                  >
                    <Heart className="h-4 w-4" strokeWidth={1.5} />
                    Cardio
                  </button>
                  <button
                    type="button"
                    onClick={() => setResistanceActive((p) => !p)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                      resistanceActive
                        ? 'border-[#B75E18] bg-[#B75E18]/20 text-[#B75E18]'
                        : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/30'
                    }`}
                  >
                    <Dumbbell className="h-4 w-4" strokeWidth={1.5} />
                    Resistance
                  </button>
                </div>

                {cardioActive && (
                  <div className="pt-1">
                    <CheckInSlider
                      id="cardio-duration"
                      title="Cardio duration"
                      icon={<Timer className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />}
                      min={5}
                      max={120}
                      step={5}
                      value={cardioDuration}
                      onChange={setCardioDuration}
                      formatLabel={minLabel}
                      leftLabel="5m"
                      rightLabel="2h"
                      accentColor="#2DA5A0"
                    />
                  </div>
                )}

                {resistanceActive && (
                  <div className="pt-1">
                    <CheckInSlider
                      id="resistance-duration"
                      title="Resistance duration"
                      icon={<Timer className="h-4 w-4 text-[#B75E18]" strokeWidth={1.5} />}
                      min={5}
                      max={120}
                      step={5}
                      value={resistanceDuration}
                      onChange={setResistanceDuration}
                      formatLabel={minLabel}
                      leftLabel="5m"
                      rightLabel="2h"
                      accentColor="#B75E18"
                    />
                  </div>
                )}
              </div>

              {/* ── Card 3: Activity ───────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  How active were you?
                </p>
                <CheckInSlider
                  id="activity-level"
                  title="Activity level"
                  icon={<Activity className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />}
                  min={1}
                  max={5}
                  step={1}
                  value={activityLevel}
                  onChange={setActivityLevel}
                  formatLabel={activityLabel}
                  leftLabel="Sedentary"
                  rightLabel="Very Active"
                />
              </div>

              {/* ── Card 4: Stress ─────────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Stress level?
                </p>
                <CheckInSlider
                  id="stress-level"
                  title="Stress level"
                  icon={<Zap className="h-4 w-4 text-[#B75E18]" strokeWidth={1.5} />}
                  min={1}
                  max={5}
                  step={1}
                  value={stressLevel}
                  onChange={setStressLevel}
                  formatLabel={stressLabel}
                  leftLabel="Very Low"
                  rightLabel="Very High"
                  accentColor="#B75E18"
                />
              </div>

              {/* ── Card 5: Energy ─────────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Energy & recovery?
                </p>
                <CheckInSlider
                  id="energy-recovery"
                  title="Energy & recovery"
                  icon={<Battery className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />}
                  min={1}
                  max={5}
                  step={1}
                  value={energyLevel}
                  onChange={setEnergyLevel}
                  formatLabel={energyLabel}
                  leftLabel="Exhausted"
                  rightLabel="Excellent"
                />
              </div>

              {/* ── Submit / Success ────────────────────────── */}
              {!submitted && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-2 w-full min-h-[44px] rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 text-sm font-medium text-[#2DA5A0] transition-all hover:bg-[#2DA5A0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? 'Saving...' : 'Submit Check-In'}
                </button>
              )}

              {submitted && (
                <div className="flex items-center gap-2 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/10 p-3">
                  <Check className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                  <span className="text-xs text-[#22C55E]">
                    Check-in saved! +15 Helix Points
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
