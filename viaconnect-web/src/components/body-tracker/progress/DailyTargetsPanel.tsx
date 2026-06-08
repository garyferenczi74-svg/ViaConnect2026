'use client';

// Prompt 179 Section 7.3 Daily Targets (Gordon). Renders the resolved daily
// target with provenance. The five macros plus added-sugar ceiling and
// hydration; added sugar shows a 5 percent stretch marker.

import { Flame, Beef, Droplet, Wheat, Leaf, CandyOff, GlassWater } from 'lucide-react';
import type { TargetView } from './useActiveGoal';

export function DailyTargetsPanel({ target }: { target: TargetView | null }) {
  if (!target) return null;

  const teal = '#2DA5A0';
  const orange = '#B75E18';
  const sugarStretch = target.added_sugar_limit_g != null ? Math.round(target.added_sugar_limit_g / 2) : null;

  const items: Array<{ label: string; value: string; unit: string; Icon: typeof Flame; color: string; note?: string }> = [
    { label: 'Calories', value: `${target.calorie_target_kcal}`, unit: 'kcal', Icon: Flame, color: orange },
    { label: 'Protein', value: `${target.protein_g}`, unit: 'g', Icon: Beef, color: teal },
    { label: 'Fat', value: `${target.fat_g}`, unit: 'g', Icon: Droplet, color: teal },
    { label: 'Carbs', value: `${target.carb_g}`, unit: 'g', Icon: Wheat, color: teal },
    { label: 'Fiber', value: `${target.fiber_g}`, unit: 'g', Icon: Leaf, color: teal },
    {
      label: 'Added sugar ceiling',
      value: target.added_sugar_limit_g != null ? `${target.added_sugar_limit_g}` : 'not set',
      unit: 'g',
      Icon: CandyOff,
      color: orange,
      note: sugarStretch != null ? `stretch ${sugarStretch} g` : undefined,
    },
    { label: 'Hydration', value: target.hydration_ml != null ? `${target.hydration_ml}` : 'not set', unit: 'ml', Icon: GlassWater, color: teal },
  ];

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-5 backdrop-blur-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Daily Targets</h2>
        <span className="text-xs text-white/50">Set by Gordon from your goal trajectory</span>
      </div>
      <p className="mb-4 text-xs text-white/50">These drive today&apos;s Nutrition Score and Daily Macros.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <it.Icon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: it.color }} />
              <span className="text-[11px] text-white/60">{it.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold text-white">{it.value}</span>
              <span className="text-[11px] text-white/40">{it.unit}</span>
            </div>
            {it.note ? <p className="mt-0.5 text-[10px] text-white/35">{it.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
