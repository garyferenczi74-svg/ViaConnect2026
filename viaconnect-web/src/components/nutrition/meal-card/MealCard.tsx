'use client';

// Prompt 172 Phase 2 (172b + 172c): presentational MealCard with state
// machine, safety mode, degraded service, microcopy layer, and the post
// save BOS line slot.
//
// Phase 1B contracts preserved:
//   1. Pre / post save state machine (mealId + mealQualityScore).
//   2. Microcopy layer (172a); zero hardcoded user facing strings.
//   3. Safety mode (170c section 8.4 silent ratio mode contract).
//   4. 170c section 10.3 degraded service messaging.
//
// Phase 2 additions:
//   5. Post save BOS line fetch via /api/nutrition/bos-line/[mealId].
//      Pre save -> slot renders nothing (no skeleton, no placeholder).
//      Post save and BOS_LINE_RENDERING_ENABLED -> fetch the line.
//      Loading / error / null body -> slot stays empty (quiet enhancement,
//      not a blocker per spec 5.3).
//      Render order is items -> chips -> BOS line -> acknowledgement ->
//      action row -> FDA disclaimer per spec 5.3.
//   6. Post save action row real handlers. onConfirm closes the review
//      affordance, onEdit routes through the existing MealItemEditor flow
//      (the parent provides the handler), onSplit is gated behind the
//      BOS_LINE_SPLIT_PLATE_ENABLED kill switch until the workflow lands.
//
// Hard rules honored: no em or en dashes, no emojis, no any, Lucide
// strokeWidth 1.5, brand tokens only.

import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Edit3, Plus, Save, Scissors, X } from 'lucide-react';
import { FdaDisclaimer } from '@/components/compliance/FdaDisclaimer';
import { ModificationChips } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/ModificationChips';
import { MealItemCard } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/MealItemCard';
import { getMicrocopy } from '@/lib/nutrition/microcopy';
import type { MicrocopyKey, MicrocopyVariant } from '@/lib/nutrition/microcopy';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';
import type { BosLine } from '@/lib/nutrition/bos-line/types';
import type {
  CookingOilSelection,
} from '@/lib/nutrition/cooking-oil/types';
import type {
  MealItemDraft,
  FoodSwapReplacement,
  ModifierChip,
  MealDraft,
  SaveResponse,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { DegradedServiceKind, MealCardModel } from './MealCard.types';
import { MacroChips } from './MacroChips';

/**
 * Phase 2 (172b): bosLine fetch state machine.
 *   idle      pre save or kill switch off; no fetch attempted, no render.
 *   loading   fetch in flight; slot stays empty (quiet enhancement).
 *   resolved  fetch returned a BosLine; render copy in the slot.
 *   hidden    fetch returned 200 + null body; slot stays empty.
 *   error     fetch failed; slot silently empty (no error UI per spec 5.3).
 */
type BosLineState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resolved'; line: BosLine }
  | { status: 'hidden' }
  | { status: 'error' };

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
   * MealCard does not call this itself, the orchestrator does.
   */
  onSaveResponse: (resp: SaveResponse) => void;
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
  /**
   * Prompt 177g (2026-06-07): tap-to-edit per-item nutrient correction.
   * Optional so MealCard renders without it for callers that have not
   * adopted the editable tile pattern yet.
   */
  onNutrientEdit?: (
    itemId: string,
    field: 'calories_kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g' | 'sugar_g',
    value: number,
  ) => void;
  /** Save bar disabled state during async save. */
  isSaving: boolean;
}

function variantFor(safetyMode: boolean): MicrocopyVariant {
  return safetyMode ? 'safety_mode' : 'normal';
}

/**
 * 170c section 10.3 degraded service body copy lookup. Returns the canonical
 * microcopy key for a given degraded service kind. When kind is 'none' the
 * standard low_confidence_body or error_body falls through at the call
 * site.
 */
function degradedKeyFor(kind: DegradedServiceKind): MicrocopyKey | null {
  switch (kind) {
    case 'logmeal_hard_stop':
      return 'degraded.logmeal_hard_stop';
    case 'gemini_low_confidence':
      return 'degraded.gemini_low_confidence';
    case 'claude_tertiary_used':
      return 'degraded.claude_tertiary_used';
    case 'none':
      return null;
  }
}

function acknowledgementKeyFor(
  confidence: MealCardModel['recognitionConfidence'],
): MicrocopyKey {
  switch (confidence) {
    case 'high':
      return 'acknowledgement.high';
    case 'medium':
      return 'acknowledgement.medium';
    case 'low':
      return 'acknowledgement.low';
  }
}

export function MealCard(props: MealCardProps) {
  const { model, draft } = props;
  const variant = variantFor(model.safetyMode);

  // Pre save vs post save state machine per spec 5.1 + 5.2.
  const isPostSave = model.mealId !== null && model.mealQualityScore !== null;

  // Phase 2 (172b): post save BOS line fetch. Kill switch off keeps the
  // slot empty and skips the round trip. The kill switch is read at
  // render time so a runtime flip propagates the next time the parent
  // re renders the card. The 5 minute server cache header keeps a remount
  // during a single review session from re fetching.
  const bosLineEnabled = isKillSwitchEnabled('BOS_LINE_RENDERING_ENABLED');
  const bosLineMealId = isPostSave ? model.mealId : null;
  const [bosLineState, setBosLineState] = useState<BosLineState>({ status: 'idle' });

  useEffect(() => {
    if (bosLineMealId === null || !bosLineEnabled) {
      setBosLineState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setBosLineState({ status: 'loading' });

    async function run() {
      try {
        const res = await fetch(`/api/nutrition/bos-line/${bosLineMealId}`, {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
        });
        if (!res.ok) {
          if (!cancelled) setBosLineState({ status: 'error' });
          return;
        }
        const body = (await res.json()) as BosLine | null;
        if (cancelled) return;
        if (body === null) {
          setBosLineState({ status: 'hidden' });
          return;
        }
        setBosLineState({ status: 'resolved', line: body });
      } catch {
        if (!cancelled) setBosLineState({ status: 'error' });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [bosLineMealId, bosLineEnabled]);

  // The model.bosLine slot stays the source of truth for the initial
  // server hydration path; the fetched line takes precedence once it lands.
  const resolvedBosLine: BosLine | null =
    bosLineState.status === 'resolved' ? bosLineState.line : model.bosLine;

  // Phase 2 (172c): Split plate is stubbed until the workflow ships.
  // BOS_LINE_SPLIT_PLATE_ENABLED gates the affordance; when off the button
  // renders disabled with the stub tooltip copy.
  const splitEnabled = isKillSwitchEnabled('BOS_LINE_SPLIT_PLATE_ENABLED');

  // 170c section 10.3 degraded service body copy gating. When the upstream
  // pipeline flags a degraded provider AND the
  // PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED kill switch is true we render
  // the canonical kind copy; when the kill switch is off the card silently
  // falls back to the standard low_confidence_body microcopy so a degraded
  // signal never leaks user facing if compliance disables the surface
  // (170c §10.7). Phase 1B only renders this body block in the meal totals
  // surface when the recognitionConfidence is low (a proxy for the
  // low_confidence state until the analyzer exposes the state directly).
  const degradedMessagingEnabled = isKillSwitchEnabled('PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED');
  const degradedKey = model.degradedService && degradedMessagingEnabled
    ? degradedKeyFor(model.degradedServiceKind)
    : null;
  const showDegradedBlock = model.recognitionConfidence === 'low';
  const degradedBodyCopy = degradedKey
    ? getMicrocopy(degradedKey, variant)
    : getMicrocopy('state.low_confidence_body', variant);

  return (
    <>
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-4 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">{getMicrocopy('title.totals', variant)}</h2>
              <p className="text-[11px] text-white/55">{getMicrocopy('title.totals_hint', variant)}</p>
            </div>
            {props.voiceEditedChip}
          </div>
          <div className="flex items-center gap-2">
            {/*
              Post save quality score chip. Per 170c section 8.4 the chip is
              suppressed in safety mode even if mealQualityScore is somehow
              non null. The mapper already nulls it; this is the second
              line of defense.
            */}
            {isPostSave && !model.safetyMode && (
              <div
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#2DA5A0]/15 px-2 py-1 text-[11px] font-semibold text-white"
                data-meal-quality-score
              >
                <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                {model.mealQualityScore}
              </div>
            )}
            {props.confidenceBadge}
          </div>
        </div>
        <MacroChips macros={model.macros} safetyMode={model.safetyMode} />

        {/*
          Phase 2 (172b): BOS line slot. Renders above the acknowledgement
          per spec section 5.3 visual order. Pre save the slot is empty
          (resolvedBosLine null). Loading is also empty (quiet enhancement
          per spec 5.3). Error is empty (no error UI). Safety mode pulls
          the safety_mode variant from the server resolver so the copy is
          already non quantitative by the time it arrives client side.
        */}
        {resolvedBosLine !== null && (
          <p
            className="mt-3 text-[12px] text-white/80"
            role="status"
            aria-live="polite"
            data-bos-line
          >
            {resolvedBosLine.copy}
          </p>
        )}

        {/*
          Post save acknowledgement line per spec 5.2 + brief. Keyed by
          recognitionConfidence so high reads as solid, medium as detail,
          low as we will sharpen the read next time. Safety mode variants
          are food positive non optimization phrasing. Renders below the
          BOS line so the score signal lands first, then the human reply.
        */}
        {isPostSave && (
          <p
            className="mt-3 text-[12px] text-white/80"
            role="status"
            aria-live="polite"
            data-acknowledgement-line
          >
            {getMicrocopy(acknowledgementKeyFor(model.recognitionConfidence), variant)}
          </p>
        )}

        {/*
          170c section 10.3 degraded service notice. When confidence is low
          and the pipeline has flagged degraded service, the canonical kind
          copy renders below the totals. When no degraded signal is present
          but confidence is still low, the standard non degraded fallback
          microcopy renders so the user knows to review carefully.
        */}
        {showDegradedBlock && (
          <p
            className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-[11px] text-white/80"
            role="status"
            data-degraded-service-notice
          >
            {degradedBodyCopy}
          </p>
        )}

        {draft.warnings.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/10 p-2 text-[11px] text-white/80" role="list">
            {draft.warnings.map((w, i) => (
              <li key={i} className="text-[#FCA5A5]">{w}</li>
            ))}
          </ul>
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
            safetyMode={model.safetyMode}
            onPortionChange={(g) => props.onPortionChange(item.id, g)}
            onFoodSwap={(r) => props.onFoodSwap(item.id, r)}
            onCookingOilChange={(s) => props.onCookingOilChange(item.id, s)}
            onApplyChip={(c) => props.onApplyChip(item.id, c)}
            onRemove={() => props.onRemoveItem(item.id)}
            onMarkVerified={() => props.onMarkVerified(item.id)}
            onNutrientEdit={
              props.onNutrientEdit
                ? (field, value) => props.onNutrientEdit?.(item.id, field, value)
                : undefined
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={props.onAddItem}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-transparent px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:border-[#2DA5A0]/40 hover:text-white"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        {getMicrocopy('action.add_item', variant)}
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
            {getMicrocopy('action.cancel', variant)}
          </button>
          {isPostSave ? (
            // Post save: action row carries Confirm (the inline ack), Edit
            // (routes to the existing MealItemEditor), and Split (gated on
            // BOS_LINE_SPLIT_PLATE_ENABLED until the workflow ships).
            // The previously dominant "Save" cta is replaced by Edit as the
            // primary; Confirm sits as a quiet acknowledgement to the right
            // of Edit so the post save surface still has a low key "got it"
            // button if the user just wants to close out review.
            <>
              <button
                type="button"
                onClick={props.onEdit}
                disabled={props.isSaving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
                data-post-save-edit
              >
                <Edit3 className="h-4 w-4" strokeWidth={1.5} />
                {getMicrocopy('action.edit', variant)}
              </button>
              <button
                type="button"
                onClick={splitEnabled ? props.onSplit : undefined}
                disabled={props.isSaving || !splitEnabled}
                title={splitEnabled ? undefined : getMicrocopy('action.split', variant)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                data-post-save-split
              >
                <Scissors className="h-4 w-4" strokeWidth={1.5} />
                {getMicrocopy('action.split', variant)}
              </button>
              <button
                type="button"
                onClick={props.onConfirm}
                disabled={props.isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                data-post-save-confirm
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {getMicrocopy('action.confirm', variant)}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={props.onConfirm}
              disabled={props.isSaving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" strokeWidth={1.5} />
              {props.isSaving ? getMicrocopy('action.saving', variant) : getMicrocopy('action.save', variant)}
            </button>
          )}
        </div>
      </div>

      <FdaDisclaimer slot="card-footer" />
    </>
  );
}

export default MealCard;
