'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
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

interface DailyScoresPanelProps {
  checkinRaw?: Record<string, any> | null;
  previewRaw?: Record<string, any> | null;
}

type ScoreState = 'loading' | 'empty' | 'loaded';

const CACHE_KEY = 'vc_daily_scores_cache';
const MEALS_CACHE_KEY = 'vc_local_meals_cache';

interface LocalMeal {
  meal_type: string;
  quality_rating?: number | null;
  meal_score?: number | null;
  calories?: number | null;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fats_grams?: number | null;
}

function getCachedScores(): DailyScoreResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.date !== new Date().toISOString().split('T')[0]) return null;
    return parsed.scores;
  } catch { return null; }
}

function setCachedScores(scores: DailyScoreResult) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      scores,
    }));
  } catch {}
}

function getCachedMeals(): LocalMeal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEALS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed.date !== new Date().toISOString().split('T')[0]) return [];
    return parsed.meals ?? [];
  } catch { return []; }
}

function setCachedMeals(meals: LocalMeal[]) {
  try {
    localStorage.setItem(MEALS_CACHE_KEY, JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      meals,
    }));
  } catch {}
}

export function DailyScoresPanel({ checkinRaw, previewRaw }: DailyScoresPanelProps) {
  // Three-state rendering: loading → empty | loaded. Once loaded, NEVER goes back.
  const [scoreState, setScoreState] = useState<ScoreState>(() => {
    const cached = getCachedScores();
    return cached ? 'loaded' : 'loading';
  });
  const [savedResult, setSavedResult] = useState<DailyScoreResult | null>(getCachedScores);
  const [previewResult, setPreviewResult] = useState<DailyScoreResult | null>(null);
  const scoresLoadedRef = useRef(!!getCachedScores());

  const result = savedResult ?? previewResult;
  const isPreview = !savedResult && previewResult !== null;

  const computeScores = useCallback(async (overrideCheckin?: DailyCheckinData | null) => {
    let cancelled = false;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const today = new Date().toISOString().split('T')[0];

      let checkinData: DailyCheckinData | null = overrideCheckin ?? null;
      let rawCheckin: Record<string, any> | null = null;
      if (!checkinData) {
        try {
          const { data } = await (supabase as any)
            .from('daily_checkins')
            .select('*')
            .eq('user_id', user.id)
            .eq('check_in_date', today)
            .maybeSingle();
          if (data) {
            rawCheckin = data;
            checkinData = mapCheckInToScoringInput(data);
          }
        } catch {}
      }

      let mealLog: MealLogData = { meals: [] };
      let dbMealScores: number[] = [];
      try {
        // Select with wildcard so the query works whether or not
        // the meal_score / macro_sliders migration has been applied.
        const { data: meals } = await (supabase as any)
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('meal_date', today);
        if (meals && meals.length > 0) {
          mealLog = {
            meals: meals.map((m: any) => ({
              meal_type: m.meal_type, calories: m.calories,
              protein_grams: m.protein_g, carbs_grams: m.carbs_g,
              fats_grams: m.fat_g, includes_vegetables: false,
              includes_whole_grains: false, includes_lean_protein: false,
              meal_quality_rating: m.quality_rating,
            })),
          };
          // Prompt #84: meal_score (0-100 from macro sliders) is the primary
          // nutrition data source. Stored in meal_logs, NOT daily_checkins.
          dbMealScores = meals
            .map((m: any) => m.meal_score as number | null)
            .filter((s: number | null): s is number => s !== null);
        }
      } catch {}

      // Merge client-side cached meals (captured from meal-logged events)
      // for users whose DB writes fail silently or whose table doesn't exist.
      const local = getCachedMeals();
      if (local.length > 0) {
        const existing = new Set(mealLog.meals.map((m) => m.meal_type));
        for (const lm of local) {
          if (!existing.has(lm.meal_type)) {
            mealLog.meals.push({
              meal_type: lm.meal_type,
              calories: lm.calories ?? null,
              protein_grams: lm.protein_grams ?? null,
              carbs_grams: lm.carbs_grams ?? null,
              fats_grams: lm.fats_grams ?? null,
              includes_vegetables: false,
              includes_whole_grains: false,
              includes_lean_protein: false,
              meal_quality_rating: lm.quality_rating ?? null,
            });
          }
        }
      }

      if (cancelled) return;

      const scores = calculateDailyScores(checkinData, mealLog.meals.length > 0 ? mealLog : null, null);

      // Prompt #84: Build nutrition score from meal_logs.meal_score (primary),
      // then cached meal_score, then quality_rating fallback. Never read from
      // daily_checkins for meal data — those are independent streams.
      const mealScores: number[] = [...dbMealScores];

      // Supplement with cached meals (from meal-logged events)
      if (mealScores.length === 0) {
        for (const lm of getCachedMeals()) {
          const s = (lm as any).meal_score ?? (lm.quality_rating != null ? Math.min(100, Math.max(0, lm.quality_rating * 25)) : null);
          if (s != null) mealScores.push(s);
        }
      }

      // Final fallback: quality_rating from any source
      if (mealScores.length === 0) {
        const ratingSource: Array<{ quality_rating?: number | null }> = [
          ...mealLog.meals.map((m) => ({ quality_rating: m.meal_quality_rating })),
          ...getCachedMeals(),
        ];
        for (const r of ratingSource) {
          if (r.quality_rating != null) {
            mealScores.push(Math.min(100, Math.max(0, r.quality_rating * 25)));
          }
        }
      }

      if (mealScores.length > 0) {
        const avg = Math.round(mealScores.reduce((s, v) => s + v, 0) / mealScores.length);
        scores.nutrition = {
          ...scores.nutrition,
          score: avg,
          manualScore: avg,
          manualWeight: 1,
          wearableWeight: 0,
          confidence: Math.min(1, 0.4 + mealScores.length * 0.15),
          color: getScoreColor(avg),
        };
        // Recompute overall so the new nutrition value is reflected.
        const active = [scores.sleep, scores.energy, scores.moodStress, scores.nutrition, scores.activity]
          .filter((g) => g.confidence > 0);
        if (active.length > 0) {
          const overallScore = Math.round(active.reduce((s, g) => s + g.score, 0) / active.length);
          scores.overall = {
            ...scores.overall,
            score: overallScore,
            confidence: active.length / 5,
            color: getScoreColor(overallScore),
          };
        }
      }

      // Prompt #84 defense-in-depth: if the DB query returned no check-in
      // data (e.g. columns not yet applied, or write still in-flight),
      // but we already have client-side scores in state/cache, merge
      // them so no gauge ever drops from a valid score back to zero.
      if (scores.overall.confidence === 0 && scoresLoadedRef.current) {
        const prev = getCachedScores();
        if (prev && prev.overall.confidence > 0) {
          // Overlay: keep any new non-zero gauge from the DB, but fill
          // zeros from the previous known-good state.
          const gauges: Array<'sleep' | 'energy' | 'moodStress' | 'nutrition' | 'activity'> =
            ['sleep', 'energy', 'moodStress', 'nutrition', 'activity'];
          for (const g of gauges) {
            if (scores[g].confidence === 0 && prev[g].confidence > 0) {
              scores[g] = prev[g];
            }
          }
          // Recompute overall
          const active = gauges.map((g) => scores[g]).filter((s) => s.confidence > 0);
          if (active.length > 0) {
            const overallScore = Math.round(active.reduce((s, g) => s + g.score, 0) / active.length);
            scores.overall = { ...scores.overall, score: overallScore, confidence: active.length / 5, color: getScoreColor(overallScore) };
          }
        }
      }

      if (scores.overall.confidence > 0) {
        setSavedResult(scores);
        setPreviewResult(null);
        setScoreState('loaded');
        scoresLoadedRef.current = true;
        setCachedScores(scores);
      } else if (!scoresLoadedRef.current) {
        setScoreState('empty');
      }
    } catch {
      if (!scoresLoadedRef.current) setScoreState('empty');
    }
    return () => { cancelled = true; };
  }, []);

  // Initial load
  useEffect(() => { computeScores(); }, [computeScores]);

  // GUARD: never reset to empty/loading once loaded
  useEffect(() => {
    if (scoresLoadedRef.current && scoreState !== 'loaded') {
      setScoreState('loaded');
    }
  }, [scoreState]);

  // When parent passes saved check-in data (from per-card submit).
  // Prompt #84: Preserve existing nutrition score — check-in data is an
  // independent stream from meal data and must NEVER zero out nutrition.
  useEffect(() => {
    if (checkinRaw) {
      const mapped = mapCheckInToScoringInput(checkinRaw);
      const scores = calculateDailyScores(mapped, null, null);

      // Preserve nutrition from the session-cached scores (set by the last
      // computeScores() call or meal-logged event). Without this, passing
      // null for meals causes nutrition to drop to confidence 0.
      const cached = getCachedScores();
      if (cached && cached.nutrition.confidence > 0) {
        scores.nutrition = cached.nutrition;
      }
      // Also check local meal cache as a secondary source
      const cachedMeals = getCachedMeals();
      if (scores.nutrition.confidence === 0 && cachedMeals.length > 0) {
        const mealScores = cachedMeals
          .filter((m) => (m as any).meal_score != null || m.quality_rating != null)
          .map((m) => (m as any).meal_score ?? Math.min(100, Math.max(0, (m.quality_rating ?? 2) * 25)));
        if (mealScores.length > 0) {
          const avg = Math.round(mealScores.reduce((s: number, v: number) => s + v, 0) / mealScores.length);
          scores.nutrition = {
            ...scores.nutrition,
            score: avg, manualScore: avg, manualWeight: 1, wearableWeight: 0,
            confidence: Math.min(1, 0.4 + mealScores.length * 0.15),
            color: getScoreColor(avg),
          };
        }
      }

      // Recompute overall with the preserved nutrition
      const active = [scores.sleep, scores.energy, scores.moodStress, scores.nutrition, scores.activity]
        .filter((g) => g.confidence > 0);
      if (active.length > 0) {
        const overallScore = Math.round(active.reduce((s, g) => s + g.score, 0) / active.length);
        scores.overall = {
          ...scores.overall,
          score: overallScore, confidence: active.length / 5,
          color: getScoreColor(overallScore),
        };
      }

      if (scores.overall.confidence > 0) {
        setSavedResult(scores);
        setPreviewResult(null);
        setScoreState('loaded');
        scoresLoadedRef.current = true;
        setCachedScores(scores);
      }
    }
  }, [checkinRaw]);

  // Live preview from slider changes
  useEffect(() => {
    if (previewRaw && !scoresLoadedRef.current) {
      const mapped = mapCheckInToScoringInput(previewRaw);
      const preview = calculateDailyScores(mapped, null, null);
      if (preview.overall.confidence > 0) {
        setPreviewResult(preview);
        if (scoreState === 'empty') setScoreState('loaded');
      }
    }
  }, [previewRaw, scoreState]);

  // Listen for check-in + meal events (always active so a fresh user
  // who logs a meal first gets an immediate gauge update).
  // Meal events may carry detail which we cache locally so scoring
  // works even when the meal_logs DB write fails silently.
  useEffect(() => {
    const onCheckin = () => computeScores();
    const onMeal = (e: Event) => {
      const detail = (e as CustomEvent).detail as LocalMeal | undefined;
      if (detail && detail.meal_type) {
        const existing = getCachedMeals();
        const dedup = existing.filter((m) => m.meal_type !== detail.meal_type);
        setCachedMeals([...dedup, detail]);
      }
      computeScores();
    };
    window.addEventListener('checkin-submitted', onCheckin);
    window.addEventListener('meal-logged', onMeal);
    return () => {
      window.removeEventListener('checkin-submitted', onCheckin);
      window.removeEventListener('meal-logged', onMeal);
    };
  }, [computeScores]);

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

  // ── Three-state rendering ──────────────────────────────────
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60 backdrop-blur-md p-5 sm:p-6 md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-15 blur-3xl" style={{ backgroundColor: '#2DA5A0' }} />

        <div className="relative mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2DA5A0]">Personal Wellness Dashboard</p>
            </div>
            <h2 className="text-lg font-bold text-white sm:text-xl">Daily Scores</h2>
            <p className="mt-0.5 text-xs text-white/40">
              {scoreState === 'loaded' && result
                ? result.dataMode === 'combined' ? 'Blending check-in + device data'
                  : result.dataMode === 'wearable' ? 'Scores from connected device'
                  : 'Scores from your daily check-in'
                : scoreState === 'loading' ? 'Loading your scores...'
                : 'Complete your check-in to see scores'}
            </p>
          </div>

          {scoreState === 'loaded' && result && result.overall.confidence > 0 && (
            <div className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/40">Overall</p>
                <p className="text-base font-bold" style={{ color: result.overall.color }}>{result.overall.score}/100</p>
              </div>
            </div>
          )}
        </div>

        {/* LOADING: skeleton gauges, never CTA */}
        {scoreState === 'loading' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[180px] animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        )}

        {/* EMPTY: CTA (only if genuinely no data) */}
        {scoreState === 'empty' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <ClipboardList className="h-10 w-10 text-white/15" strokeWidth={1.5} />
            <p className="text-sm text-white/40">Complete your Quick Daily Check Ins to see your scores</p>
            <p className="text-xs text-white/25">Save each card and your scores will appear here</p>
          </div>
        )}

        {/* LOADED: gauges (never resets to empty) */}
        {scoreState === 'loaded' && result && (
          <div className={`relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 ${isPreview ? 'ring-1 ring-[#2DA5A0]/20 rounded-2xl p-1' : ''}`}>
            <DailyScoreGauge {...result.sleep} color="#004aad" dataMode={result.dataMode} icon={Bed} isPreview={isPreview} />
            <DailyScoreGauge {...result.energy} dataMode={result.dataMode} icon={Zap} isPreview={isPreview} />
            <DailyScoreGauge {...result.moodStress} dataMode={result.dataMode} icon={Brain} isPreview={isPreview} />
            <DailyScoreGauge {...result.nutrition} dataMode={result.dataMode} icon={Apple} isPreview={isPreview} />
            <DailyScoreGauge {...result.activity} dataMode={result.dataMode} icon={Activity} isPreview={isPreview} />
            <DailyScoreGauge {...result.overall} dataMode={result.dataMode} icon={Heart} isPreview={isPreview} />
          </div>
        )}
      </section>

      {scoreState === 'loaded' && result && <EngagementNudge nudge={nudge} />}
    </div>
  );
}
