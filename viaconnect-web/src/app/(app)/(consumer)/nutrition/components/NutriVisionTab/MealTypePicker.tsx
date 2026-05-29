'use client';

// Prompt #170 Phase 1q hotfix 6: explicit meal-type picker for the review
// screen. detectMealTypeForNow() seeds the default off the local clock; this
// control lets the user override before saving so two breakfast uploads in a
// row no longer both stamp meal_type='breakfast'.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { Coffee, UtensilsCrossed, Soup, Cookie } from 'lucide-react';

export type NutriVisionMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealTypePickerProps {
  value: NutriVisionMealType;
  onChange: (next: NutriVisionMealType) => void;
}

const OPTIONS: ReadonlyArray<{ id: NutriVisionMealType; label: string; Icon: typeof Coffee }> = [
  { id: 'breakfast', label: 'Breakfast', Icon: Coffee },
  { id: 'lunch',     label: 'Lunch',     Icon: UtensilsCrossed },
  { id: 'dinner',    label: 'Dinner',    Icon: Soup },
  { id: 'snack',     label: 'Snack',     Icon: Cookie },
];

export function MealTypePicker({ value, onChange }: MealTypePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {OPTIONS.map(({ id, label, Icon }) => {
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`group flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium transition-colors ${
              selected
                ? 'bg-[#2DA5A0] text-[#1A2744]'
                : 'border border-white/10 bg-[#1E3054]/60 text-white/70 hover:bg-[#1E3054] hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
