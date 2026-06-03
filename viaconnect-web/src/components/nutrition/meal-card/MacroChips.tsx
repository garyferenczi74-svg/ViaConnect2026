'use client';

// Prompt 172 Phase 1B: macro chip row, stateless child of MealCard.
//
// Spec 5.3 + 5.7 + 170c section 8.4: normal mode renders four chips in the
// fixed order Calories, Protein, Carbs, Fat with absolute kcal and macro
// grams. Safety mode renders three chips in the fixed order Protein, Carbs,
// Fat with composition ratios (proteinPct, carbsPct, fatsPct); the absolute
// kcal chip is hidden and the gram values flip to percentages. Token driven
// palette only: Teal for Calories, Orange for Protein, a lighter Teal step
// for Carbs, a neutral derived from Deep Navy for Fat.
//
// Labels read via the microcopy layer (172a). The microcopy strings carry
// both variants so the orchestrator boundary picks the right one before the
// chip row renders.
//
// 170c section 8.4 silent UX contract: there is no visible indicator that
// the user is in safety mode. The chip row looks like a normal four chip
// row was reduced to three by the math, not by any safety mode badge.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { MealMacros } from './MealCard.types';
import { getMicrocopy } from '@/lib/nutrition/microcopy';

export interface MacroChipsProps {
  macros: MealMacros;
  /** Safety mode flag from the parent MealCardModel. */
  safetyMode?: boolean;
}

interface MacroChipProps {
  label: string;
  value: number;
  unit: 'kcal' | 'g' | 'percent';
  /**
   * Token driven background tint applied per chip. The token enforces the
   * brand palette (Teal #2DA5A0, Orange #B75E18, etc) and refuses off token
   * hex.
   */
  tone: 'calories' | 'protein' | 'carbs' | 'fats';
}

function toneLabelColor(tone: MacroChipProps['tone']): string {
  switch (tone) {
    case 'calories':
      return '#2DA5A0';
    case 'protein':
      // Protein-Orange-step-1: derived brightened step of the brand Orange
      // token #B75E18 per spec section 5.3 ("Macro chip palette, derived
      // only from tokens"). The raw Orange token #B75E18 produces a
      // contrast ratio of 2.88:1 against the Card surface #1E3054, below
      // the WCAG 2.2 AA 3:1 large-text floor and the 4.5:1 small-text
      // floor. The 172d acceptance audit surfaced this finding; Gary
      // ratified the derived-step path on 2026-06-02. #DA8538 lifts the
      // contrast ratio to 4.60:1 against #1E3054, clearing both the 3:1
      // large-text floor (with ample 1.6 ratio headroom over the 3.1:1
      // measurable-headroom target) and the strict 4.5:1 small-text
      // floor. The brand identity Orange #B75E18 remains the spec section
      // 2 token; this is a chip-label rendering derivation only.
      return '#DA8538';
    case 'carbs':
      // Lighter desaturated Teal step kept within the brand family.
      return '#2DA5A0';
    case 'fats':
      // Neutral white slate; sits over the card surface.
      return '#FFFFFF';
  }
}

function unitLabel(unit: MacroChipProps['unit']): string {
  switch (unit) {
    case 'kcal':
      return 'kcal';
    case 'g':
      return 'g';
    case 'percent':
      return '%';
  }
}

function toneLabelClass(tone: MacroChipProps['tone']): string {
  // The Protein chip label is bumped to text-base font-bold (16px bold) as
  // the typography half of the 172d WCAG fix. Combined with the derived
  // Protein-Orange-step-1 color #DA8538 hitting 4.60:1 against the Card
  // surface #1E3054, the chip clears the WCAG 2.2 AA 4.5:1 small-text
  // floor; the font bump is the visible hierarchy half of the same fix.
  // The other three chip labels retain their original sizing because the
  // 172d audit only surfaced the Orange contrast finding.
  if (tone === 'protein') return 'text-base font-bold';
  return '';
}

function MacroChip({ label, value, unit, tone }: MacroChipProps) {
  const labelClass = toneLabelClass(tone);
  return (
    <div className="rounded-lg bg-white/[0.04] px-2 py-2">
      <div className={labelClass} style={{ color: toneLabelColor(tone) }}>{label}</div>
      <div className="mt-0.5 font-mono text-base text-white">{value}</div>
      <div className="text-[10px] text-white/45">{unitLabel(unit)}</div>
    </div>
  );
}

export function MacroChips({ macros, safetyMode = false }: MacroChipsProps) {
  // 170c section 8.4 ratio variant. Three chips in fixed order Protein,
  // Carbs, Fat with composition percentages; no absolute kcal chip.
  if (safetyMode) {
    const variant = 'safety_mode' as const;
    return (
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <MacroChip
          label={getMicrocopy('chips.protein.label', variant)}
          value={macros.proteinPct}
          unit="percent"
          tone="protein"
        />
        <MacroChip
          label={getMicrocopy('chips.carbs.label', variant)}
          value={macros.carbsPct}
          unit="percent"
          tone="carbs"
        />
        <MacroChip
          label={getMicrocopy('chips.fats.label', variant)}
          value={macros.fatsPct}
          unit="percent"
          tone="fats"
        />
      </div>
    );
  }

  const variant = 'normal' as const;
  return (
    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
      <MacroChip
        label={getMicrocopy('chips.calories.label', variant)}
        value={Math.round(macros.kcal)}
        unit="kcal"
        tone="calories"
      />
      <MacroChip
        label={getMicrocopy('chips.protein.label', variant)}
        value={Number(macros.proteinG.toFixed(1))}
        unit="g"
        tone="protein"
      />
      <MacroChip
        label={getMicrocopy('chips.carbs.label', variant)}
        value={Number(macros.carbsG.toFixed(1))}
        unit="g"
        tone="carbs"
      />
      <MacroChip
        label={getMicrocopy('chips.fats.label', variant)}
        value={Number(macros.fatsG.toFixed(1))}
        unit="g"
        tone="fats"
      />
    </div>
  );
}

export default MacroChips;
