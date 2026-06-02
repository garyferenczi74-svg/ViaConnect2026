// Prompt 172 Phase 1A: meal-card module barrel.
//
// Exports MealCard (the presentational component), MacroChips (its chip
// child), toMealCardModel (the orchestrator boundary mapper), and the
// view model types. The orchestrator (AnalysisResult.tsx) imports from
// the package root via the @/components/nutrition/meal-card alias.

export { MealCard } from './MealCard';
export type { MealCardProps } from './MealCard';
export { MacroChips } from './MacroChips';
export type { MacroChipsProps } from './MacroChips';
export { toMealCardModel } from './mealCardModel';
export type { ToMealCardModelInput } from './mealCardModel';
export type {
  MealCardItem,
  MealCardModel,
  MealCardSource,
  MealMacros,
  BosLine,
} from './MealCard.types';
