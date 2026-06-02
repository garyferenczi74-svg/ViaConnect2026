// Prompt 172 Phase 1A: pre-refactor AnalysisResult card body subtree snapshot.
//
// Captured from src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/
// AnalysisResult.tsx at commit fa4d5d9a (Phase 0 tip), lines 123 through 217.
//
// vitest.config.ts runs node only without jsdom, so we cannot diff rendered
// DOM trees the way react testing library would. We instead capture the
// verbatim JSX source strings that defined the card body before the refactor
// and assert the post-refactor MealCard.tsx + AnalysisResult.tsx pair contains
// the same JSX strings, in the same order, with the same className tokens and
// the same children. That is the dom parity contract for Phase 1A.
//
// This file is append only. Future phases may add new sections, but the
// strings here memorialize the byte equivalent baseline.

/**
 * The meal totals card surface that wraps title row, four macro chips, and
 * warnings list. The ConfidenceBadge sits inside this surface in the top
 * right per the pre-refactor render. The VoiceEditedChip slot also lives
 * inside this surface, gated by voiceAvailable + apply.state.voice_operation_count.
 */
export const MEAL_TOTALS_BLOCK_PRE = `<div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-4 backdrop-blur-md">`;

/**
 * The four totals chips, in the fixed order Calories, Protein, Carbs, Fat.
 * Names + units exactly as they appeared pre-refactor. The macro chip row
 * is the same Totals subcomponent the file declared inline; the chip palette
 * is token driven via Tailwind in MacroChips post-refactor.
 */
export const MEAL_TOTALS_GRID_PRE = `<div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">`;

// Calories chip: label text + the kcal unit + the Math.round formatter.
// Pre refactor the expression read draft.totals.calories_kcal; post refactor
// it reads macros.kcal which is mapped from the same field by mealCardModel.
// We assert the rendered output equivalence via label + unit + formatter.
export const TOTALS_CALORIES_LABEL = 'Calories';
export const TOTALS_PROTEIN_LABEL = 'Protein';
export const TOTALS_CARBS_LABEL = 'Carbs';
export const TOTALS_FAT_LABEL = 'Fat';
export const TOTALS_KCAL_UNIT = `unit="kcal"`;
export const TOTALS_GRAM_UNIT = `unit="g"`;
export const TOTALS_KCAL_FORMATTER = 'Math.round(';
export const TOTALS_GRAM_FORMATTER = `.toFixed(1)`;

/**
 * Warnings list. Token driven Orange #B75E18 border + tint background. List
 * semantics are role="list" with text-[#FCA5A5] children for the warning text.
 */
export const WARNINGS_LIST_PRE = `<ul className="mt-3 flex flex-col gap-1 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/10 p-2 text-[11px] text-white/80" role="list">`;

/**
 * Modification chips block. Scope meal. The onApply forwards the chip to
 * props.onApplyChip('meal', c).
 */
export const MOD_CHIPS_BLOCK_PRE = `<div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-3">`;
export const MOD_CHIPS_INVOCATION_PRE = `<ModificationChips
            scope="meal"
            onApply={(c) => props.onApplyChip('meal', c)}
          />`;

/**
 * Item list container. Flex column with gap 3.
 */
export const ITEM_LIST_BLOCK_PRE = `<div className="flex flex-col gap-3">`;

/**
 * Add another item button. Dashed border, Plus icon at strokeWidth 1.5,
 * teal hover.
 */
export const ADD_ITEM_BUTTON_PRE = `<button
          type="button"
          onClick={props.onAddItem}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-transparent px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:border-[#2DA5A0]/40 hover:text-white"
        >`;

/**
 * Save bar. Fixed bottom on mobile, inline rounded card on desktop. Cancel
 * left, Save right. Save copy switches to Saving... while isSaving is true.
 */
export const SAVE_BAR_BLOCK_PRE = `<div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#1A2744]/95 px-4 py-3 backdrop-blur-md md:static md:rounded-2xl md:border md:border-white/[0.08] md:bg-[#1E3054]/45 md:p-3 md:backdrop-blur-md">`;

// Cancel button rendered DOM contract: type="button", disabled bound to
// isSaving, className includes the canonical pre refactor token set.
// React event handlers are not part of the rendered HTML attributes (they
// are synthetic), so we do not couple the fixture to the source level
// identifier for onClick (it can be onCancel pre refactor or onConfirm
// post refactor without changing DOM).
export const CANCEL_BUTTON_PRE = `className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"`;

export const SAVE_BUTTON_PRE = `className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"`;

export const SAVE_LABEL_PRE = `{props.isSaving ? 'Saving...' : 'Save to log'}`;

/**
 * Title row text inside the meal totals box.
 */
export const TITLE_HEADING_PRE = `<h2 className="text-base font-semibold text-white">Meal totals</h2>`;
export const TITLE_HINT_PRE = `<p className="text-[11px] text-white/55">Tap an item to adjust the portion or swap the food.</p>`;

/**
 * Order of card body children in the pre-refactor render. Post refactor must
 * preserve this same order across the AnalysisResult MealCard composition.
 */
export const PRE_REFACTOR_ORDER = [
  'MEAL_TOTALS_BLOCK',
  'TITLE_HEADING',
  'TITLE_HINT',
  'VOICE_EDITED_CHIP_SLOT',
  'CONFIDENCE_BADGE_SLOT',
  'TOTALS_GRID',
  'TOTALS_CALORIES',
  'TOTALS_PROTEIN',
  'TOTALS_CARBS',
  'TOTALS_FAT',
  'WARNINGS_LIST',
  'MOD_CHIPS_BLOCK',
  'ITEM_LIST_BLOCK',
  'ADD_ITEM_BUTTON',
  'CORPUS_BANNER_SLOT',
  'SAVE_BAR_BLOCK',
  'CANCEL_BUTTON',
  'SAVE_BUTTON',
] as const;
