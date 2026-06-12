'use client';

// Prompt #168c section 2.1: inline 8-slider Quick Log entry block. Extracted
// from QuickLogModal's inner content so the Dashboard surface can render it
// inline (one block per Breakfast/Lunch/Dinner; multiple stacked for Snacks).
// Meal type is FIXED by the parent tab strip; this block does not select it.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Sparkles } from 'lucide-react';
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
import type { QuickLogDraft } from '@/components/meals/QuickLogModal';
import { NutrientSlider } from '@/components/meals/NutrientSlider';
import { FatSourceDropdown } from '@/components/meals/FatSourceDropdown';
import { QualityScoreRing } from '@/components/meals/QualityScoreRing';
import { ScoreBreakdownPanel } from '@/components/meals/ScoreBreakdownPanel';
import { resolveFatBreakdown } from '@/lib/nutrition/fat-sources';
import { useFatSources } from '@/hooks/useFatSources';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export interface QuickLogEntryBlockProps {
  readonly mealType: MealType;
  // For snacks, parent passes "Snack 1", "Snack 2", etc. via labelOverride.
  readonly labelOverride?: string;
  readonly targets: NutritionTargets;
  readonly mealDistribution?: MealDistribution;
  readonly snacksLoggedToday?: number;
  readonly defaultDateTimeLocal?: string;
  readonly onSave: (draft: QuickLogDraft) => void | Promise<void>;
  readonly onCancel?: () => void;
  readonly hideCancelButton?: boolean;
  // #170 Phase 1q hotfix 9: when a meal of this type already exists for today,
  // the sliders pre-fill from its macros so the user adjusts the existing
  // values instead of starting from zero. Re-save still hits the parent's
  // replace-on-save semantics, keeping cross-channel state consistent.
  readonly existingMeal?: Meal | null;
}

interface SliderState {
  protein: number;
  carbs: number;
  fatTotal: number;
  fiber: number;
  sugar: number;
  sodium: number;
  calories: number;
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

export function QuickLogEntryBlock(props: QuickLogEntryBlockProps) {
  const {
    mealType,
    labelOverride,
    targets,
    mealDistribution,
    snacksLoggedToday,
    defaultDateTimeLocal,
    onSave,
    onCancel,
    hideCancelButton = false,
    existingMeal = null,
  } = props;

  const distribution = mealDistribution ?? DEFAULT_MEAL_DISTRIBUTION;
  const snacksToday = snacksLoggedToday ?? 0;
  const headerLabel = labelOverride ?? MEAL_TYPE_LABELS[mealType];

  // #170 Phase 1q hotfix 9: pre-fill sliders from the existing meal's macros
  // when provided so the form opens with the saved values rather than zeros.
  // Healthy Fat slider removed per Gary 2026-05-15. Fat Total is the single
  // fat input; fat_healthy_g column persists at 0 in the meals row.
  const initialSliders = useMemo<SliderState>(() => {
    if (existingMeal) {
      return {
        protein: existingMeal.proteinG ?? 0,
        carbs: existingMeal.carbsG ?? 0,
        fatTotal: existingMeal.fatTotalG ?? 0,
        fiber: existingMeal.fiberG ?? 0,
        sugar: existingMeal.sugarG ?? 0,
        sodium: existingMeal.sodiumMg ?? 0,
        calories: existingMeal.caloriesKcal ?? 0,
      };
    }
    return {
      protein: SLIDER_RANGES.protein.default === 'auto' ? 0 : SLIDER_RANGES.protein.default,
      carbs: SLIDER_RANGES.carbs.default === 'auto' ? 0 : SLIDER_RANGES.carbs.default,
      fatTotal: SLIDER_RANGES.fatTotal.default === 'auto' ? 0 : SLIDER_RANGES.fatTotal.default,
      fiber: SLIDER_RANGES.fiber.default === 'auto' ? 0 : SLIDER_RANGES.fiber.default,
      sugar: SLIDER_RANGES.sugar.default === 'auto' ? 0 : SLIDER_RANGES.sugar.default,
      sodium: SLIDER_RANGES.sodium.default === 'auto' ? 0 : SLIDER_RANGES.sodium.default,
      calories: 0,
    };
  }, [existingMeal]);

  const [loggedAt, setLoggedAt] = useState<string>(
    defaultDateTimeLocal ?? nowLocalDateTimeInput(),
  );
  const [sliders, setSliders] = useState<SliderState>(initialSliders);
  // When pre-filled from an existing meal, honor the saved calories value
  // verbatim rather than recomputing it from Atwater.
  const [caloriesAutoCalc, setCaloriesAutoCalc] = useState<boolean>(!existingMeal);
  const [wholeFoodFlag, setWholeFoodFlag] = useState<boolean>(
    existingMeal?.wholeFoodFlag ?? false,
  );
  const [mealName, setMealName] = useState<string>(
    existingMeal?.mealName ?? existingMeal?.notes ?? '',
  );
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [fatSourceId, setFatSourceId] = useState<string | null>(null);
  const { fatSources } = useFatSources();

  const autoCalories = useMemo(() => {
    return Math.round(
      sliders.protein * ATWATER_FACTORS.protein +
        sliders.carbs * ATWATER_FACTORS.carbs +
        sliders.fatTotal * ATWATER_FACTORS.fat,
    );
  }, [sliders.protein, sliders.carbs, sliders.fatTotal]);

  const displayedCalories = caloriesAutoCalc ? autoCalories : sliders.calories;

  // Prompt 184b: resolve the fat breakdown from the picked source (one-source
  // model for manual entry) so the live score preview reflects source quality.
  const previewFatBreakdown = useMemo(() => {
    const source = fatSources.find((s) => s.id === fatSourceId) ?? null;
    return resolveFatBreakdown({
      intrinsicTotalFatG: 0,
      intrinsicSaturatedG: 0,
      addedFatG: sliders.fatTotal,
      source,
    });
  }, [fatSources, fatSourceId, sliders.fatTotal]);

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
      fatSourceId,
      fatBreakdown: previewFatBreakdown,
      fatQualityContribution: null,
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
      fatSourceId,
      previewFatBreakdown,
    ],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const result = scoreMeal(previewMeal, targets, distribution, snacksToday);
      setBreakdown(result);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [previewMeal, targets, distribution, snacksToday]);

  const sharePctForCurrentMealType = useMemo(
    () => shareForMealType(mealType, distribution, snacksToday),
    [mealType, distribution, snacksToday],
  );

  const perMealTargets = useMemo(
    () => ({
      protein: targets.dailyProteinG * sharePctForCurrentMealType,
      carbs: targets.dailyCarbsG * sharePctForCurrentMealType,
      fatTotal: targets.dailyFatTotalG * sharePctForCurrentMealType,
      fiber: targets.dailyFiberG * sharePctForCurrentMealType,
      sugar: targets.dailySugarG * sharePctForCurrentMealType,
      sodium: targets.dailySodiumMg * sharePctForCurrentMealType,
      calories: targets.dailyKcal * sharePctForCurrentMealType,
    }),
    [targets, sharePctForCurrentMealType],
  );

  const updateSlider = useCallback((key: keyof SliderState, value: number) => {
    setSliders((prev) => ({ ...prev, [key]: value }));
  }, []);

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
      sliders.fiber === 0 &&
      sliders.sugar === 0 &&
      sliders.sodium === 0 &&
      displayedCalories === 0
    );
  }, [sliders, displayedCalories]);

  // Prompt #168d follow-up: in-flight guard. Without this, three rapid
  // taps on Save trigger three concurrent POSTs whose DELETE phases all
  // run before any INSERT commits, leaving three duplicate rows in
  // the meals table.
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (allSlidersZero) {
      return;
    }
    const draft: QuickLogDraft = {
      mealType,
      loggedAt: new Date(loggedAt).toISOString(),
      source: 'quick_log',
      sourceConfidence: 0.70,
      proteinG: sliders.protein,
      carbsG: sliders.carbs,
      fatTotalG: sliders.fatTotal,
      fatSourceId,
      fiberG: sliders.fiber,
      sugarG: sliders.sugar,
      sodiumMg: sliders.sodium,
      caloriesKcal: displayedCalories,
      caloriesAutoCalc,
      wholeFoodFlag,
      mealName: mealName.trim() ? mealName.trim() : null,
      rawInput: { sliders: { ...sliders } },
    };
    setIsSaving(true);
    try {
      await onSave(draft);
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    allSlidersZero,
    mealType,
    loggedAt,
    sliders,
    displayedCalories,
    caloriesAutoCalc,
    wholeFoodFlag,
    mealName,
    fatSourceId,
    onSave,
  ]);

  const tier = breakdown ? breakdown.tier : assignTier(50);
  const score = breakdown ? breakdown.final_score : 50;

  // #170 Phase 1q hotfix 9: prefill banner. "nutrivision" gets the branded
  // label; all other sources fall back to "recent" so the copy stays accurate
  // without leaking internal source slugs.
  const sourceLabel =
    existingMeal && existingMeal.source === 'nutrivision' ? 'NutriVision' : 'recent';
  const mealTypeLabelLower = existingMeal
    ? MEAL_TYPE_LABELS[existingMeal.mealType].toLowerCase()
    : '';

  return (
    <div className="font-[Instrument_Sans] flex flex-col gap-4 rounded-xl border border-white/10 bg-gradient-to-br from-[#1E3054]/55 via-[#1A2744]/40 to-[#0D1520]/55 p-4 backdrop-blur-md md:p-5">
      <span className="text-[14px] font-semibold uppercase tracking-[0.10em] text-white/80">
        {headerLabel}
      </span>

      {existingMeal ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2 text-[12px] text-white/85">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
          <span>
            Loaded from your {sourceLabel} {mealTypeLabelLower} log. Adjust the sliders to refine, then save to update.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr] md:gap-5">
        <aside className="flex flex-col items-center gap-3 md:items-stretch">
          <div className="flex items-center justify-center md:justify-start">
            <QualityScoreRing score={score} tier={tier} sizePx={140} />
          </div>
          <div className="hidden md:block">
            {breakdown ? <ScoreBreakdownPanel breakdown={breakdown} defaultOpen={false} /> : null}
          </div>
        </aside>

        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor={`ql-${mealType}-logged-at`}
              className="mb-1 block text-[12px] uppercase tracking-[0.10em] text-white/55"
            >
              Date and time
            </label>
            <input
              id={`ql-${mealType}-logged-at`}
              type="datetime-local"
              value={loggedAt}
              onChange={(event) => setLoggedAt(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#1A2744] px-3 py-2 text-[13px] text-white focus:border-[#2DA5A0] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <NutrientSlider
                id={`ql-${mealType}-calories`}
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
              id={`ql-${mealType}-protein`}
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
              id={`ql-${mealType}-carbs`}
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
              id={`ql-${mealType}-fat-total`}
              label="Fat (Total)"
              unit="g"
              min={SLIDER_RANGES.fatTotal.min}
              max={SLIDER_RANGES.fatTotal.max}
              step={SLIDER_RANGES.fatTotal.step}
              value={sliders.fatTotal}
              onChange={(v) => updateSlider('fatTotal', v)}
              perMealTarget={perMealTargets.fatTotal}
            />
            <FatSourceDropdown
              value={fatSourceId}
              onChange={setFatSourceId}
              fatSources={fatSources}
            />
            <NutrientSlider
              id={`ql-${mealType}-fiber`}
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
              id={`ql-${mealType}-sugar`}
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
              id={`ql-${mealType}-sodium`}
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
              htmlFor={`ql-${mealType}-meal-name`}
              className="mb-1 block text-[12px] uppercase tracking-[0.10em] text-white/55"
            >
              Meal name (optional)
            </label>
            <input
              id={`ql-${mealType}-meal-name`}
              type="text"
              value={mealName}
              onChange={(event) => setMealName(event.target.value)}
              placeholder="e.g. Salmon bowl"
              className="w-full rounded-xl border border-white/10 bg-[#1A2744] px-3 py-2 text-[13px] text-white placeholder:text-white/40 focus:border-[#2DA5A0] focus:outline-none"
            />
          </div>

          <div className="md:hidden">
            {breakdown ? <ScoreBreakdownPanel breakdown={breakdown} defaultOpen={false} /> : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
        {hideCancelButton ? null : (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-[13px] text-white/75 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={allSlidersZero || isSaving}
          className="rounded-full bg-[#2DA5A0] px-5 py-2 text-[13px] font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-[#2DA5A0]/40"
        >
          Save {headerLabel}
        </button>
      </div>
    </div>
  );
}

export default QuickLogEntryBlock;
