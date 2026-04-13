'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Bed, Zap, Brain, Apple, Activity, Heart, Sparkles, ClipboardList } from 'lucide-react';
import { DailyScoreGauge } from './DailyScoreGauge';
import {
  calculateDailyScores,
  mapCheckInToScoringInput,
  getScoreColor,
  type DailyScoreResult,
  type DailyCheckinData,
  type MealLogData,
} from '@/lib/scoring/dailyScoreEngineV2';
import { EngagementNudge } from './EngagementNudge';
import { topNudge } from '@/lib/scoring/engagementNudges';
import Link from 'next/link';

interface DailyScoresPanelProps {
  checkinRaw?: Record<string, any> | null;
  previewRaw?: Record<string, any> | null;
}

export function DailyScoresPanel({ checkinRaw, previewRaw }: DailyScoresPanelProps) {
  const [savedResult, setSavedResult] = useState<DailyScoreResult | null>(null);
  const [previewResult, setPreviewResult] = useState<DailyScoreResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  const result = savedResult ?? previewResult;
  const isPreview = !savedResult && previewResult !== null;

  const computeScores = useCallback(async (overrideCheckin?: DailyCheckinData | null) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];

      // Fetch check-in data (use override if provided, otherwise fetch from DB)
      let checkinData: DailyCheckinData | null = overrideCheckin ?? null;
      if (!checkinData) {
        try {
          const { data } = await (supabase as any)
            .from('daily_checkins')
            .select('*')
            .eq('user_id', user.id)
            .eq('checkin_date', today)
            .maybeSingle();
          if (data) checkinData = mapCheckInToScoringInput(data);
        } catch { /* table may not exist */ }
      }

      // Fetch meal logs
      let mealLog: MealLogData = { meals: [] };
      try {
        const { data: meals } = await (supabase as any)
          .from('meal_logs')
          .select('meal_type, calories, protein_g, carbs_g, fat_g, quality_rating')
          .eq('user_id', user.id)
          .eq('meal_date', today);
        if (meals && meals.length > 0) {
          mealLog = {
            meals: meals.map((m: any) => ({
              meal_type: m.meal_type,
              calories: m.calories,
              protein_grams: m.protein_g,
              carbs_grams: m.carbs_g,
              fats_grams: m.fat_g,
              includes_vegetables: false,
              includes_whole_grains: false,
              includes_lean_protein: false,
              meal_quality_rating: m.quality_rating,
            })),
          };
        }
      } catch { /* table may not exist */ }

      // Fetch wearable data (future: when connected)
      // const wearable = null;

      const scores = calculateDailyScores(checkinData, mealLog.meals.length > 0 ? mealLog : null, null);
      setSavedResult(scores);
      setPreviewResult(null);
    } catch { /* fallback: no scores */ }
    finally { setLoaded(true); }
  }, []);

  // Initial load
  useEffect(() => { computeScores(); }, [computeScores]);

  // When parent passes saved check-in data (from submit)
  useEffect(() => {
    if (checkinRaw) {
      const mapped = mapCheckInToScoringInput(checkinRaw);
      computeScores(mapped);
    }
  }, [checkinRaw, computeScores]);

  // Live preview: compute scores client-side as sliders move (no DB)
  useEffect(() => {
    if (previewRaw && !savedResult) {
      const mapped = mapCheckInToScoringInput(previewRaw);
      const preview = calculateDailyScores(mapped, null, null);
      setPreviewResult(preview);
    }
  }, [previewRaw, savedResult]);

  // Listen for check-in events (backup path)
  useEffect(() => {
    const handler = () => computeScores();
    window.addEventListener('checkin-submitted', handler);
    window.addEventListener('meal-logged', handler);
    return () => {
      window.removeEventListener('checkin-submitted', handler);
      window.removeEventListener('meal-logged', handler);
    };
  }, [computeScores]);

  const hasData = result && result.overall.confidence > 0;

  // Nudge
  const nudge = topNudge({
    snapshots: result ? [
      { id: 'sleep', score: result.sleep.score },
      { id: 'exercise', score: result.activity.score },
      { id: 'steps', score: result.activity.score },
      { id: 'stress', score: result.moodStress.score },
      { id: 'recovery', score: result.energy.score },
      { id: 'streak', score: 0 },
      { id: 'supplements', score: 0 },
      { id: 'nutrition', score: result.nutrition.score },
    ] : [],
    currentStreak: 0,
    hourOfDay: new Date().getHours(),
  });

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60 backdrop-blur-md p-5 sm:p-6 md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-15 blur-3xl" style={{ backgroundColor: '#2DA5A0' }} />

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
              {result?.dataMode === 'combined' ? 'Blending check-in + device data'
                : result?.dataMode === 'wearable' ? 'Scores from connected device'
                : hasData ? 'Scores from your daily check-in'
                : 'Complete your check-in to see scores'}
            </p>
          </div>

          {hasData && (
            <div className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/40">Overall</p>
                <p className="text-base font-bold" style={{ color: result!.overall.color }}>{result!.overall.score}/100</p>
              </div>
            </div>
          )}
        </div>

        {/* Gauges */}
        {hasData ? (
          <div className={`relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 ${isPreview ? 'ring-1 ring-[#2DA5A0]/20 rounded-2xl p-1' : ''}`}>
            <DailyScoreGauge {...result!.sleep} dataMode={result!.dataMode} icon={Bed} isPreview={isPreview} />
            <DailyScoreGauge {...result!.energy} dataMode={result!.dataMode} icon={Zap} isPreview={isPreview} />
            <DailyScoreGauge {...result!.moodStress} dataMode={result!.dataMode} icon={Brain} isPreview={isPreview} />
            <DailyScoreGauge {...result!.nutrition} dataMode={result!.dataMode} icon={Apple} isPreview={isPreview} />
            <DailyScoreGauge {...result!.activity} dataMode={result!.dataMode} icon={Activity} isPreview={isPreview} />
            <DailyScoreGauge {...result!.overall} dataMode={result!.dataMode} icon={Heart} isPreview={isPreview} />
          </div>
        ) : loaded ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <ClipboardList className="h-10 w-10 text-white/15" strokeWidth={1.5} />
            <p className="text-sm text-white/40">Complete your Quick Daily Check Ins to see your scores</p>
            <p className="text-xs text-white/25">Your scores update instantly as you answer</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[180px] animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        )}
      </section>

      {hasData && <EngagementNudge nudge={nudge} />}
    </div>
  );
}
