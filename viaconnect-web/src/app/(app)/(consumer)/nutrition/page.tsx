'use client';

// Prompt 183 Task 6 (2026-06-10): /nutrition is now a thin wrapper around the
// My Nutrition bento hub. The prior long scroll page (the score card, the daily
// macros card, the Log a Meal block, the daily totals tab, the saved meals
// grid, the insights card, and the meal history list) is superseded here; the
// hub assembles the Task 1 to 5 pieces into the banded bento and reaches every
// one of those surfaces. Those components are NOT deleted, just no longer
// rendered on this page.
//
// The full bleed mobile hero is removed: the hub body sits on plain Deep Navy
// (#1A2744). A Suspense boundary wraps the hub because it reads the metrics +
// handoff hooks on mount. The nav already points at /nutrition so no sidebar or
// mobile nav change is needed.

import { Suspense } from 'react';
import { NutritionHub } from '@/components/nutrition/hub/NutritionHub';

export default function NutritionPage() {
  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <Suspense fallback={<div className="h-12" />}>
        <NutritionHub />
      </Suspense>
    </div>
  );
}
