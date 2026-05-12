'use client';

// Prompt #160: Meal type selector for the Log Full Meal and Photo AI routes.
// Four pill buttons (Breakfast / Lunch / Dinner / Snack). Teal #2DA5A0 active.

import { Sunrise, Sun, Moon, Apple } from 'lucide-react';
import type { MealType } from '@/lib/nutrition/schema';

const OPTIONS: Array<{ value: MealType; label: string; Icon: typeof Sunrise }> = [
  { value: 'breakfast', label: 'Breakfast', Icon: Sunrise },
  { value: 'lunch',     label: 'Lunch',     Icon: Sun },
  { value: 'dinner',    label: 'Dinner',    Icon: Moon },
  { value: 'snack',     label: 'Snack',     Icon: Apple },
];

interface MealTypeSelectorProps {
  readonly value: MealType;
  readonly onChange: (v: MealType) => void;
}

export function MealTypeSelector({ value, onChange }: MealTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Meal type">
      {OPTIONS.map(({ value: v, label, Icon }) => {
        const isActive = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all min-h-[44px] ${
              isActive
                ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                : 'border-white/[0.08] bg-white/5 text-white/55 hover:bg-white/10'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
