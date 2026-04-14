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
import { CheckInSubmitButton } from './CheckInSubmitButton';
import { useCheckinCard } from '@/hooks/useCheckinCard';
import { useMidnightReset } from '@/hooks/useMidnightReset';
import { detectTimezone, localDateString, syncTimezone } from '@/lib/timezone';
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
  onScoresUpdate?: (rawState: Record<string, any>) => void;
  onSliderChange?: (state: Record<string, any>) => void;
}

export function DailyCheckIn({ onScoresUpdate, onSliderChange }: DailyCheckInProps = {}) {
  // ── Core state ──────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [timezone] = useState(() => detectTimezone());
  const [checkInDate, setCheckInDate] = useState(() => localDateString(detectTimezone()));
  const [todayCheckin, setTodayCheckin] = useState<Record<string, any> | null>(null);

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

  // Dispatch raw slider state so DailyScoresPanel can run V2 scoring engine
  const dispatchScores = useCallback(() => {
    const rawState: Record<string, any> = {
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
    onScoresUpdate?.(rawState);
    try { window.dispatchEvent(new CustomEvent('checkin-submitted', { detail: rawState })); } catch {}
  }, [sleepHours, sleepQuality, cardioActive, cardioDuration, resistanceActive, resistanceDuration, activityLevel, stressLevel, energyLevel, onScoresUpdate]);

  // ── Per-card submit hooks ───────────────────────────────
  const sleepCard = useCheckinCard({
    userId: userId ?? '', timezone, checkInDate,
    submitFlagColumn: 'sleep_allSubmitted_at',
    initialSubmittedAt: todayCheckin?.sleep_allSubmitted_at,
    buildPayload: () => ({ sleep_hours: sleepHours, sleep_quality_score: sleepQuality }),
    onSaved: dispatchScores,
  });

  const exerciseCard = useCheckinCard({
    userId: userId ?? '', timezone, checkInDate,
    submitFlagColumn: 'exercise_allSubmitted_at',
    initialSubmittedAt: todayCheckin?.exercise_allSubmitted_at,
    buildPayload: () => ({
      cardio_active: cardioActive,
      cardio_duration_min: cardioActive ? cardioDuration : null,
      resistance_active: resistanceActive,
      resistance_duration_min: resistanceActive ? resistanceDuration : null,
    }),
    onSaved: dispatchScores,
  });

  const activityCard = useCheckinCard({
    userId: userId ?? '', timezone, checkInDate,
    submitFlagColumn: 'activity_allSubmitted_at',
    initialSubmittedAt: todayCheckin?.activity_allSubmitted_at,
    buildPayload: () => ({ activity_level_score: activityLevel }),
    onSaved: dispatchScores,
  });

  const stressCard = useCheckinCard({
    userId: userId ?? '', timezone, checkInDate,
    submitFlagColumn: 'stress_allSubmitted_at',
    initialSubmittedAt: todayCheckin?.stress_allSubmitted_at,
    buildPayload: () => ({ stress_level_score: stressLevel }),
    onSaved: dispatchScores,
  });

  const energyCard = useCheckinCard({
    userId: userId ?? '', timezone, checkInDate,
    submitFlagColumn: 'energy_allSubmitted_at',
    initialSubmittedAt: todayCheckin?.energy_allSubmitted_at,
    buildPayload: () => ({ energy_recovery_score: energyLevel }),
    onSaved: dispatchScores,
  });

  const allSubmitted = sleepCard.isSubmitted && exerciseCard.isSubmitted && activityCard.isSubmitted && stressCard.isSubmitted && energyCard.isSubmitted;

  // ── Midnight auto-reset ─────────────────────────────────
  // Fires at local midnight. Clears slider values, rolls the check-in
  // date, nulls out todayCheckin (which cascades into each card hook
  // via the initialSubmittedAt sync), and re-opens the form.
  useMidnightReset(timezone, useCallback(() => {
    setSleepHours(7); setSleepQuality(3);
    setCardioActive(false); setResistanceActive(false);
    setCardioDuration(30); setResistanceDuration(30);
    setActivityLevel(3); setStressLevel(2); setEnergyLevel(3);
    setCheckInDate(localDateString(timezone));
    setTodayCheckin(null);
    setCollapsed(true);
  }, [timezone]));

  // ── Emit live preview on every slider change ─────────────
  useEffect(() => {
    if (allSubmitted || collapsed) return;
    onSliderChange?.({
      sleepHours: sleepHours,
      sleepQuality: sleepQuality,
      cardioActive, cardioDuration,
      resistanceActive, resistanceDuration,
      activityLevel, stressLevel, energyLevel,
    });
  }, [sleepHours, sleepQuality, cardioActive, cardioDuration, resistanceActive, resistanceDuration, activityLevel, stressLevel, energyLevel, allSubmitted, collapsed, onSliderChange]);

  // ── Load today's saved values on mount ───────────────────
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        syncTimezone(supabase, user.id);

        const { data } = await (supabase as any)
          .from('daily_checkins')
          .select('*')
          .eq('user_id', user.id)
          .eq('check_in_date', checkInDate)
          .maybeSingle();

        if (data) {
          setTodayCheckin(data);
          if (data.sleep_hours != null) setSleepHours(data.sleep_hours);
          if (data.sleep_quality_score != null) setSleepQuality(data.sleep_quality_score);
          if (data.cardio_active != null) setCardioActive(data.cardio_active);
          if (data.cardio_duration_min != null) setCardioDuration(data.cardio_duration_min);
          if (data.resistance_active != null) setResistanceActive(data.resistance_active);
          if (data.resistance_duration_min != null) setResistanceDuration(data.resistance_duration_min);
          if (data.activity_level_score != null) setActivityLevel(data.activity_level_score);
          if (data.stress_level_score != null) setStressLevel(data.stress_level_score);
          if (data.energy_recovery_score != null) setEnergyLevel(data.energy_recovery_score);
        }
      } catch { /* table may not exist yet */ }
    })();
  }, [checkInDate]);

  // ── Auto-collapse when all cards submitted ─────────────
  useEffect(() => {
    if (allSubmitted && !collapsed) setCollapsed(true);
  }, [allSubmitted, collapsed]);

  // ── Pending cards summary for minimized state ──────────
  const pendingCards = [
    { card: sleepCard, label: 'Sleep' },
    { card: exerciseCard, label: 'Exercise' },
    { card: activityCard, label: 'Activity' },
    { card: stressCard, label: 'Stress' },
    { card: energyCard, label: 'Energy' },
  ].filter((c) => !c.card.isSubmitted).map((c) => c.label);

  // ── Collapsed state (complete or partial) ───────────────
  if (collapsed) {
    const isComplete = allSubmitted;
    const promptText = isComplete ? 'Complete' : pendingCards.join(' · ');
    const promptColor = isComplete ? '#22C55E' : 'rgba(255,255,255,0.70)';
    const borderColor = isComplete ? 'border-[#22C55E]/25' : 'border-white/10';
    const bgColor = isComplete ? 'bg-[#22C55E]/[0.07]' : 'bg-[#1E3054]/60';

    return (
      <div className={`flex w-full items-center gap-3 rounded-xl border ${borderColor} ${bgColor} backdrop-blur-md p-3`}>
        {/* Heading — always visible */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <ClipboardCheck className="h-4 w-4 flex-shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold text-white whitespace-nowrap">Quick Daily Check Ins</h3>
        </div>

        {/* Middle prompt */}
        <div className="flex-1 min-w-0 flex items-center justify-center">
          {isComplete && <Check className="h-3.5 w-3.5 mr-1 flex-shrink-0 text-[#22C55E]" strokeWidth={1.5} />}
          <span className="text-xs font-medium truncate" style={{ color: promptColor }}>
            {promptText}
          </span>
        </div>

        {/* 21st.dev styled Expand button */}
        <button
          onClick={() => setCollapsed(false)}
          className="group relative flex flex-shrink-0 items-center gap-1.5 overflow-hidden rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(45,165,160,0.35)] active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)',
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="relative">Expand</span>
          <ChevronDown className="relative h-3 w-3" strokeWidth={2} />
        </button>
      </div>
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
          <span className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.10]">
            Collapse
          </span>
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
                <div className={`transition-opacity duration-300 ${sleepCard.isSubmitted ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CheckInSlider id="sleep-hours" title="Hours slept" icon={<Moon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />} min={0} max={12} step={0.5} value={sleepHours} onChange={setSleepHours} formatLabel={(v) => `${v.toFixed(1)} h`} leftLabel="0" rightLabel="12h" />
                  <CheckInSlider id="sleep-quality" title="Sleep quality" icon={<Star className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />} min={1} max={5} step={1} value={sleepQuality} onChange={setSleepQuality} formatLabel={sleepQualityLabel} leftLabel="Terrible" rightLabel="Great" />
                </div>
                <div className="mt-2">
                  <CheckInSubmitButton isSubmitted={sleepCard.isSubmitted} isLoading={sleepCard.isLoading} onSubmit={sleepCard.handleSubmit} label="Save sleep" />
                </div>
              </div>

              {/* ── Card 2: Exercise ───────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Exercise today?
                </p>
                <div className={`transition-opacity duration-300 ${exerciseCard.isSubmitted ? 'opacity-50 pointer-events-none' : ''}`}>
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
                <div className="mt-2">
                  <CheckInSubmitButton isSubmitted={exerciseCard.isSubmitted} isLoading={exerciseCard.isLoading} onSubmit={exerciseCard.handleSubmit} label="Save exercise" />
                </div>
              </div>

              {/* ── Card 3: Activity ───────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  How active were you?
                </p>
                <div className={`transition-opacity duration-300 ${activityCard.isSubmitted ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CheckInSlider id="activity-level" title="Activity level" icon={<Activity className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />} min={1} max={5} step={1} value={activityLevel} onChange={setActivityLevel} formatLabel={activityLabel} leftLabel="Sedentary" rightLabel="Very Active" />
                </div>
                <div className="mt-2">
                  <CheckInSubmitButton isSubmitted={activityCard.isSubmitted} isLoading={activityCard.isLoading} onSubmit={activityCard.handleSubmit} label="Save activity" />
                </div>
              </div>

              {/* ── Card 4: Stress ─────────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Stress level?
                </p>
                <div className={`transition-opacity duration-300 ${stressCard.isSubmitted ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CheckInSlider id="stress-level" title="Stress level" icon={<Zap className="h-4 w-4 text-[#B75E18]" strokeWidth={1.5} />} min={1} max={5} step={1} value={stressLevel} onChange={setStressLevel} formatLabel={stressLabel} leftLabel="Very Low" rightLabel="Very High" accentColor="#B75E18" />
                </div>
                <div className="mt-2">
                  <CheckInSubmitButton isSubmitted={stressCard.isSubmitted} isLoading={stressCard.isLoading} onSubmit={stressCard.handleSubmit} label="Save stress" />
                </div>
              </div>

              {/* ── Card 5: Energy ─────────────────────────── */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Energy & recovery?
                </p>
                <div className={`transition-opacity duration-300 ${energyCard.isSubmitted ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CheckInSlider id="energy-recovery" title="Energy & recovery" icon={<Battery className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />} min={1} max={5} step={1} value={energyLevel} onChange={setEnergyLevel} formatLabel={energyLabel} leftLabel="Exhausted" rightLabel="Excellent" />
                </div>
                <div className="mt-2">
                  <CheckInSubmitButton isSubmitted={energyCard.isSubmitted} isLoading={energyCard.isLoading} onSubmit={energyCard.handleSubmit} label="Save energy" />
                </div>
              </div>

              {allSubmitted && (
                <div className="flex items-center gap-2 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/10 p-3">
                  <Check className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                  <span className="text-xs text-[#22C55E]">All check-ins saved for today! +15 Helix Points</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
