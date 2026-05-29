'use client';

// Prompt #170 Phase 1l: review screen orchestrator.
//
// Renders the totals header (with the meal confidence badge), the warnings
// list, the per-item card list, an Add item button, a whole-meal chip row,
// the corpus opt-in banner, and a sticky save bar (sticky on mobile, inline
// on desktop).
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { Plus, Save, X } from 'lucide-react';
import type { CookingOilSelection } from '@/lib/nutrition/cooking-oil/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { MealItemCard } from './MealItemCard';
import { ModificationChips } from './ModificationChips';
import { CorpusOptInBanner } from './CorpusOptInBanner';
import { MealTypePicker } from './MealTypePicker';
import { classifyConfidence } from './types';
import type {
  MealDraft,
  FoodSwapReplacement,
  ModifierChip,
  MealType,
} from './types';

interface AnalysisResultProps {
  draft: MealDraft;
  userId: string | null;
  corpusOptedIn: boolean;
  corpusDismissed: boolean;
  isSaving: boolean;
  mealType: MealType;
  onMealTypeChange: (next: MealType) => void;
  onCorpusDismiss: () => void;
  onCorpusOptIn: () => void;
  onPortionChange: (itemId: string, grams: number) => void;
  onFoodSwap: (itemId: string, replacement: FoodSwapReplacement) => void;
  onCookingOilChange: (itemId: string, selection: CookingOilSelection) => void;
  onApplyChip: (itemId: string | 'meal', chip: ModifierChip) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onMarkVerified: (itemId: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AnalysisResult(props: AnalysisResultProps) {
  const { draft } = props;
  const band = classifyConfidence(draft.meal_confidence);

  return (
    <div className="flex flex-col gap-3 pb-24 md:pb-0">
      {/* Meal type picker */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/55">
          Meal type
        </div>
        <MealTypePicker value={props.mealType} onChange={props.onMealTypeChange} />
      </div>

      {/* Totals header */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-4 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Meal totals</h2>
            <p className="text-[11px] text-white/55">Tap an item to adjust the portion or swap the food.</p>
          </div>
          <ConfidenceBadge band={band} score={draft.meal_confidence} label="meal" size="md" />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
          <Totals label="Calories" value={Math.round(draft.totals.calories_kcal)} unit="kcal" />
          <Totals label="Protein"  value={Number(draft.totals.protein_g.toFixed(1))} unit="g" />
          <Totals label="Carbs"    value={Number(draft.totals.carbs_g.toFixed(1))} unit="g" />
          <Totals label="Fat"      value={Number(draft.totals.fat_g.toFixed(1))} unit="g" />
        </div>

        {draft.warnings.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/10 p-2 text-[11px] text-white/80" role="list">
            {draft.warnings.map((w, i) => (
              <li key={i} className="text-[#FCA5A5]">{w}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Whole-meal chips */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-3">
        <ModificationChips
          scope="meal"
          onApply={(c) => props.onApplyChip('meal', c)}
        />
      </div>

      {/* Item list */}
      <div className="flex flex-col gap-3">
        {draft.items.map((item) => (
          <MealItemCard
            key={item.id}
            item={item}
            onPortionChange={(g) => props.onPortionChange(item.id, g)}
            onFoodSwap={(r) => props.onFoodSwap(item.id, r)}
            onCookingOilChange={(s) => props.onCookingOilChange(item.id, s)}
            onApplyChip={(c) => props.onApplyChip(item.id, c)}
            onRemove={() => props.onRemoveItem(item.id)}
            onMarkVerified={() => props.onMarkVerified(item.id)}
          />
        ))}
      </div>

      {/* Add item */}
      <button
        type="button"
        onClick={props.onAddItem}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-transparent px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:border-[#2DA5A0]/40 hover:text-white"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        Add another item
      </button>

      {/* Corpus opt-in */}
      {props.userId !== null && (
        <CorpusOptInBanner
          userId={props.userId}
          alreadyOptedIn={props.corpusOptedIn}
          dismissed={props.corpusDismissed}
          onDismiss={props.onCorpusDismiss}
          onOptIn={props.onCorpusOptIn}
        />
      )}

      {/* Save bar: sticky on mobile, inline on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#1A2744]/95 px-4 py-3 backdrop-blur-md md:static md:rounded-2xl md:border md:border-white/[0.08] md:bg-[#1E3054]/45 md:p-3 md:backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 md:max-w-none">
          <button
            type="button"
            onClick={props.onCancel}
            disabled={props.isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.isSaving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" strokeWidth={1.5} />
            {props.isSaving ? 'Saving...' : 'Save to log'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface TotalsProps {
  label: string;
  value: number;
  unit: string;
}

function Totals({ label, value, unit }: TotalsProps) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2 py-2">
      <div className="text-white/45">{label}</div>
      <div className="mt-0.5 font-mono text-base text-white">{value}</div>
      <div className="text-[10px] text-white/45">{unit}</div>
    </div>
  );
}
