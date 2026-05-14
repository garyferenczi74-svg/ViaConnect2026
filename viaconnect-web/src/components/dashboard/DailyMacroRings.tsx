'use client';

// Prompt #168 Apply B: DailyMacroRings.
// Aggregates today's logged meals (in user's local timezone) into protein,
// carbs, fat, fiber totals and renders four rings vs daily targets.
//
// Color band logic mirrors macro fit modifier from Section 3.4:
//   abs(delta) <= 0.15  -> Teal (#2DA5A0) "on target"
//   <= 0.50             -> Amber (#C9A23A) "off"
//   > 0.50 OR 0g logged -> Orange (#B75E18) "well off"
// Goal-direction blindness (over vs under) is acknowledged for v1; absolute
// delta is the locked behavior per Section 3.4.

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

const COLOR_ON_TARGET = '#2DA5A0';
const COLOR_OFF = '#C9A23A';
const COLOR_WELL_OFF = '#B75E18';

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

function colorForFit(actual: number, target: number): string {
  if (target <= 0) return COLOR_WELL_OFF;
  if (actual <= 0) return COLOR_WELL_OFF;
  const delta = Math.abs(actual - target) / target;
  if (delta <= 0.15) return COLOR_ON_TARGET;
  if (delta > 0.5) return COLOR_WELL_OFF;
  return COLOR_OFF;
}

function MacroRing({ spec, sizePx }: { spec: MacroSpec; sizePx: number }) {
  const stroke = 7;
  const radius = (sizePx - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = spec.target > 0 ? Math.min(1, spec.actual / spec.target) : 0;
  const arcLength = ratio * circumference;
  const color = colorForFit(spec.actual, spec.target);

  return (
    <div className="flex flex-col items-center gap-1">
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
          <span className="text-[12px] font-semibold tabular-nums leading-none text-white">
            {Math.round(spec.actual)}
          </span>
          <span className="mt-0.5 text-[9px] tabular-nums leading-none text-white/55">
            / {Math.round(spec.target)}
          </span>
        </div>
      </div>
      <span className="text-[11px] uppercase tracking-[0.10em] text-white/60">{spec.label}</span>
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
      protein += Number(m.proteinG) || 0;
      carbs += Number(m.carbsG) || 0;
      fat += Number(m.fatTotalG) || 0;
      fiber += Number(m.fiberG) || 0;
    }
    return { protein, carbs, fat, fiber };
  }, [meals, tz]);

  const specs: MacroSpec[] = [
    { key: 'protein', label: 'Protein', unit: 'g', actual: totals.protein, target: targets.dailyProteinG },
    { key: 'carbs',   label: 'Carbs',   unit: 'g', actual: totals.carbs,   target: targets.dailyCarbsG },
    { key: 'fat',     label: 'Fat',     unit: 'g', actual: totals.fat,     target: targets.dailyFatTotalG },
    { key: 'fiber',   label: 'Fiber',   unit: 'g', actual: totals.fiber,   target: targets.dailyFiberG },
  ];

  return (
    <section className="font-[Instrument_Sans] rounded-2xl border border-white/10 bg-[#1E3054] p-4 text-white md:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-white">Daily macros</h2>
        <span className="text-[11px] uppercase tracking-[0.10em] text-white/50">today</span>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {specs.map((spec) => (
          <MacroRing key={spec.key} spec={spec} sizePx={72} />
        ))}
      </div>
    </section>
  );
}

export default DailyMacroRings;
