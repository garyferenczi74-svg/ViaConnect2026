'use client';

// Prompt #168c section 2.6: Daily Macros card. Moved from /components/dashboard
// per spec section 3.4 + restyled to match the Nutrition section visual language
// (translucent navy with backdrop blur instead of solid #1E3054).
//
// Four circular ring widgets: Protein, Carbs, Fat, Fiber. Each ring shows
// current daily total as the filled portion, target as the full circle.
// Tier color treatment per spec (under 25% Orange Deep, 25-50% Orange Light,
// 50-75% Amber Neutral, 75-100% Teal Light, 100% or over Teal Primary).

import { useMemo } from 'react';
import type { Meal, NutritionTargets } from '@/lib/gordon/types';

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

export function DailyMacroRings(props: DailyMacroRingsProps) {
  const { meals, targets, userTimezone } = props;
  const tz = useMemo(
    () => userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [userTimezone],
  );

  const totals = useMemo(() => {
    const todayKey = localDateKey(new Date().toISOString(), tz);
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    if (!todayKey) return { protein, carbs, fat, fiber };
    for (const m of meals) {
      if (localDateKey(m.loggedAt, tz) !== todayKey) continue;
      // Per #168c lock + #168d Layer 6, narrowed by Prompt 173b (2026-06-01):
      // the legacy marker is qualityScore IS NULL. New full_manual saves run
      // through Gordon scoring (Prompt 173b lifted the 168c/168d unscored
      // lock) and contribute their macros to Daily Macros; only pre-173b
      // NULL-score rows are excluded.
      if (m.qualityScore === null) continue;
      protein += Number(m.proteinG) || 0;
      carbs += Number(m.carbsG) || 0;
      fat += Number(m.fatTotalG) || 0;
      fiber += Number(m.fiberG) || 0;
    }
    return { protein, carbs, fat, fiber };
  }, [meals, tz]);

  const specs: MacroSpec[] = [
    { key: 'protein', label: 'Protein', unit: 'g', actual: totals.protein, target: targets.dailyProteinG },
    { key: 'carbs', label: 'Carbs', unit: 'g', actual: totals.carbs, target: targets.dailyCarbsG },
    { key: 'fat', label: 'Fat', unit: 'g', actual: totals.fat, target: targets.dailyFatTotalG },
    { key: 'fiber', label: 'Fiber', unit: 'g', actual: totals.fiber, target: targets.dailyFiberG },
  ];

  return (
    <section className="font-[Instrument_Sans] rounded-2xl border border-white/10 bg-[#1E3054]/40 backdrop-blur-md p-4 text-white md:p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-white">Daily macros</h2>
        <span className="text-[11px] uppercase tracking-[0.10em] text-white/50">today</span>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {specs.map((spec) => (
          <MacroRing key={spec.key} spec={spec} sizePx={88} />
        ))}
      </div>
    </section>
  );
}

export default DailyMacroRings;
