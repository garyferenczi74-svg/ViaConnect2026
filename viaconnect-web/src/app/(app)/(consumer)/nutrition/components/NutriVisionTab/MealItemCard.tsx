'use client';

// Prompt #170 Phase 1l: per-item card on the review screen.
//
// Shows item name, source flag, macros, portion slider, oil selector (when
// applicable), modifier chips, micronutrient panel, and a remove button. The
// confidence badge is anchored top-right. The swap-food panel is gated behind
// a Swap button to keep the card compact by default.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useMemo, useState } from 'react';
import { CheckCircle2, Repeat, Trash2 } from 'lucide-react';
import type {
  CookingOilSelection,
  CookingOilType,
} from '@/lib/nutrition/cooking-oil/types';
import { oilMacroDelta } from '@/lib/nutrition/cooking-oil/suggester';
import type { CookingMethod, CuisineTag } from '@/lib/nutrition/vision/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { PortionSlider } from './PortionSlider';
import { ModificationChips } from './ModificationChips';
import { CookingOilSelector } from './CookingOilSelector';
import { MicronutrientPanel } from './MicronutrientPanel';
import { FoodSearchDropdown } from './FoodSearchDropdown';
import type { MealItemDraft, FoodSwapReplacement, ModifierChip } from './types';
import { ScannedChip } from '@/components/barcode/ScannedChip';

export interface MealItemCardProps {
  item: MealItemDraft;
  onPortionChange: (grams: number) => void;
  onFoodSwap: (replacement: FoodSwapReplacement) => void;
  onCookingOilChange: (selection: CookingOilSelection) => void;
  onApplyChip: (chip: ModifierChip) => void;
  onRemove: () => void;
  onMarkVerified: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  farmceutica_curated: 'Curated',
  usda_fdc: 'USDA',
  open_food_facts: 'Open Food Facts',
  vision_provider: 'AI',
  user_entered: 'Manual',
};

function isValidCookingMethod(m: string | undefined): m is CookingMethod {
  if (typeof m !== 'string') return false;
  return ['raw', 'steamed', 'grilled', 'baked', 'boiled', 'sauteed', 'fried', 'deep_fried', 'unknown'].includes(m);
}

const KNOWN_OIL_TYPES = new Set<string>([
  'none', 'olive_oil', 'evoo', 'avocado_oil', 'coconut_oil', 'butter', 'ghee',
  'vegetable_canola_oil', 'sesame_oil', 'other',
]);

function asOilType(v: string | undefined): CookingOilType {
  if (typeof v === 'string' && KNOWN_OIL_TYPES.has(v)) return v as CookingOilType;
  return 'none';
}

export function MealItemCard({
  item,
  onPortionChange,
  onFoodSwap,
  onCookingOilChange,
  onApplyChip,
  onRemove,
  onMarkVerified,
}: MealItemCardProps) {
  const [showSwap, setShowSwap] = useState(false);

  const suggestion = useMemo(() => {
    const s = item.cooking_oil_suggestion;
    return {
      type: asOilType(s?.type),
      amount_ml: typeof s?.amount_ml === 'number' ? s.amount_ml : 0,
      reasoning: typeof s?.reasoning === 'string' ? s.reasoning : '',
    };
  }, [item.cooking_oil_suggestion]);

  const liveOilDelta = useMemo(() => {
    const sel = item.cooking_oil ?? { type: suggestion.type, amount_ml: suggestion.amount_ml };
    const delta = oilMacroDelta({ type: sel.type, amount_ml: sel.amount_ml });
    return { calories_kcal: delta.calories_kcal, fat_g: delta.fat_g };
  }, [item.cooking_oil, suggestion]);

  const sourceLabel = SOURCE_LABEL[item.nutrient_source] ?? 'AI';
  const cuisineHint = typeof item.cuisine_tag === 'string' ? item.cuisine_tag : undefined;
  const cookingMethod = isValidCookingMethod(item.cooking_method) ? item.cooking_method : undefined;

  return (
    <div
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-3 backdrop-blur-md"
      data-meal-item-card
      data-item-id={item.id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{item.food_name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/55">
            <span className="rounded-full border border-white/[0.08] bg-white/5 px-1.5 py-0.5">{sourceLabel}</span>
            {/* Prompt 170l Phase 1c-3: barcode-sourced item provenance chip. */}
            {item.from_barcode_scan && <ScannedChip />}
            {typeof item.cuisine_tag === 'string' && (
              <span>{item.cuisine_tag.replace(/_/g, ' ')}</span>
            )}
            {cookingMethod && (
              <span>{cookingMethod.replace(/_/g, ' ')}</span>
            )}
            {item.user_modified && (
              <span className="text-[#2DA5A0]">edited</span>
            )}
          </div>
        </div>
        <ConfidenceBadge band={item.confidence_band} score={item.recognition_confidence} />
      </div>

      {/* Macros row */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
          <div className="text-white/45">Cal</div>
          <div className="font-mono text-white">{Math.round(item.calories_kcal)}</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
          <div className="text-white/45">Protein</div>
          <div className="font-mono text-white">{item.protein_g.toFixed(1)} g</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
          <div className="text-white/45">Carbs</div>
          <div className="font-mono text-white">{item.carbs_g.toFixed(1)} g</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
          <div className="text-white/45">Fat</div>
          <div className="font-mono text-white">{item.fat_g.toFixed(1)} g</div>
        </div>
      </div>

      {/* Portion */}
      <div className="mt-3">
        <PortionSlider grams={item.portion_grams} onChange={onPortionChange} />
      </div>

      {/* Cooking oil */}
      {cookingMethod && (
        <div className="mt-3">
          <CookingOilSelector
            cookingMethod={cookingMethod}
            cuisineTag={cuisineHint}
            currentSelection={item.cooking_oil}
            suggestion={suggestion}
            onChange={onCookingOilChange}
            liveMacroDelta={liveOilDelta}
          />
        </div>
      )}

      {/* Modifier chips */}
      <div className="mt-3">
        <ModificationChips scope="item" onApply={onApplyChip} />
      </div>

      {/* Micronutrient panel */}
      <div className="mt-3">
        <MicronutrientPanel micronutrients={item.micronutrients} />
      </div>

      {/* Swap food panel (collapsed by default) */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowSwap((v) => !v)}
          aria-expanded={showSwap}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/5 px-2.5 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/10"
        >
          <Repeat className="h-3 w-3" strokeWidth={1.5} />
          {showSwap ? 'Hide swap' : 'Swap food'}
        </button>
        <button
          type="button"
          onClick={onMarkVerified}
          aria-label="Mark as verified"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/5 px-2.5 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/10"
        >
          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
          Verify
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#B75E18]/30 bg-[#B75E18]/10 px-2.5 py-1 text-[11px] text-[#FCA5A5] transition-colors hover:bg-[#B75E18]/20"
        >
          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
          Remove
        </button>
      </div>

      {showSwap && (
        <div className="mt-3">
          <FoodSearchDropdown
            onPick={(r) => { onFoodSwap(r); setShowSwap(false); }}
            cuisineTagHint={cuisineHint}
            onClose={() => setShowSwap(false)}
          />
        </div>
      )}
    </div>
  );
}
