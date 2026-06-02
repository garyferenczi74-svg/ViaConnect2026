'use client';

// Prompt 172 Phase 1A: presentational MealCard.
//
// One presentational React component that consumes a MealCardModel and
// renders the itemized confirmation card body. It fetches nothing, scores
// nothing, accesses Supabase nowhere. Pre save the orchestrator
// (AnalysisResult.tsx) passes a model with mealId null + mealQualityScore
// null; post save the orchestrator hands a SaveResponse to the mapper and
// renders the next state.
//
// The card body subtree extracted from AnalysisResult.tsx pre refactor at
// lines 123 through 217. The byte equivalent DOM contract is enforced by
// MealCard.dom-parity.test.ts. The one net new addition is FdaDisclaimer at
// the card footer; spec 5.3 mandates it and 170c kill switch gates it.
//
// Two slots are owned by the orchestrator and passed in as ReactNode:
//   confidenceBadge  - the ConfidenceBadge with classifyConfidence wiring
//   voiceEditedChip  - the VoiceEditedChip from the voice session
// The CorpusOptInBanner is not a slot here; AnalysisResult continues to
// render it as a sibling between MealCard and the screen orchestration.
// Same for the photo thumbnail and the meal type picker.
//
// Wait. Per spec section 6 v3 the card body subtree includes the corpus
// banner. Per the Phase 1A brief the corpus banner stays in
// AnalysisResult. We honor the brief; AnalysisResult renders the corpus
// banner OUTSIDE the MealCard subtree (after the items list, before the
// save bar). To keep the DOM byte equivalent, the corpus banner sits as a
// MealCard slot that AnalysisResult builds; MealCard renders that slot in
// the same position the pre refactor banner occupied.
//
// Hard rules honored: no em or en dashes, no emojis, no any, Lucide
// strokeWidth 1.5, brand tokens only.

import type { ReactNode } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { FdaDisclaimer } from '@/components/compliance/FdaDisclaimer';
import { ModificationChips } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/ModificationChips';
import { MealItemCard } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/MealItemCard';
import type {
  CookingOilSelection,
} from '@/lib/nutrition/cooking-oil/types';
import type {
  MealItemDraft,
  FoodSwapReplacement,
  ModifierChip,
  MealDraft,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { MealCardModel } from './MealCard.types';
import { MacroChips } from './MacroChips';

export interface MealCardProps {
  /** Mapped view model from mealCardModel.toMealCardModel. */
  model: MealCardModel;
  /**
   * The raw MealDraft passed through so per item rendering can wire the
   * MealItemCard without re-deriving the upstream shape. The presentational
   * card never mutates this; it just iterates and forwards events up.
   */
  draft: MealDraft;
  /** Slot for the ConfidenceBadge built by AnalysisResult. */
  confidenceBadge: ReactNode;
  /**
   * Slot for the VoiceEditedChip the voice session in AnalysisResult emits
   * when voice operations have applied. Null when voice is unavailable or
   * no operations have run.
   */
  voiceEditedChip: ReactNode;
  /**
   * Slot for the CorpusOptInBanner. AnalysisResult builds the banner with
   * userId + opted in state + dismiss/optin handlers and threads it here so
   * MealCard can place it in the byte equivalent position between the
   * add item button and the save bar.
   */
  corpusBanner: ReactNode;
  /** Spec 5.5: confirm fires save through the existing log-meal route. */
  onConfirm: () => void;
  /** Spec 5.5: edit routes to the existing MealItemEditor (172c wires UX). */
  onEdit: () => void;
  /** Spec 5.5: split routes through the existing edit + log path (172c). */
  onSplit: () => void;
  /**
   * Spec 5.5: orchestrator threads SaveResponse here when log-meal returns;
   * MealCard does not call this itself in 1A, but the type is part of the
   * 1A contract so 172b + 172c can wire later without breaking callers.
   */
  onSaveResponse: (resp: import('@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types').SaveResponse) => void;
  /** Cancel handler the pre refactor save bar wired to props.onCancel. */
  onCancel: () => void;
  /** Add another item handler the pre refactor button wired to props.onAddItem. */
  onAddItem: () => void;
  /** Per item event handlers forwarded to MealItemCard children. */
  onPortionChange: (itemId: string, grams: number) => void;
  onFoodSwap: (itemId: string, replacement: FoodSwapReplacement) => void;
  onCookingOilChange: (itemId: string, selection: CookingOilSelection) => void;
  onApplyChip: (itemId: string | 'meal', chip: ModifierChip) => void;
  onRemoveItem: (itemId: string) => void;
  onMarkVerified: (itemId: string) => void;
  /** Save bar disabled state during async save. */
  isSaving: boolean;
}

export function MealCard(props: MealCardProps) {
  const { model, draft } = props;
  // TODO 1B: when model.safetyMode is true, swap MacroChips into its ratio
  // variant per 170c section 8.4. 1A renders the absolute kcal + grams in
  // every state to preserve the byte equivalent DOM contract.
  // bosLine is null in 1A; the slot is reserved and 172b wires the resolver.
  return (
    <>
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-4 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">Meal totals</h2>
              <p className="text-[11px] text-white/55">Tap an item to adjust the portion or swap the food.</p>
            </div>
            {props.voiceEditedChip}
          </div>
          {props.confidenceBadge}
        </div>
        <MacroChips macros={model.macros} safetyMode={model.safetyMode} />

        {draft.warnings.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/10 p-2 text-[11px] text-white/80" role="list">
            {draft.warnings.map((w, i) => (
              <li key={i} className="text-[#FCA5A5]">{w}</li>
            ))}
          </ul>
        )}

        {model.bosLine && (
          <p className="mt-3 text-[11px] text-white/70">{model.bosLine.copy}</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-3">
        <ModificationChips
          scope="meal"
          onApply={(c) => props.onApplyChip('meal', c)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {draft.items.map((item: MealItemDraft) => (
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

      <button
        type="button"
        onClick={props.onAddItem}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-transparent px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:border-[#2DA5A0]/40 hover:text-white"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        Add another item
      </button>

      {props.corpusBanner}

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
            onClick={props.onConfirm}
            disabled={props.isSaving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" strokeWidth={1.5} />
            {props.isSaving ? 'Saving...' : 'Save to log'}
          </button>
        </div>
      </div>

      <FdaDisclaimer slot="card-footer" />
    </>
  );
}

export default MealCard;
