/**
 * Prompt 170l Phase 1c-2: product confirmation screen (Hannah 11.4).
 *
 * Hero (image + product name + brand chip + barcode digits) > macros grid
 * (4 primary + 3 secondary) > portion adjust (quick chips only; continuous
 * slider and custom grams deferred to Phase 1c-3) > 3 quality indicator
 * chips > ingredients collapsible > allergens collapsible > macros override
 * link > sticky bottom CTA bar.
 *
 * Composition: the Save-to-meal CTA does NOT itself write to /api/nutrition/
 * meals; it converts the OFF product to a MealItemDraft and hands it back to
 * the parent, which threads it through the existing review surface to take
 * advantage of the meal-save pipeline shipped in Prompt 170 Phase 1j (incl.
 * the helix bridge, dashboard crossover, corpus contribution).
 *
 * Defer to Phase 1c-3:
 *   - Per-serving / Per-100g toggle
 *   - Continuous portion slider + custom grams input
 *   - User-flagged allergen Orange highlight (needs CAQ allergen source hook)
 *   - Multi-product flow Scan-Another (the CTA is rendered but no-ops in v1)
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronUp, Package, X } from 'lucide-react';
import type { OFFProduct } from '@/lib/nutrition/barcode/types';
import { QualityChip } from './QualityChip';
import { AttributionFooter } from './AttributionFooter';
import { useUserAllergens, isAllergenMatch } from '@/hooks/useUserAllergens';

const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';
const CARD = '#1E3054';

const PORTION_CHIPS: ReadonlyArray<{ label: string; value: number }> = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
];

export interface ProductConfirmationProps {
  product: OFFProduct;
  /** Format echoed from the lookup result for display below the product name. */
  format: string | null;
  servingSizeG: number;
  initialPortionMultiplier: number;
  onCancel: () => void;
  onBack: () => void;
  onClose: () => void;
  onSave: (portionMultiplier: number) => void;
  onEditMacros: () => void;
  /** Multi-product flow (Hannah §11.7). Passes current portion so the
   *  parent can append a fully-built MealItemDraft to its pending list. */
  onScanAnother?: (portionMultiplier: number) => void;
}

function formatBarcodeDigits(barcode: string): string {
  if (barcode.length === 13) {
    return `${barcode.slice(0, 1)} ${barcode.slice(1, 7)} ${barcode.slice(7, 13)}`;
  }
  if (barcode.length === 12) {
    return `${barcode.slice(0, 1)} ${barcode.slice(1, 6)} ${barcode.slice(6, 11)} ${barcode.slice(11)}`;
  }
  if (barcode.length === 8) {
    return `${barcode.slice(0, 4)} ${barcode.slice(4)}`;
  }
  return barcode;
}

function getNutriment(nutriments: Record<string, number> | null, key: string): number | null {
  if (nutriments === null) return null;
  const v = nutriments[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

interface ComputedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
}

function computeMacros(
  product: OFFProduct,
  servingSizeG: number,
  multiplier: number,
): ComputedMacros {
  const ratio = (servingSizeG * multiplier) / 100;
  const cal = getNutriment(product.nutriments, 'energy-kcal_100g');
  const protein = getNutriment(product.nutriments, 'proteins_100g');
  const carbs = getNutriment(product.nutriments, 'carbohydrates_100g');
  const fat = getNutriment(product.nutriments, 'fat_100g');
  const fiber = getNutriment(product.nutriments, 'fiber_100g');
  const sugar = getNutriment(product.nutriments, 'sugars_100g');
  const sodiumG = getNutriment(product.nutriments, 'sodium_100g');
  return {
    calories: Math.round((cal ?? 0) * ratio),
    protein: Number(((protein ?? 0) * ratio).toFixed(1)),
    carbs: Number(((carbs ?? 0) * ratio).toFixed(1)),
    fat: Number(((fat ?? 0) * ratio).toFixed(1)),
    fiber: fiber === null ? null : Number((fiber * ratio).toFixed(1)),
    sugar: sugar === null ? null : Number((sugar * ratio).toFixed(1)),
    sodium: sodiumG === null ? null : Math.round(sodiumG * 1000 * ratio),
  };
}

export function ProductConfirmation({
  product,
  format,
  servingSizeG,
  initialPortionMultiplier,
  onCancel,
  onBack,
  onClose,
  onSave,
  onEditMacros,
  onScanAnother,
}: ProductConfirmationProps): JSX.Element {
  const [multiplier, setMultiplier] = useState(initialPortionMultiplier);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const userAllergens = useUserAllergens();
  const matchedAllergens = useMemo(() => {
    const tags = product.allergens_tags ?? [];
    return tags.filter((tag) => isAllergenMatch(tag, userAllergens));
  }, [product.allergens_tags, userAllergens]);
  const hasAllergenMatch = matchedAllergens.length > 0;
  // Auto-expand when product has allergens OR when a user-flagged match exists.
  const [allergensOpen, setAllergensOpen] = useState(
    (product.allergens_tags?.length ?? 0) > 0 || hasAllergenMatch,
  );

  const macros = useMemo(
    () => computeMacros(product, servingSizeG, multiplier),
    [product, servingSizeG, multiplier],
  );

  const productName = product.product_name ?? product.code;
  const brand = product.brands;
  const completeness = product.completeness ?? null;
  const showQuietCompleteness =
    completeness !== null && completeness >= 0.3 && completeness < 0.5;
  const showProminentCompleteness =
    completeness !== null && completeness < 0.3;

  const onSelectChip = useCallback((value: number) => setMultiplier(value), []);

  const onSubmitSave = useCallback(() => {
    onSave(multiplier);
  }, [onSave, multiplier]);

  const servingGrams = Math.round(servingSizeG * multiplier);

  return (
    <div className="flex flex-col" style={{ color: '#FFFFFF' }}>
      <header className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to scanner"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        >
          <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <h1 className="font-medium" style={{ fontSize: 16 }}>
          Confirm product
        </h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        >
          <X size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </header>

      {/* Hero card */}
      <section className="flex items-center gap-4 mb-6" aria-labelledby="product-name">
        <div
          className="flex-none rounded-lg flex items-center justify-center overflow-hidden"
          style={{ width: 96, height: 96, backgroundColor: `${CARD}E6` }}
        >
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Package size={40} strokeWidth={1.5} style={{ color: 'rgba(255, 255, 255, 0.6)' }} aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id="product-name"
            className="font-medium leading-tight line-clamp-2"
            style={{ fontSize: 18 }}
          >
            {productName}
          </h2>
          {brand !== null ? (
            <div
              className="mt-2 inline-block rounded-full px-2 py-1"
              style={{
                backgroundColor: `${CARD}E6`,
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: '100%',
              }}
            >
              <span aria-label={`Brand: ${brand}`}>{brand}</span>
            </div>
          ) : null}
          <div
            className="mt-2 font-mono"
            style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}
            aria-label={`Barcode ${product.code}`}
          >
            {formatBarcodeDigits(product.code)}
          </div>
          {format !== null ? (
            <div
              className="mt-1 uppercase tracking-wide"
              style={{ fontSize: 9, color: 'rgba(255, 255, 255, 0.45)' }}
            >
              {format.replace('_', '-')}
            </div>
          ) : null}
        </div>
      </section>

      {showQuietCompleteness ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3"
          style={{ backgroundColor: `${CARD}CC`, height: 36, color: 'rgba(255, 255, 255, 0.8)', fontSize: 13 }}
        >
          Limited nutrition data available
        </div>
      ) : null}
      {showProminentCompleteness ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-xl p-3 border-l-2"
          style={{
            backgroundColor: `${CARD}E6`,
            borderLeftColor: ORANGE,
          }}
        >
          <div className="font-medium" style={{ fontSize: 14, color: '#FFFFFF' }}>
            Limited data for this product
          </div>
          <div className="mt-1" style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
            Some nutrition details may be missing. You can save it anyway.
          </div>
        </div>
      ) : null}

      {/* Macros region */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="uppercase tracking-wide font-medium"
            style={{ fontSize: 12, color: TEAL }}
          >
            Nutrition
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MacroPrimary label="KCAL" value={macros.calories} unit="" />
          <MacroPrimary label="PROTEIN" value={macros.protein} unit="g" />
          <MacroPrimary label="CARBS" value={macros.carbs} unit="g" />
          <MacroPrimary label="FAT" value={macros.fat} unit="g" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <MacroSecondary label="FIBER" value={macros.fiber} unit="g" />
          <MacroSecondary label="SUGAR" value={macros.sugar} unit="g" />
          <MacroSecondary label="SODIUM" value={macros.sodium} unit="mg" />
        </div>
      </section>

      {/* Portion region */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="uppercase tracking-wide font-medium"
            style={{ fontSize: 12, color: TEAL }}
          >
            Portion
          </h3>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
            {multiplier === 1 ? '1 serving' : `${multiplier}x serving`} ({servingGrams} g)
          </div>
        </div>
        <div role="radiogroup" aria-label="Portion multiplier" className="flex gap-2 flex-wrap">
          {PORTION_CHIPS.map((chip) => {
            const selected = chip.value === multiplier;
            return (
              <button
                key={chip.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelectChip(chip.value)}
                className="rounded-full px-4 transition-colors focus-visible:outline focus-visible:outline-2"
                style={{
                  backgroundColor: selected ? TEAL : `${CARD}E6`,
                  color: '#FFFFFF',
                  height: 36,
                  fontSize: 13,
                  fontWeight: selected ? 600 : 400,
                  outlineColor: TEAL,
                  border: selected ? `2px solid ${TEAL}` : '2px solid transparent',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Quality indicators */}
      <section className="mb-6">
        <h3
          className="uppercase tracking-wide font-medium mb-3"
          style={{ fontSize: 12, color: TEAL }}
        >
          Product information
        </h3>
        <p className="mb-3" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.55)' }}>
          These are informational, not recommendations.
        </p>
        <div className="flex flex-wrap gap-2">
          <QualityChip kind="nova" value={product.nova_group} />
          <QualityChip kind="nutriscore" value={product.nutriscore_grade} />
          <QualityChip kind="ecoscore" value={product.ecoscore_grade} />
        </div>
      </section>

      {/* Ingredients */}
      <section className="mb-3">
        <button
          type="button"
          onClick={() => setIngredientsOpen((s) => !s)}
          aria-expanded={ingredientsOpen}
          className="flex w-full items-center justify-between"
        >
          <span
            className="uppercase tracking-wide font-medium"
            style={{ fontSize: 12, color: TEAL }}
          >
            Ingredients
          </span>
          {ingredientsOpen
            ? <ChevronUp size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: TEAL }} />
            : <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: TEAL }} />}
        </button>
        {ingredientsOpen ? (
          <div
            className="mt-2"
            style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5 }}
          >
            {product.ingredients_text ?? 'Ingredients not yet available in Open Food Facts for this product.'}
          </div>
        ) : null}
      </section>

      {/* Allergens */}
      <section
        className="mb-3 rounded-xl"
        style={
          hasAllergenMatch
            ? {
                border: `2px solid ${ORANGE}`,
                padding: '12px',
                margin: '-12px 0 16px',
              }
            : undefined
        }
      >
        <button
          type="button"
          onClick={() => setAllergensOpen((s) => !s)}
          aria-expanded={allergensOpen}
          className="flex w-full items-center justify-between"
        >
          <span
            className="uppercase tracking-wide font-medium flex items-center gap-1.5"
            style={{ fontSize: 12, color: hasAllergenMatch ? ORANGE : TEAL }}
          >
            {hasAllergenMatch
              ? <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" style={{ color: ORANGE }} />
              : null}
            Allergens
          </span>
          {allergensOpen
            ? <ChevronUp size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: hasAllergenMatch ? ORANGE : TEAL }} />
            : <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: hasAllergenMatch ? ORANGE : TEAL }} />}
        </button>
        {allergensOpen ? (
          <div className="mt-2">
            {hasAllergenMatch ? (
              <p
                aria-live="polite"
                className="mb-2"
                style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' }}
              >
                You flagged {matchedAllergens.length === 1 ? 'this allergen' : 'these allergens'} in your profile.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {(product.allergens_tags ?? []).length === 0 ? (
                <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                  No allergens listed for this product.
                </span>
              ) : (
                (product.allergens_tags ?? []).map((tag) => {
                  const matched = matchedAllergens.includes(tag);
                  return (
                    <span
                      key={tag}
                      className="rounded-full px-3"
                      style={{
                        backgroundColor: matched ? 'rgba(183, 94, 24, 0.16)' : `${CARD}E6`,
                        color: matched ? ORANGE : '#FFFFFF',
                        fontSize: 12,
                        fontWeight: matched ? 600 : 400,
                        height: 32,
                        lineHeight: '32px',
                      }}
                    >
                      {tag.replace(/^en:/, '').replace(/-/g, ' ')}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* Macros override link */}
      <button
        type="button"
        onClick={onEditMacros}
        className="mb-2 self-start underline"
        style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}
      >
        Macros wrong? Edit
      </button>

      <AttributionFooter />

      <div style={{ height: 96 }} aria-hidden="true" />

      {/* Sticky bottom CTA bar */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{
          backgroundColor: 'rgba(26, 39, 68, 0.95)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <button
          type="button"
          onClick={onSubmitSave}
          aria-label={`Save ${productName} to meal with ${multiplier}x portion`}
          className="w-full rounded-xl font-semibold"
          style={{
            backgroundColor: TEAL,
            color: '#FFFFFF',
            height: 48,
            fontSize: 14,
          }}
        >
          Save to meal
        </button>
        <div className="mt-3 flex items-center justify-center gap-3">
          {onScanAnother !== undefined ? (
            <>
              <button
                type="button"
                onClick={() => onScanAnother(multiplier)}
                className="underline"
                style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}
              >
                Scan another product
              </button>
              <span aria-hidden="true" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>·</span>
            </>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            className="underline"
            style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface MacroPrimaryProps {
  label: string;
  value: number;
  unit: string;
}

function MacroPrimary({ label, value, unit }: MacroPrimaryProps): JSX.Element {
  return (
    <div
      className="flex flex-col items-start justify-center rounded-xl px-3"
      style={{
        backgroundColor: `${CARD}CC`,
        height: 64,
      }}
    >
      <div className="font-medium" style={{ fontSize: 18, color: '#FFFFFF' }}>
        {value}
        {unit ? <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', marginLeft: 2 }}>{unit}</span> : null}
      </div>
      <div
        className="uppercase tracking-wide"
        style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)' }}
      >
        {label}
      </div>
    </div>
  );
}

interface MacroSecondaryProps {
  label: string;
  value: number | null;
  unit: string;
}

function MacroSecondary({ label, value, unit }: MacroSecondaryProps): JSX.Element {
  return (
    <div
      className="flex flex-col items-start justify-center rounded-xl px-3"
      style={{
        backgroundColor: `${CARD}99`,
        height: 48,
      }}
    >
      <div className="font-medium" style={{ fontSize: 14, color: '#FFFFFF' }}>
        {value === null ? '—' : value}
        {value !== null && unit
          ? <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.7)', marginLeft: 2 }}>{unit}</span>
          : null}
      </div>
      <div
        className="uppercase tracking-wide"
        style={{ fontSize: 9, color: 'rgba(255, 255, 255, 0.55)' }}
      >
        {label}
      </div>
    </div>
  );
}
