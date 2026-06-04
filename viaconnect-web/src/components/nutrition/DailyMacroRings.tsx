'use client';

// Prompt #168c section 2.6: Daily Macros card. Moved from /components/dashboard
// per spec section 3.4 + restyled to match the Nutrition section visual
// language (translucent navy with backdrop blur instead of solid #1E3054).
//
// Four circular ring widgets: Protein, Carbs, Fat, Fiber. Each ring shows
// current daily total as the filled portion, target as the full circle.
// Tier color treatment per spec (under 25% Orange Deep, 25-50% Orange Light,
// 50-75% Amber Neutral, 75-100% Teal Light, 100% or over Teal Primary).
//
// Prompt 173 Phase 6 (2026-06-03): added a calorie target header above the
// rings (consumed / target kcal), a conservative-path note when targets.
// conservativePath is true (the 5.5 maintenance posture), and the
// MacroDisclaimer per the compliance memo. Goal direction chip surfaces
// the effective direction when present.

import { useMemo } from 'react';
import { HeartHandshake } from 'lucide-react';
import type { Meal, NutritionTargets } from '@/lib/gordon/types';
import { MacroDisclaimer } from './MacroDisclaimer';

export interface DailyMacroRingsProps {
  readonly meals: Meal[];
  readonly targets: NutritionTargets;
  readonly userTimezone?: string;
}

interface MacroSpec {
  key: 'protein' | 'carbs' | 'fat' | 'fiber';
  label: string;
  unit: string;
  actual: number;
  target: number;
}

// Prompt #168c section 2.6 fill-percent tier band colors.
const COLOR_DEEP_ORANGE = '#B75E18';
const COLOR_LIGHT_ORANGE = '#D4823B';
const COLOR_AMBER = '#C9A23A';
const COLOR_LIGHT_TEAL = '#5BC0BB';
const COLOR_PRIMARY_TEAL = '#2DA5A0';

function localDateKey(iso: string, timezone: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(d);
  } catch {
    return '';
  }
}

function colorForFill(actual: number, target: number): string {
  if (target <= 0) return COLOR_DEEP_ORANGE;
  const pct = actual / target;
  if (pct < 0.25) return COLOR_DEEP_ORANGE;
  if (pct < 0.50) return COLOR_LIGHT_ORANGE;
  if (pct < 0.75) return COLOR_AMBER;
  if (pct < 1.00) return COLOR_LIGHT_TEAL;
  return COLOR_PRIMARY_TEAL;
}

function MacroRing({ spec, sizePx }: { spec: MacroSpec; sizePx: number }) {
  const stroke = 8;
  const radius = (sizePx - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = spec.target > 0 ? Math.min(1, spec.actual / spec.target) : 0;
  const arcLength = ratio * circumference;
  const color = colorForFill(spec.actual, spec.target);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={`${spec.label} ${Math.round(spec.actual)} of ${Math.round(spec.target)} ${spec.unit}`}
        className="relative inline-flex items-center justify-center"
        style={{ width: sizePx, height: sizePx }}
      >
        <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`}>
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            transform={`rotate(-90 ${sizePx / 2} ${sizePx / 2})`}
            style={{ transition: 'stroke-dasharray 200ms ease-out, stroke 200ms ease-out' }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[14px] font-semibold tabular-nums leading-none text-white">
            {Math.round(spec.actual)}
          </span>
          <span className="mt-0.5 text-[10px] tabular-nums leading-none text-white/55">
            / {Math.round(spec.target)}
          </span>
        </div>
      </div>
      <span className="text-[12px] uppercase tracking-[0.10em] text-white/65">{spec.label}</span>
    </div>
  );
}

// Calm, factual direction label. Matches the WeightGoalsSection.
const DIRECTION_LABEL: Record<'lose' | 'gain' | 'maintain', string> = {
  lose: 'Lose',
  gain: 'Gain',
  maintain: 'Maintain',
};

export function DailyMacroRings(props: DailyMacroRingsProps) {
  const { meals, targets, userTimezone } = props;
  const tz = useMemo(
    () => userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [userTimezone],
  );

  const totals = useMemo(() => {
    const todayKey = localDateKey(new Date().toISOString(), tz);
    let kcal = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    if (!todayKey) return { kcal, protein, carbs, fat, fiber };
    for (const m of meals) {
      if (localDateKey(m.loggedAt, tz) !== todayKey) continue;
      // Per #168c lock + #168d Layer 6, narrowed by Prompt 173b (2026-06-01):
      // the legacy marker is qualityScore IS NULL. New full_manual saves
      // run through Gordon scoring (Prompt 173b lifted the 168c/168d
      // unscored lock) and contribute their macros to Daily Macros; only
      // pre-173b NULL-score rows are excluded.
      if (m.qualityScore === null) continue;
      kcal += Number(m.caloriesKcal) || 0;
      protein += Number(m.proteinG) || 0;
      carbs += Number(m.carbsG) || 0;
      fat += Number(m.fatTotalG) || 0;
      fiber += Number(m.fiberG) || 0;
    }
    return { kcal, protein, carbs, fat, fiber };
  }, [meals, tz]);

  const specs: MacroSpec[] = [
    { key: 'protein', label: 'Protein', unit: 'g', actual: totals.protein, target: targets.dailyProteinG },
    { key: 'carbs', label: 'Carbs', unit: 'g', actual: totals.carbs, target: targets.dailyCarbsG },
    { key: 'fat', label: 'Fat', unit: 'g', actual: totals.fat, target: targets.dailyFatTotalG },
    { key: 'fiber', label: 'Fiber', unit: 'g', actual: totals.fiber, target: targets.dailyFiberG },
  ];

  const kcalActual = Math.round(totals.kcal);
  const kcalTarget = Math.round(targets.dailyKcal);
  const kcalPct = kcalTarget > 0 ? Math.min(100, Math.round((kcalActual / kcalTarget) * 100)) : 0;

  return (
    <section
      className="font-[Instrument_Sans] rounded-2xl border border-white/10 bg-[#1E3054]/40 backdrop-blur-md p-4 text-white md:p-5"
      aria-label="Daily Macros"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-white">Daily macros</h2>
        <span className="text-[11px] uppercase tracking-[0.10em] text-white/50">today</span>
      </header>

      {/* Calorie target header. Sits above the macro rings; the percentage
          bar matches the tone of the other progress surfaces on this page. */}
      <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] uppercase tracking-[0.10em] text-white/55">Calories</p>
          {targets.goalDirection && targets.goalDirection !== 'maintain' && !targets.conservativePath ? (
            <span className="text-[11px] font-medium text-teal-300/80">
              Goal: {DIRECTION_LABEL[targets.goalDirection]}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[20px] font-semibold tabular-nums text-white">{kcalActual}</span>
          <span className="text-[12px] tabular-nums text-white/55">/ {kcalTarget} kcal</span>
          <span className="ml-auto text-[11px] tabular-nums text-white/55">{kcalPct}%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-teal-400/70"
            style={{ width: `${kcalPct}%`, transition: 'width 200ms ease-out' }}
          />
        </div>
      </div>

      {/* Conservative-path note: Section 5.5 maintenance posture. Suppresses
          deficit / rate-of-loss framing in favor of a calm referral note. */}
      {targets.conservativePath ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border border-teal/20 bg-teal/5 px-3 py-2.5"
          role="note"
          aria-live="polite"
        >
          <HeartHandshake className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-teal-300" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-white/70">
            We are keeping these targets steady and maintenance oriented for now. A healthcare professional can help you set goals that feel right for you.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {specs.map((spec) => (
          <MacroRing key={spec.key} spec={spec} sizePx={88} />
        ))}
      </div>

      <MacroDisclaimer />
    </section>
  );
}

export default DailyMacroRings;
