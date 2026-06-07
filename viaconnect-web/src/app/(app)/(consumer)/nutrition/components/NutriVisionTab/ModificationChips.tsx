'use client';

// Prompt #170 Phase 1l: modifier chip row.
//
// Prompt 177g (2026-06-07): de-duplicated add-to-meal chips. The
// per-item add-on chips (butter, cream, cheese, sauce) duplicated the
// meal-level Add to the meal section, which surfaced the same affordance
// twice. Per-item now keeps only the cooking-method chips (grilled,
// baked, raw) because those exist nowhere else and are genuinely per
// item. Meal scope keeps butter, cream, cheese, sauce as the canonical
// add-to-meal entry point.
//
// Two scopes:
//   - per item:   grilled / baked / raw set the cooking method + clear oil.
//   - whole meal: butter / cream / cheese / sauce spawn a new item.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { Sparkles } from 'lucide-react';
import type { ModifierChip } from './types';

interface ModificationChipsProps {
  scope: 'item' | 'meal';
  onApply: (chip: ModifierChip) => void;
}

const ITEM_CHIPS: ReadonlyArray<{ id: ModifierChip; label: string }> = [
  { id: 'grilled', label: 'Grilled' },
  { id: 'baked',   label: 'Baked' },
  { id: 'raw',     label: 'Raw' },
];

const MEAL_CHIPS: ReadonlyArray<{ id: ModifierChip; label: string }> = [
  { id: 'butter', label: 'Butter' },
  { id: 'cream',  label: 'Cream' },
  { id: 'cheese', label: 'Cheese' },
  { id: 'sauce',  label: 'Sauce' },
];

export function ModificationChips({ scope, onApply }: ModificationChipsProps) {
  const chips = scope === 'item' ? ITEM_CHIPS : MEAL_CHIPS;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[11px] text-white/50">
        <Sparkles className="h-3 w-3" strokeWidth={1.5} />
        <span>{scope === 'item' ? 'Modify this item' : 'Add to the meal'}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onApply(c.id)}
            className="rounded-full border border-white/[0.08] bg-white/5 px-2.5 py-1 text-[11px] text-white/80 transition-colors hover:border-[#2DA5A0]/40 hover:bg-[#2DA5A0]/10 hover:text-white"
            aria-label={`Add ${c.label} to ${scope === 'item' ? 'this item' : 'the meal'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
