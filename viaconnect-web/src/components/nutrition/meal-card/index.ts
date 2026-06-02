// Prompt 172 Phase 1A + 1B: meal-card module barrel.
//
// Exports MealCard (the presentational component), MacroChips (its chip
// child), toMealCardModel (the orchestrator boundary mapper), and the
// view model types. 1B adds DegradedServiceKind to the public surface so
// orchestrator boundaries can type the 170c section 10.3 kind discriminator
// they thread into the mapper.

export { MealCard } from './MealCard';
export type { MealCardProps } from './MealCard';
export { MacroChips } from './MacroChips';
export type { MacroChipsProps } from './MacroChips';
export { toMealCardModel } from './mealCardModel';
export type { ToMealCardModelInput } from './mealCardModel';
export type {
  DegradedServiceKind,
  MealCardItem,
  MealCardModel,
  MealCardSource,
  MealMacros,
  BosLine,
} from './MealCard.types';
