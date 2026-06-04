'use client';

// =============================================================================
// Prompt 173a Phase 8 follow-up (2026-06-04): CAQ dietary choice selector.
//
// Captures the user's dietary choice so the Gordon macro engine can apply
// the 173a Section 5 per-diet fat + carbohydrate split (and the keto
// inversion). Six choices per 173a 4.2:
//   * Balanced (the default, used when the user does not pick)
//   * Mediterranean
//   * Low-carb
//   * Keto
//   * Higher-carb
//   * Plant-based
//
// Lives inside the CAQ Phase 2 (Lifestyle) wellness goals block, below the
// Weight Goals subsection. The parent persists the choice on phase 3 save;
// /api/nutrition/generate-targets reads it on the next recompute and writes
// the effective value to nutrition_targets.dietary_choice.
//
// Tone: calm, descriptive, no marketing language. Each card describes what
// the engine will do (where fat / carbs come from) so the user can pick
// informed. NO em dashes or en dashes.
// =============================================================================

import { Leaf, UtensilsCrossed, Salad, Wheat, Drumstick, Beef } from 'lucide-react';
import type { DietaryChoice } from '@/lib/gordon/macro-config';

interface ChoiceDef {
  id: DietaryChoice;
  label: string;
  description: string;
  Icon: typeof Leaf;
}

const CHOICES: ReadonlyArray<ChoiceDef> = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Even split across carbs, fat, and protein. The default when you are not sure.',
    Icon: UtensilsCrossed,
  },
  {
    id: 'mediterranean',
    label: 'Mediterranean',
    description: 'Higher healthy fats from olive oil, fish, and nuts. Vegetables anchor the plate.',
    Icon: Salad,
  },
  {
    id: 'low_carb',
    label: 'Low-carb',
    description: 'Carbs capped at a quarter of your calories. Freed calories shift to fat.',
    Icon: Beef,
  },
  {
    id: 'keto',
    label: 'Keto',
    description: 'Net carbs anchored at 30 g per day. Fat fills the rest of your calorie target.',
    Icon: Drumstick,
  },
  {
    id: 'higher_carb',
    label: 'Higher-carb',
    description: 'More room for whole grains, fruit, and starchy vegetables. Fat sits lower.',
    Icon: Wheat,
  },
  {
    id: 'plant_based',
    label: 'Plant-based',
    description: 'Same macro split as Balanced. Plant sources for protein and fat where possible.',
    Icon: Leaf,
  },
];

export interface DietaryChoiceSelectorProps {
  readonly value: DietaryChoice | null;
  readonly onChange: (value: DietaryChoice) => void;
}

export function DietaryChoiceSelector({ value, onChange }: DietaryChoiceSelectorProps) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface/60 p-4 md:p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-white/80">Dietary Choice</p>
        <p className="text-xs text-white/40 mt-0.5">
          Optional. Pick the eating style closest to how you want to eat. This drives how your fat and carbohydrate targets are split.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Dietary choice"
        className="grid grid-cols-1 gap-2 md:grid-cols-2"
      >
        {CHOICES.map((c) => {
          const selected = value === c.id;
          const Icon = c.Icon;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(c.id)}
              className={`group flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-copper/40 ${
                selected
                  ? 'border-copper/60 bg-copper/10'
                  : 'border-dark-border bg-dark-surface hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                  selected ? 'bg-copper/20 text-copper' : 'bg-white/[0.04] text-white/55'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="flex-1 space-y-0.5">
                <span
                  className={`block text-[13px] font-medium ${
                    selected ? 'text-copper' : 'text-white/85'
                  }`}
                >
                  {c.label}
                </span>
                <span className="block text-[11px] leading-relaxed text-white/55">
                  {c.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DietaryChoiceSelector;
