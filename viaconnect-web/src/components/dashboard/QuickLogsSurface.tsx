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
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { Meal, MealType, NutritionTargets, MealDistribution } from '@/lib/gordon/types';
import type { QuickLogDraft } from '@/components/meals/QuickLogModal';
import { QuickLogsMealTypeTab, type QuickLogPanelKey } from './QuickLogsMealTypeTab';
import { QuickLogEntryBlock } from './QuickLogEntryBlock';
import { SnackStackContainer } from './SnackStackContainer';
import { LogAFullMealButton } from './LogAFullMealButton';
import { HydrationQuickLogButtons } from '@/components/hydration/HydrationQuickLogButtons';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { formatVolumeLabel } from '@/components/hydration/HydrationRing';

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

  // Gary 2026-06-03: openMeal widens to QuickLogPanelKey so the hydration pill
  // joins the accordion. 'hydration' routes to the inline hydration panel
  // below; MealType values keep the existing entry/snack routing.
  const [openMeal, setOpenMeal] = useState<QuickLogPanelKey | null>(null);

  // Pull today's hydration totals for the inline panel chip; the same hook
  // backs the nutrition log row + the (retired) desktop widget.
  const { data: hydrationToday, refresh: refreshHydration } = useHydrationToday();
  const hydrationTotalMl = hydrationToday?.total_ml ?? 0;
  const hydrationTargetMl = hydrationToday?.target_ml ?? 1890;

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

  // #170 Phase 1q hotfix 8: cross-reference today's meals by type so the
  // entry panel can show a read-only summary instead of zeroed sliders.
  // Snacks are handled by SnackStackContainer's existing saved-meal rows;
  // per-snack-index existingMeal plumbing deferred (see TODO below).
  const existingByType = useMemo(() => {
    const map = new Map<Exclude<MealType, 'snack'>, Meal | null>();
    const types: ReadonlyArray<Exclude<MealType, 'snack'>> = ['breakfast', 'lunch', 'dinner'];
    for (const t of types) {
      map.set(t, todaysMeals.find((m) => m.mealType === t) ?? null);
    }
    return map;
  }, [todaysMeals]);

  const handleToggle = useCallback((key: QuickLogPanelKey) => {
    setOpenMeal((prev) => (prev === key ? null : key));
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
              {openMeal === 'hydration' ? (
                <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#1A2744]/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-white">
                      {formatVolumeLabel(hydrationTotalMl)} of {formatVolumeLabel(hydrationTargetMl)}
                    </p>
                    <Link
                      href="/wellness-analytics/hydration"
                      aria-label="Open hydration detail"
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
                    >
                      <span>Detail</span>
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                  <HydrationQuickLogButtons
                    surface="dashboard_widget"
                    variant="four"
                    layout="grid"
                    size="medium"
                    onLogged={() => {
                      refreshHydration();
                    }}
                  />
                </div>
              ) : openMeal === 'snack' ? (
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
                  existingMeal={existingByType.get(openMeal) ?? null}
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
