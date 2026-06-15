// Prompt 200 (2026-06-15): static stub for the nutrition Progress view, reached
// from the Progress tile on the My Nutrition hub. A future prompt builds the
// real view. Thin host only: a back link plus the page heading and a neutral
// coming soon line. No data path is opened here. The consumer layout paints
// Deep Navy.

import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink';

export default function NutritionProgressPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <BackToNutritionLink />
      <h1 className="mt-4 text-xl font-semibold text-white md:text-2xl">Progress</h1>
      <p className="mt-2 text-sm text-white/55">
        Your nutrition progress view is coming soon.
      </p>
    </div>
  );
}
