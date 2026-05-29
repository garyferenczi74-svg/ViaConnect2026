'use client';

// Prompt #170 Phase 1l: cooking oil selector.
//
// Only renders when cookingMethod is sauteed, fried, or deep_fried (spec §10.5).
// Row 1 oil-type chips, Row 2 amount segmented control, Row 3 suggestion badge,
// Row 4 live macro delta. NEVER auto-applied; the user always taps a chip +
// amount before macros change.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { Sparkles } from 'lucide-react';
import type {
  CookingOilType,
  CookingOilSelection,
} from '@/lib/nutrition/cooking-oil/types';

export interface CookingOilSelectorProps {
  cookingMethod?: string;
  cuisineTag?: string;
  currentSelection?: CookingOilSelection;
  suggestion: { type: CookingOilType; amount_ml: number; reasoning: string };
  onChange: (next: CookingOilSelection) => void;
  liveMacroDelta: { calories_kcal: number; fat_g: number };
}

const OIL_OPTIONS: ReadonlyArray<{ id: CookingOilType; label: string }> = [
  { id: 'none',                 label: 'None' },
  { id: 'olive_oil',            label: 'Olive' },
  { id: 'evoo',                 label: 'EVOO' },
  { id: 'avocado_oil',          label: 'Avocado' },
  { id: 'coconut_oil',          label: 'Coconut' },
  { id: 'butter',               label: 'Butter' },
  { id: 'ghee',                 label: 'Ghee' },
  { id: 'vegetable_canola_oil', label: 'Vegetable' },
  { id: 'sesame_oil',           label: 'Sesame' },
  { id: 'other',                label: 'Other' },
];

const AMOUNT_OPTIONS: ReadonlyArray<number> = [0, 2.5, 5, 10, 15, 30];

const OIL_LABEL: Record<CookingOilType, string> = {
  none: 'No oil',
  olive_oil: 'Olive oil',
  evoo: 'Extra virgin olive oil',
  avocado_oil: 'Avocado oil',
  coconut_oil: 'Coconut oil',
  butter: 'Butter',
  ghee: 'Ghee',
  vegetable_canola_oil: 'Vegetable or canola oil',
  sesame_oil: 'Sesame oil',
  other: 'Other oil',
};

const OIL_AMOUNT_LABEL: Record<number, string> = {
  0: '0 ml',
  2.5: '2.5 ml',
  5: '5 ml',
  10: '10 ml',
  15: '15 ml',
  30: '30 ml',
};

function isOilApplicable(cookingMethod?: string): boolean {
  return cookingMethod === 'sauteed' || cookingMethod === 'fried' || cookingMethod === 'deep_fried';
}

export function CookingOilSelector(props: CookingOilSelectorProps) {
  if (!isOilApplicable(props.cookingMethod)) return null;

  const selected = props.currentSelection;
  const selectedType: CookingOilType = selected?.type ?? props.suggestion.type;
  const selectedAmount: number = selected?.amount_ml ?? props.suggestion.amount_ml;

  const apply = (next: { type?: CookingOilType; amount_ml?: number }) => {
    const type = next.type ?? selectedType;
    const amount_ml = next.amount_ml ?? selectedAmount;
    const wasSuggested = type === props.suggestion.type && amount_ml === props.suggestion.amount_ml;
    const sel: CookingOilSelection = {
      type,
      amount_ml,
      was_suggested_default: wasSuggested,
      suggested_default_type: props.suggestion.type,
      suggested_default_amount_ml: props.suggestion.amount_ml,
    };
    props.onChange(sel);
  };

  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-[#1A2744]/40 p-3"
      data-cooking-oil-selector
    >
      <div className="flex flex-col gap-3">
        {/* Row 1: type chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-white/50">Oil type</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Oil type">
            {OIL_OPTIONS.map((opt) => {
              const active = opt.id === selectedType;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={OIL_LABEL[opt.id]}
                  onClick={() => apply({ type: opt.id })}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-[#2DA5A0] text-white'
                      : 'border border-white/[0.08] bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: amount segmented control */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-white/50">Amount</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Oil amount">
            {AMOUNT_OPTIONS.map((amt) => {
              const active = amt === selectedAmount;
              return (
                <button
                  key={amt}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={OIL_AMOUNT_LABEL[amt]}
                  onClick={() => apply({ amount_ml: amt })}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-[#2DA5A0] text-white'
                      : 'border border-white/[0.08] bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {OIL_AMOUNT_LABEL[amt]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: suggestion badge */}
        <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#2DA5A0]/15 px-2.5 py-1 text-[11px] text-[#2DA5A0]">
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          <span>
            Suggested: {OIL_AMOUNT_LABEL[props.suggestion.amount_ml] ?? `${props.suggestion.amount_ml} ml`}{' '}
            {OIL_LABEL[props.suggestion.type]}
          </span>
        </div>

        {/* Row 4: live macro delta */}
        {(props.liveMacroDelta.calories_kcal > 0 || props.liveMacroDelta.fat_g > 0) && (
          <div className="text-[11px] text-white/60" data-macro-delta>
            <span className="font-mono text-white">
              +{props.liveMacroDelta.calories_kcal} kcal, +{props.liveMacroDelta.fat_g.toFixed(1)} g fat
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
