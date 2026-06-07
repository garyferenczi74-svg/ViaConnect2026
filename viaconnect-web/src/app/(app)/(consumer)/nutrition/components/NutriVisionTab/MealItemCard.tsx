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

export type EditableNutrientField =
  | 'calories_kcal'
  | 'protein_g'
  | 'carbs_g'
  | 'fat_g'
  | 'fiber_g'
  | 'sugar_g';

export interface MealItemCardProps {
  item: MealItemDraft;
  onPortionChange: (grams: number) => void;
  onFoodSwap: (replacement: FoodSwapReplacement) => void;
  onCookingOilChange: (selection: CookingOilSelection) => void;
  onApplyChip: (chip: ModifierChip) => void;
  onRemove: () => void;
  onMarkVerified: () => void;
  /**
   * Prompt 177g (2026-06-07): tap-to-edit per-item nutrient correction.
   * When provided, each macro tile becomes a button that opens an
   * inline number input. On commit the parent updates the item draft
   * and the server-side Gordon re-score picks up the corrected value
   * on save. Optional; when omitted the tiles render read-only.
   */
  onNutrientEdit?: (field: EditableNutrientField, value: number) => void;
  /**
   * Prompt 172 Phase 1B: 170c section 8.4 silent ratio mode contract. When
   * true the per item kcal column is suppressed; the protein, carbs, fat
   * gram columns continue to render (per spec 5.7 the absolute totals are
   * the kcal absolute; per item macro grams stay because the gram label
   * itself is on the chip and the brief only suppresses kcal at item
   * level). Defaults to false so unrelated callers continue unchanged.
   */
  safetyMode?: boolean;
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
  onNutrientEdit,
  safetyMode = false,
}: MealItemCardProps) {
  const [showSwap, setShowSwap] = useState(false);
  // Prompt 177g (2026-06-07): inline edit state for the macro tiles. Only
  // one tile edits at a time; committing closes the input and fires the
  // parent handler with the corrected value.
  const [editingField, setEditingField] = useState<EditableNutrientField | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startEdit = (field: EditableNutrientField, current: number | null) => {
    if (!onNutrientEdit) return;
    setEditingField(field);
    setEditValue(current === null || !Number.isFinite(current) ? '' : String(current));
  };
  const commitEdit = () => {
    if (editingField === null || !onNutrientEdit) {
      setEditingField(null);
      return;
    }
    const parsed = Number(editValue);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onNutrientEdit(editingField, parsed);
    }
    setEditingField(null);
    setEditValue('');
  };
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Renders one macro tile. When onNutrientEdit is provided the tile is a
  // button that opens an inline numeric input; otherwise it stays read only.
  // Null value renders as a dash per the 177d unknown contract.
  const renderTile = (
    label: string,
    field: EditableNutrientField,
    value: number | null,
    unit: 'kcal' | 'g',
  ) => {
    const isEditing = editingField === field;
    const display =
      value === null || !Number.isFinite(value)
        ? 'n/a'
        : unit === 'kcal'
          ? String(Math.round(value))
          : `${value.toFixed(1)} g`;

    if (isEditing) {
      return (
        <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
          <div className="text-white/45">{label}</div>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
              }
            }}
            autoFocus
            aria-label={`Edit ${label}`}
            className="mt-0.5 w-full rounded bg-white/10 px-1 py-0.5 text-center font-mono text-[11px] text-white outline-none ring-1 ring-[#2DA5A0]/60"
          />
        </div>
      );
    }

    if (onNutrientEdit) {
      return (
        <button
          type="button"
          onClick={() => startEdit(field, value)}
          aria-label={`Edit ${label}`}
          className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-center transition-colors hover:bg-white/[0.08]"
        >
          <div className="text-white/45">{label}</div>
          <div className="font-mono text-white">{display}</div>
        </button>
      );
    }

    return (
      <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
        <div className="text-white/45">{label}</div>
        <div className="font-mono text-white">{display}</div>
      </div>
    );
  };

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

      {/* Macros row. Prompt 177g (2026-06-07): added Fiber + Sugar tiles
          (six total in normal mode) and made each tile tap-to-edit when
          onNutrientEdit is supplied. Unknown values render as a dash per
          the 177d unknown-vs-zero contract. Safety mode still suppresses
          per-item kcal and stays on the three-column protein/carbs/fat
          grid because the spec brief is unchanged at that layer. */}
      {safetyMode ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          {renderTile('Protein', 'protein_g', item.protein_g, 'g')}
          {renderTile('Carbs', 'carbs_g', item.carbs_g, 'g')}
          {renderTile('Fat', 'fat_g', item.fat_g, 'g')}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] md:grid-cols-6">
          {renderTile('Cal', 'calories_kcal', item.calories_kcal, 'kcal')}
          {renderTile('Protein', 'protein_g', item.protein_g, 'g')}
          {renderTile('Carbs', 'carbs_g', item.carbs_g, 'g')}
          {renderTile('Fat', 'fat_g', item.fat_g, 'g')}
          {renderTile('Fiber', 'fiber_g', typeof item.fiber_g === 'number' ? item.fiber_g : null, 'g')}
          {renderTile('Sugar', 'sugar_g', typeof item.sugar_g === 'number' ? item.sugar_g : null, 'g')}
        </div>
      )}

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
