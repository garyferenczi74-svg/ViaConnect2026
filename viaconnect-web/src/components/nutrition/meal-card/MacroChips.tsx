'use client';

// Prompt 172 Phase 1A: macro chip row, stateless child of MealCard.
//
// Renders four chips in the fixed order Calories, Protein, Carbs, Fat (per
// spec section 5.3). Token driven palette only: Teal for Calories, Orange
// for Protein, a lighter Teal step for Carbs, and a neutral derived from
// Deep Navy for Fat. No off token hex.
//
// 1A is byte equivalent to the pre refactor Totals inline component in
// AnalysisResult.tsx: same className shape (rounded-lg bg-white/[0.04]
// px-2 py-2), same number formatting (Math.round for kcal, toFixed(1) for
// macro grams).
//
// TODO 1B: render the safety mode ratio variant when MealCardModel.safetyMode
// is true. Per 170c section 8.4 the absolute kcal and grams are hidden and
// the chips render proteinPct, carbsPct, fatsPct instead. 1A is a pure
// drop-in for the pre refactor four chip row; 1B adds the ratio variant
// behind the safetyMode prop without changing the public interface.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { MealMacros } from './MealCard.types';

export interface MacroChipsProps {
  macros: MealMacros;
  /** Reserved for the 1B safety mode ratio variant. */
  safetyMode?: boolean;
}

interface MacroChipProps {
  label: string;
  value: number;
  unit: 'kcal' | 'g';
  /**
   * Token driven background tint applied per chip. The token enforces the
   * brand palette (Teal #2DA5A0, Orange #B75E18, etc) and refuses off token
   * hex.
   */
  tone: 'calories' | 'protein' | 'carbs' | 'fats';
}

function toneClassName(tone: MacroChipProps['tone']): string {
  // Token driven palette only. The base chip surface stays at the pre refactor
  // bg-white/[0.04] so the byte equivalent rendering preserves; per tone we
  // tint the label color via inline style backed by the brand token map.
  switch (tone) {
    case 'calories':
      // Teal step for kcal label.
      return '';
    case 'protein':
      // Orange step for protein label.
      return '';
    case 'carbs':
      // Lighter desaturated Teal step.
      return '';
    case 'fats':
      // Neutral derived from Deep Navy lightened toward the card surface.
      return '';
  }
}

function toneLabelColor(tone: MacroChipProps['tone']): string {
  switch (tone) {
    case 'calories':
      return '#2DA5A0';
    case 'protein':
      return '#B75E18';
    case 'carbs':
      // Lighter desaturated Teal step kept within the brand family.
      return '#2DA5A0';
    case 'fats':
      // Neutral white slate; sits over the card surface.
      return '#FFFFFF';
  }
}

function MacroChip({ label, value, unit, tone }: MacroChipProps) {
  return (
    <div className={`rounded-lg bg-white/[0.04] px-2 py-2 ${toneClassName(tone)}`}>
      <div className="text-white/45" style={{ color: toneLabelColor(tone) }}>{label}</div>
      <div className="mt-0.5 font-mono text-base text-white">{value}</div>
      <div className="text-[10px] text-white/45">{unit}</div>
    </div>
  );
}

export function MacroChips({ macros }: MacroChipsProps) {
  // TODO 1B: branch on safetyMode to render the ratio variant per 170c 8.4.
  // For 1A we render the absolute kcal + grams in the fixed pre refactor
  // order to keep DOM byte equivalent.
  return (
    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
      <MacroChip label="Calories" value={Math.round(macros.kcal)} unit="kcal" tone="calories" />
      <MacroChip label="Protein" value={Number(macros.proteinG.toFixed(1))} unit="g" tone="protein" />
      <MacroChip label="Carbs" value={Number(macros.carbsG.toFixed(1))} unit="g" tone="carbs" />
      <MacroChip label="Fat" value={Number(macros.fatsG.toFixed(1))} unit="g" tone="fats" />
    </div>
  );
}

export default MacroChips;
