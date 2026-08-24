'use client';

/**
 * Prompt 219e: Dashboard window into My Nutrition.
 * Replaces Quick Log. Actions, Today's Meals, and Daily Macros all consume
 * Gordon-owned shared components (no dashboard nutrition math).
 */

import { LogYourMealActions } from '@/components/nutrition/LogYourMealActions';
import { NutritionTodaysMeals } from '@/components/nutrition/hub/NutritionTodaysMeals';
import { DailyMacrosCard } from '@/components/nutrition/DailyMacrosCard';

export interface DashboardLogYourMealSectionProps {
  readonly userId: string | null;
}

export function DashboardLogYourMealSection({
  userId,
}: DashboardLogYourMealSectionProps) {
  return (
    <section
      data-testid="dashboard-log-your-meal"
      aria-labelledby="dashboard-log-your-meal-heading"
      className="rounded-2xl border border-white/10 bg-[#1E3054]/35 p-4 backdrop-blur-md md:p-5"
    >
      <header className="mb-4">
        <h2
          id="dashboard-log-your-meal-heading"
          className="text-[15px] font-semibold uppercase tracking-[0.10em] text-white/80"
        >
          Log Your Meal
        </h2>
        <p className="mt-1 text-[12px] text-white/55">
          Same tools as My Nutrition. Meals and macros stay in one place.
        </p>
      </header>

      <div className="mb-5">
        <LogYourMealActions />
      </div>

      {/* Desktop: Today's Meals + Daily Macros side by side; mobile stacks. */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 overflow-hidden">
          <NutritionTodaysMeals userId={userId} />
        </div>
        <div className="min-w-0">
          <DailyMacrosCard />
        </div>
      </div>
    </section>
  );
}

export default DashboardLogYourMealSection;
