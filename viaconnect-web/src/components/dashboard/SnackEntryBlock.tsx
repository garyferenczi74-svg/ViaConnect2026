'use client';

// Prompt #168c section 2.2: snack entry wrapper. Two states.
//   Active draft: renders the full QuickLogEntryBlock with "Snack N" label.
//   Saved (collapsed): compact summary row with index, name or label, calories,
//   quality tier badge.
// Re-expand-and-edit on saved snacks deferred to a 168c follow-up; UPDATE
// path requires distinct handler from INSERT and re-triggering Gordon score.

import { Edit3 } from 'lucide-react';
import type { Meal, NutritionTargets, MealDistribution } from '@/lib/gordon/types';
import type { QuickLogDraft } from '@/components/meals/QuickLogModal';
import { TIER_BOUNDARIES } from '@/lib/gordon/constants';
import { QuickLogEntryBlock } from './QuickLogEntryBlock';

export interface SnackEntryBlockProps {
  readonly snackIndex: number;
  readonly targets: NutritionTargets;
  readonly mealDistribution?: MealDistribution;
  readonly snacksLoggedToday: number;
  // Active draft mode: no saved meal yet.
  readonly savedMeal?: Meal;
  readonly onSaveDraft?: (draft: QuickLogDraft) => void | Promise<void>;
  readonly onCancelDraft?: () => void;
  readonly onRequestEdit?: (mealId: string) => void;
}

function tierColor(tier: Meal['qualityTier'] | null): string {
  if (!tier) return '#718096';
  const found = TIER_BOUNDARIES.find((b) => b.tier === tier);
  return found ? found.colorHex : '#718096';
}

export function SnackEntryBlock(props: SnackEntryBlockProps) {
  const {
    snackIndex,
    targets,
    mealDistribution,
    snacksLoggedToday,
    savedMeal,
    onSaveDraft,
    onCancelDraft,
    onRequestEdit,
  } = props;

  if (savedMeal) {
    const label = savedMeal.mealName ?? `Snack ${snackIndex}`;
    const tier = savedMeal.qualityTier;
    const score = savedMeal.qualityScore;
    const calories = Math.round(savedMeal.caloriesKcal);
    return (
      <button
        type="button"
        onClick={() => onRequestEdit?.(savedMeal.mealId)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1E3054]/40 px-4 py-3 text-left transition-colors hover:bg-[#1E3054]/60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2DA5A0]/20 text-[12px] font-semibold text-[#2DA5A0]">
            {snackIndex}
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium text-white">{label}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-[12px] text-white/65">{calories} kcal</span>
          {score !== null && tier !== null ? (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: tierColor(tier) }}
            >
              {score}
            </span>
          ) : (
            <span className="text-[11px] text-white/45">n/a</span>
          )}
          <Edit3 className="h-4 w-4 text-white/45" strokeWidth={1.5} />
        </span>
      </button>
    );
  }

  return (
    <QuickLogEntryBlock
      mealType="snack"
      labelOverride={`Snack ${snackIndex}`}
      targets={targets}
      mealDistribution={mealDistribution}
      snacksLoggedToday={snacksLoggedToday}
      onSave={onSaveDraft ?? (async () => undefined)}
      onCancel={onCancelDraft}
      hideCancelButton={!onCancelDraft}
    />
  );
}

export default SnackEntryBlock;
