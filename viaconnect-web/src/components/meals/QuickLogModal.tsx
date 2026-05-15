'use client';

// Prompt #168 Apply A: Quick Log modal shell.
// Sliders + ring + breakdown wired together. No Supabase. Parent persists.
// Section 6.1 of docs/superpowers/plans/2026-05-14-prompt-168-meal-foundation.md.

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { X } from 'lucide-react';
import {
  ATWATER_FACTORS,
  DEFAULT_MEAL_DISTRIBUTION,
  SLIDER_RANGES,
  assignTier,
} from '@/lib/gordon/constants';
import { scoreMeal } from '@/lib/gordon/scoreMeal';
import type {
  Meal,
  MealDistribution,
  MealType,
  NutritionTargets,
  ScoreBreakdown,
} from '@/lib/gordon/types';
import { NutrientSlider } from './NutrientSlider';
import { QualityScoreRing } from './QualityScoreRing';
import { ScoreBreakdownPanel } from './ScoreBreakdownPanel';

const MEAL_TYPES: ReadonlyArray<{ id: MealType; label: string }> = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

export interface QuickLogDraft {
  mealType: MealType;
  loggedAt: string;
  source: 'quick_log';
  sourceConfidence: 0.70;
  proteinG: number;
  carbsG: number;
  fatTotalG: number;
  fatHealthyG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  caloriesKcal: number;
  caloriesAutoCalc: boolean;
  wholeFoodFlag: boolean;
  mealName: string | null;
  rawInput: { sliders: Record<string, number> };
}

export interface QuickLogModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSave: (draft: QuickLogDraft) => void | Promise<void>;
  readonly defaultMealType?: MealType;
  readonly targets: NutritionTargets;
  readonly mealDistribution?: MealDistribution;
  readonly snacksLoggedToday?: number;
  readonly defaultDateTimeLocal?: string;
}

interface SliderState {
  protein: number;
  carbs: number;
  fatTotal: number;
  fatHealthy: number;
  fiber: number;
  sugar: number;
  sodium: number;
  calories: number;
}

function defaultSliders(): SliderState {
  return {
    protein: SLIDER_RANGES.protein.default === 'auto' ? 0 : SLIDER_RANGES.protein.default,
    carbs: SLIDER_RANGES.carbs.default === 'auto' ? 0 : SLIDER_RANGES.carbs.default,
    fatTotal: SLIDER_RANGES.fatTotal.default === 'auto' ? 0 : SLIDER_RANGES.fatTotal.default,
    fatHealthy: SLIDER_RANGES.fatHealthy.default === 'auto' ? 0 : SLIDER_RANGES.fatHealthy.default,
    fiber: SLIDER_RANGES.fiber.default === 'auto' ? 0 : SLIDER_RANGES.fiber.default,
    sugar: SLIDER_RANGES.sugar.default === 'auto' ? 0 : SLIDER_RANGES.sugar.default,
    sodium: SLIDER_RANGES.sodium.default === 'auto' ? 0 : SLIDER_RANGES.sodium.default,
    calories: 0,
  };
}

function nowLocalDateTimeInput(): string {
  const d = new Date();
  const tzOffsetMin = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffsetMin * 60_000);
  return local.toISOString().slice(0, 16);
}

function shareForMealType(
  mealType: MealType,
  distribution: MealDistribution,
  snacksToday: number,
): number {
  if (mealType === 'snack') {
    const cap = distribution.snackDivisorCap;
    const raw = snacksToday > 0 ? snacksToday : 1;
    const divisor = Math.min(raw, cap);
    const pool = distribution.snack * 2;
    return pool / divisor;
  }
  if (mealType === 'breakfast') return distribution.breakfast;
  if (mealType === 'lunch') return distribution.lunch;
  return distribution.dinner;
}

export function QuickLogModal(props: QuickLogModalProps) {
  const {
    open,
    onClose,
    onSave,
    defaultMealType,
    targets,
    mealDistribution,
    snacksLoggedToday,
    defaultDateTimeLocal,
  } = props;

  const distribution = mealDistribution ?? DEFAULT_MEAL_DISTRIBUTION;
  const snacksToday = snacksLoggedToday ?? 0;
  const [mealType, setMealType] = useState<MealType>(defaultMealType ?? 'lunch');
  const [loggedAt, setLoggedAt] = useState<string>(
    defaultDateTimeLocal ?? nowLocalDateTimeInput(),
  );
  const [sliders, setSliders] = useState<SliderState>(defaultSliders);
  const [caloriesAutoCalc, setCaloriesAutoCalc] = useState<boolean>(true);
  const [wholeFoodFlag, setWholeFoodFlag] = useState<boolean>(false);
  const [mealName, setMealName] = useState<string>('');
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const titleId = useId();

  // Reset slider/meta state on each open so the modal does not hold a stale draft.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setMealType(defaultMealType ?? 'lunch');
      setLoggedAt(defaultDateTimeLocal ?? nowLocalDateTimeInput());
      setSliders(defaultSliders());
      setCaloriesAutoCalc(true);
      setWholeFoodFlag(false);
      setMealName('');
      setBreakdown(null);
    }
    wasOpen.current = open;
  }, [open, defaultMealType, defaultDateTimeLocal]);

  const autoCalories = useMemo(() => {
    return Math.round(
      sliders.protein * ATWATER_FACTORS.protein +
        sliders.carbs * ATWATER_FACTORS.carbs +
        sliders.fatTotal * ATWATER_FACTORS.fat,
    );
  }, [sliders.protein, sliders.carbs, sliders.fatTotal]);

  const displayedCalories = caloriesAutoCalc ? autoCalories : sliders.calories;

  // Stabilize the Meal object so scoreMeal is not invoked on every keystroke
  // beyond the debounce. useMemo + 200ms debounce inside the effect.
  const previewMeal: Meal = useMemo(
    () => ({
      mealId: 'preview',
      userId: targets.userId,
      loggedAt: new Date(loggedAt).toISOString(),
      mealType,
      source: 'quick_log',
      sourceConfidence: 0.70,
      proteinG: sliders.protein,
      carbsG: sliders.carbs,
      fatTotalG: sliders.fatTotal,
      fatHealthyG: sliders.fatHealthy,
      fiberG: sliders.fiber,
      sugarG: sliders.sugar,
      sodiumMg: sliders.sodium,
      caloriesKcal: displayedCalories,
      caloriesAutoCalc,
      wholeFoodFlag,
      ingredientsList: null,
      mealName: mealName || null,
      notes: null,
      rawInput: { sliders: { ...sliders } },
      legacyNutritionLogId: null,
      qualityScore: null,
      qualityTier: null,
      scoreBreakdown: null,
      scoredAt: null,
      gordonVersion: null,
      snackIndex: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      targets.userId,
      loggedAt,
      mealType,
      sliders,
      displayedCalories,
      caloriesAutoCalc,
      wholeFoodFlag,
      mealName,
    ],
  );

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      const result = scoreMeal(previewMeal, targets, distribution, snacksToday);
      setBreakdown(result);
    }, 200);
    return () => clearTimeout(handle);
  }, [open, previewMeal, targets, distribution, snacksToday]);

  const sharePctForCurrentMealType = useMemo(
    () => shareForMealType(mealType, distribution, snacksToday),
    [mealType, distribution, snacksToday],
  );

  const perMealTargets = useMemo(
    () => ({
      protein: targets.dailyProteinG * sharePctForCurrentMealType,
      carbs: targets.dailyCarbsG * sharePctForCurrentMealType,
      fatTotal: targets.dailyFatTotalG * sharePctForCurrentMealType,
      fatHealthy: targets.dailyFatUnsatG * sharePctForCurrentMealType,
      fiber: targets.dailyFiberG * sharePctForCurrentMealType,
      sugar: targets.dailySugarG * sharePctForCurrentMealType,
      sodium: targets.dailySodiumMg * sharePctForCurrentMealType,
      calories: targets.dailyKcal * sharePctForCurrentMealType,
    }),
    [targets, sharePctForCurrentMealType],
  );

  const updateSlider = useCallback(
    (key: keyof SliderState, value: number) => {
      setSliders((prev) => {
        const next: SliderState = { ...prev, [key]: value };
        if (key === 'fatHealthy' && value > prev.fatTotal) {
          next.fatTotal = value;
        }
        if (key === 'fatTotal' && value < prev.fatHealthy) {
          next.fatHealthy = value;
        }
        return next;
      });
    },
    [],
  );

  const handleCaloriesChange = useCallback((value: number) => {
    setCaloriesAutoCalc(false);
    setSliders((prev) => ({ ...prev, calories: value }));
  }, []);

  const resetCaloriesToAuto = useCallback(() => {
    setCaloriesAutoCalc(true);
  }, []);

  const allSlidersZero = useMemo(() => {
    return (
      sliders.protein === 0 &&
      sliders.carbs === 0 &&
      sliders.fatTotal === 0 &&
      sliders.fatHealthy === 0 &&
      sliders.fiber === 0 &&
      sliders.sugar === 0 &&
      sliders.sodium === 0 &&
      displayedCalories === 0
    );
  }, [sliders, displayedCalories]);

  const handleSave = useCallback(async () => {
    if (allSlidersZero) return;
    const draft: QuickLogDraft = {
      mealType,
      loggedAt: new Date(loggedAt).toISOString(),
      source: 'quick_log',
      sourceConfidence: 0.70,
      proteinG: sliders.protein,
      carbsG: sliders.carbs,
      fatTotalG: sliders.fatTotal,
      fatHealthyG: sliders.fatHealthy,
      fiberG: sliders.fiber,
      sugarG: sliders.sugar,
      sodiumMg: sliders.sodium,
      caloriesKcal: displayedCalories,
      caloriesAutoCalc,
      wholeFoodFlag,
      mealName: mealName.trim() ? mealName.trim() : null,
      rawInput: { sliders: { ...sliders } },
    };
    await onSave(draft);
  }, [
    allSlidersZero,
    mealType,
    loggedAt,
    sliders,
    displayedCalories,
    caloriesAutoCalc,
    wholeFoodFlag,
    mealName,
    onSave,
  ]);

  if (!open) return null;

  const tier = breakdown ? breakdown.tier : assignTier(50);
  const score = breakdown ? breakdown.final_score : 50;

  const sliderBlock = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <NutrientSlider
          id="ql-calories"
          label="Calories"
          unit="kcal"
          min={SLIDER_RANGES.calories.min}
          max={SLIDER_RANGES.calories.max}
          step={SLIDER_RANGES.calories.step}
          value={displayedCalories}
          onChange={handleCaloriesChange}
          perMealTarget={perMealTargets.calories}
          ariaLabel={`Calories in kcal, currently ${Math.round(displayedCalories)}, ${
            caloriesAutoCalc ? 'auto from macros' : 'manual override'
          }`}
        />
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          {caloriesAutoCalc ? (
            <span className="rounded-full bg-[#2DA5A0]/20 px-2 py-0.5 text-[#2DA5A0]">
              Auto from macros
            </span>
          ) : (
            <>
              <span className="rounded-full bg-[#B75E18]/20 px-2 py-0.5 text-[#D4823B]">
                Manual override
              </span>
              <button
                type="button"
                onClick={resetCaloriesToAuto}
                className="text-white/70 underline-offset-2 hover:text-white hover:underline"
              >
                Reset to auto
              </button>
            </>
          )}
        </div>
      </div>

      <NutrientSlider
        id="ql-protein"
        label="Protein"
        unit="g"
        min={SLIDER_RANGES.protein.min}
        max={SLIDER_RANGES.protein.max}
        step={SLIDER_RANGES.protein.step}
        value={sliders.protein}
        onChange={(v) => updateSlider('protein', v)}
        perMealTarget={perMealTargets.protein}
      />

      <NutrientSlider
        id="ql-carbs"
        label="Carbs"
        unit="g"
        min={SLIDER_RANGES.carbs.min}
        max={SLIDER_RANGES.carbs.max}
        step={SLIDER_RANGES.carbs.step}
        value={sliders.carbs}
        onChange={(v) => updateSlider('carbs', v)}
        perMealTarget={perMealTargets.carbs}
      />

      <NutrientSlider
        id="ql-fat-total"
        label="Fat (Total)"
        unit="g"
        min={SLIDER_RANGES.fatTotal.min}
        max={SLIDER_RANGES.fatTotal.max}
        step={SLIDER_RANGES.fatTotal.step}
        value={sliders.fatTotal}
        onChange={(v) => updateSlider('fatTotal', v)}
        perMealTarget={perMealTargets.fatTotal}
      />

      <div>
        <NutrientSlider
          id="ql-fat-healthy"
          label="Healthy Fat"
          unit="g"
          min={SLIDER_RANGES.fatHealthy.min}
          max={SLIDER_RANGES.fatHealthy.max}
          step={SLIDER_RANGES.fatHealthy.step}
          value={sliders.fatHealthy}
          onChange={(v) => updateSlider('fatHealthy', v)}
          perMealTarget={perMealTargets.fatHealthy}
        />
        <p className="mt-1 text-[11px] text-white/55">
          Subset of total fat (mono-unsaturated, poly-unsaturated, omega-3).
        </p>
      </div>

      <NutrientSlider
        id="ql-fiber"
        label="Fiber"
        unit="g"
        min={SLIDER_RANGES.fiber.min}
        max={SLIDER_RANGES.fiber.max}
        step={SLIDER_RANGES.fiber.step}
        value={sliders.fiber}
        onChange={(v) => updateSlider('fiber', v)}
        perMealTarget={perMealTargets.fiber}
      />

      <NutrientSlider
        id="ql-sugar"
        label="Sugar"
        unit="g"
        min={SLIDER_RANGES.sugar.min}
        max={SLIDER_RANGES.sugar.max}
        step={SLIDER_RANGES.sugar.step}
        value={sliders.sugar}
        onChange={(v) => updateSlider('sugar', v)}
        perMealTarget={perMealTargets.sugar}
      />

      <NutrientSlider
        id="ql-sodium"
        label="Sodium"
        unit="mg"
        min={SLIDER_RANGES.sodium.min}
        max={SLIDER_RANGES.sodium.max}
        step={SLIDER_RANGES.sodium.step}
        value={sliders.sodium}
        onChange={(v) => updateSlider('sodium', v)}
        perMealTarget={perMealTargets.sodium}
      />
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 md:items-center md:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        className="font-[Instrument_Sans] flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1A2744] text-white shadow-2xl md:max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 id={titleId} className="text-[15px] font-semibold text-white">
            Quick Log
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick log"
            className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-5 overflow-y-auto px-4 py-4 md:grid-cols-[260px_1fr] md:gap-6">
          <aside className="flex flex-col items-center gap-3 md:items-stretch">
            <div className="flex items-center justify-center md:justify-start">
              <QualityScoreRing score={score} tier={tier} sizePx={140} />
            </div>
            <div className="hidden md:block">
              {breakdown ? (
                <ScoreBreakdownPanel breakdown={breakdown} defaultOpen={true} />
              ) : null}
            </div>
          </aside>

          <div className="flex flex-col gap-4">
            <div>
              <span className="mb-2 block text-[12px] uppercase tracking-[0.10em] text-white/55">
                Meal type
              </span>
              <div
                role="radiogroup"
                aria-label="Meal type"
                className="grid grid-cols-4 gap-1 rounded-full border border-white/10 bg-white/5 p-1"
              >
                {MEAL_TYPES.map((entry) => {
                  const selected = entry.id === mealType;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setMealType(entry.id)}
                      className={`rounded-full px-2 py-1.5 text-[12px] font-medium transition ${
                        selected
                          ? 'bg-[#2DA5A0] text-white'
                          : 'text-white/75 hover:text-white'
                      }`}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="ql-logged-at"
                className="mb-1 block text-[12px] uppercase tracking-[0.10em] text-white/55"
              >
                Date and time
              </label>
              <input
                id="ql-logged-at"
                type="datetime-local"
                value={loggedAt}
                onChange={(event) => setLoggedAt(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1E3054] px-3 py-2 text-[13px] text-white focus:border-[#2DA5A0] focus:outline-none"
              />
            </div>

            {sliderBlock}

            <label className="mt-1 flex items-center gap-3 text-[13px] text-white/85">
              <input
                type="checkbox"
                checked={wholeFoodFlag}
                onChange={(event) => setWholeFoodFlag(event.target.checked)}
                className="h-4 w-4 accent-[#2DA5A0]"
              />
              <span>This was a whole food meal</span>
            </label>

            <div>
              <label
                htmlFor="ql-meal-name"
                className="mb-1 block text-[12px] uppercase tracking-[0.10em] text-white/55"
              >
                Meal name (optional)
              </label>
              <input
                id="ql-meal-name"
                type="text"
                value={mealName}
                onChange={(event) => setMealName(event.target.value)}
                placeholder="e.g. Salmon bowl"
                className="w-full rounded-xl border border-white/10 bg-[#1E3054] px-3 py-2 text-[13px] text-white placeholder:text-white/40 focus:border-[#2DA5A0] focus:outline-none"
              />
            </div>

            <div className="md:hidden">
              {breakdown ? (
                <ScoreBreakdownPanel breakdown={breakdown} defaultOpen={false} />
              ) : null}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-[13px] text-white/75 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={allSlidersZero}
            className="rounded-full bg-[#2DA5A0] px-5 py-2 text-[13px] font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-[#2DA5A0]/40"
          >
            Save meal
          </button>
        </footer>
      </div>
    </div>
  );
}

export default QuickLogModal;
