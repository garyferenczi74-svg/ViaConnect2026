// Prompt 183c (2026-06-11): the Save My Meals page. The recipes library used to
// render inline on the My Nutrition hub; it now lives here on its own route and
// is reached from the Save My Meal tile on the hub. Thin host only: a back link
// to the hub plus the existing RecipesLibrarySection, which still self gates on
// the NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED flag and owns all of its own data,
// API calls, controls, and modals. No new data path is opened here.
//
// A server component is enough since this file adds no hooks; it just hosts the
// client RecipesLibrarySection inside a wide centered container so the recipe
// grid breathes. The page wrapper paints Deep Navy via the consumer layout.

import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink';
import { RecipesLibrarySection } from '@/components/recipes/RecipesLibrarySection';

export default function SavedMealsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <BackToNutritionLink />
      <RecipesLibrarySection />
    </div>
  );
}
