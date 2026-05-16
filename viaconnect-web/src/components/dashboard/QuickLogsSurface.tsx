'use client';

// Prompt #169: Dashboard Quick Logs surface refactor.
// Replaces the prior #168c always-rendered selected-tab pattern with the
// per-meal accordion: row of four triggers, single dropdown panel beneath
// (only one open at a time), no panel open on initial mount.
//
// State: openMeal: MealType | null. Click toggles. Single-open invariant
// enforced by setOpenMeal(prev === id ? null : id). Escape closes + focuses
// the active trigger.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Meal, MealType, NutritionTargets, MealDistribution } from '@/lib/gordon/types';
import type { QuickLogDraft } from '@/components/meals/QuickLogModal';
import { QuickLogsMealTypeTab } from './QuickLogsMealTypeTab';
import { QuickLogEntryBlock } from './QuickLogEntryBlock';
import { SnackStackContainer } from './SnackStackContainer';
import { LogAFullMealButton } from './LogAFullMealButton';

export interface QuickLogsSurfaceProps {
  readonly userId: string | null;
  readonly targets: NutritionTargets;
  readonly mealDistribution?: MealDistribution;
  readonly todaysMeals: ReadonlyArray<Meal>;
  // Returns true on success (panel auto-closes), false on failure (panel
  // stays open so user can retry). void treated as success for older callers.
  readonly onSaveMeal: (draft: QuickLogDraft, snackIndex: number | null) => Promise<boolean | void> | boolean | void;
}

const NON_SNACK_LABEL_OVERRIDE: Record<Exclude<MealType, 'snack'>, string> = {
  breakfast: 'Breakfast 1',
  lunch: 'Lunch 1',
  dinner: 'Dinner 1',
};

export function QuickLogsSurface(props: QuickLogsSurfaceProps) {
  const { userId, targets, mealDistribution, todaysMeals, onSaveMeal } = props;
  const idPrefix = useId();

  const [openMeal, setOpenMeal] = useState<MealType | null>(null);

  const completedSet = useMemo<ReadonlySet<MealType>>(() => {
    const s = new Set<MealType>();
    for (const m of todaysMeals) s.add(m.mealType);
    return s;
  }, [todaysMeals]);

  const todaysSnacks = useMemo(
    () =>
      todaysMeals
        .filter((m) => m.mealType === 'snack')
        .slice()
        .sort((a, b) => (a.snackIndex ?? 0) - (b.snackIndex ?? 0)),
    [todaysMeals],
  );

  const handleToggle = useCallback((mealType: MealType) => {
    setOpenMeal((prev) => (prev === mealType ? null : mealType));
  }, []);

  // Spec section 4.6: Escape closes open panel + returns focus to its trigger.
  const surfaceRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!openMeal) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const triggerId = `${idPrefix}-trigger-${openMeal}`;
      setOpenMeal(null);
      // Defer focus so the trigger has time to re-render with tabIndex 0.
      requestAnimationFrame(() => {
        document.getElementById(triggerId)?.focus();
      });
    };
    const surface = surfaceRef.current;
    surface?.addEventListener('keydown', handler);
    return () => surface?.removeEventListener('keydown', handler);
  }, [openMeal, idPrefix]);

  const panelId = openMeal ? `${idPrefix}-panel-${openMeal}` : '';
  const triggerId = openMeal ? `${idPrefix}-trigger-${openMeal}` : '';

  return (
    <section
      ref={surfaceRef}
      aria-labelledby={`${idPrefix}-heading`}
      className="rounded-2xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4 md:p-5"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`${idPrefix}-heading`}
            className="text-[15px] font-semibold uppercase tracking-[0.10em] text-white/80"
          >
            Quick Log
          </h2>
          <p className="mt-1 text-[12px] text-white/55">
            Log macros in grams across 8 nutrients. Gordon scores against your personalized targets.
          </p>
        </div>
        <LogAFullMealButton />
      </header>

      <div className="mb-3">
        <QuickLogsMealTypeTab
          openMeal={openMeal}
          onToggle={handleToggle}
          completed={completedSet}
          snackCount={todaysSnacks.length}
          idPrefix={idPrefix}
        />
      </div>

      <AnimatePresence initial={false}>
        {openMeal !== null ? (
          <motion.div
            key={openMeal}
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.225, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              {openMeal === 'snack' ? (
                <SnackStackContainer
                  targets={targets}
                  mealDistribution={mealDistribution}
                  todaysSnacks={todaysSnacks}
                  onSaveSnack={async (draft, computedSnackIndex) => {
                    // eslint-disable-next-line no-console
                    console.log('[QuickLogsSurface] snack save bubbling up', { computedSnackIndex });
                    const result = await onSaveMeal(draft, computedSnackIndex);
                    // Keep snack panel open after save; SnackStackContainer
                    // handles its own draft state (collapses + offers Add Another).
                    return result !== false;
                  }}
                />
              ) : (
                <QuickLogEntryBlock
                  mealType={openMeal}
                  labelOverride={NON_SNACK_LABEL_OVERRIDE[openMeal]}
                  targets={targets}
                  mealDistribution={mealDistribution}
                  snacksLoggedToday={todaysSnacks.length}
                  onSave={async (draft) => {
                    // eslint-disable-next-line no-console
                    console.log('[QuickLogsSurface] save bubbling up for', draft.mealType);
                    const result = await onSaveMeal(draft, null);
                    if (result !== false) {
                      setOpenMeal(null);
                    }
                  }}
                />
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!userId ? (
        <p className="mt-3 text-[12px] text-white/55">Sign in to save meals.</p>
      ) : null}
    </section>
  );
}

export default QuickLogsSurface;
