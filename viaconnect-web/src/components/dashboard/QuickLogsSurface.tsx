'use client';

// Prompt #168c section 2.1: top-level Dashboard Quick Logs surface.
// Header + tab strip (Breakfast/Lunch/Dinner/Snacks) + active-tab content.
// Replaces the QuickLogModal-button pattern from #168 Apply C with the inline
// tabbed UI per Gary's directive 2026-05-15.

import { useEffect, useMemo, useState } from 'react';
import type { Meal, MealType, NutritionTargets, MealDistribution } from '@/lib/gordon/types';
import type { QuickLogDraft } from '@/components/meals/QuickLogModal';
import { QuickLogsMealTypeTab } from './QuickLogsMealTypeTab';
import { QuickLogEntryBlock } from './QuickLogEntryBlock';
import { SnackStackContainer } from './SnackStackContainer';

export interface QuickLogsSurfaceProps {
  readonly userId: string | null;
  readonly targets: NutritionTargets;
  readonly mealDistribution?: MealDistribution;
  // Today's meals from useUserMeals. Used to: detect completion per meal type
  // for the green checkmark badges, default-select the next unlogged meal,
  // populate the snack stack.
  readonly todaysMeals: ReadonlyArray<Meal>;
  // Save handler. For B/L/D the snack_index is null. For snacks the parent
  // (dashboard page) passes snack_index explicitly per spec section 2.2.
  readonly onSaveMeal: (draft: QuickLogDraft, snackIndex: number | null) => void | Promise<void>;
}

const MEAL_ORDER: ReadonlyArray<MealType> = ['breakfast', 'lunch', 'dinner', 'snack'];

function pickDefaultTab(loggedTypes: ReadonlySet<MealType>): MealType {
  for (const t of MEAL_ORDER) {
    if (!loggedTypes.has(t)) return t;
  }
  return 'snack';
}

export function QuickLogsSurface(props: QuickLogsSurfaceProps) {
  const { userId, targets, mealDistribution, todaysMeals, onSaveMeal } = props;

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

  const [selectedTab, setSelectedTab] = useState<MealType>(() => pickDefaultTab(completedSet));

  // Re-run default-tab selection only when the surface first mounts with data.
  // After mount, user keeps control of which tab is open.
  const initRef = useState({ done: false })[0];
  useEffect(() => {
    if (!initRef.done && todaysMeals.length >= 0) {
      setSelectedTab(pickDefaultTab(completedSet));
      initRef.done = true;
    }
  }, [todaysMeals.length, completedSet, initRef]);

  return (
    <section
      aria-labelledby="dashboard-quick-log-heading"
      className="rounded-2xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4 md:p-5"
    >
      <header className="mb-4">
        <h2
          id="dashboard-quick-log-heading"
          className="text-[15px] font-semibold uppercase tracking-[0.10em] text-white/80"
        >
          Quick Log
        </h2>
        <p className="mt-1 text-[12px] text-white/55">
          Log macros in grams across 8 nutrients. Gordon scores against your personalized targets.
        </p>
      </header>

      <div className="mb-4">
        <QuickLogsMealTypeTab
          selected={selectedTab}
          onSelect={setSelectedTab}
          completed={completedSet}
          snackCount={todaysSnacks.length}
        />
      </div>

      <div>
        {selectedTab === 'snack' ? (
          <SnackStackContainer
            targets={targets}
            mealDistribution={mealDistribution}
            todaysSnacks={todaysSnacks}
            onSaveSnack={(draft, computedSnackIndex) => onSaveMeal(draft, computedSnackIndex)}
          />
        ) : (
          <QuickLogEntryBlock
            mealType={selectedTab}
            targets={targets}
            mealDistribution={mealDistribution}
            snacksLoggedToday={todaysSnacks.length}
            onSave={(draft) => onSaveMeal(draft, null)}
          />
        )}
      </div>

      {!userId ? (
        <p className="mt-3 text-[12px] text-white/55">Sign in to save meals.</p>
      ) : null}
    </section>
  );
}

export default QuickLogsSurface;
