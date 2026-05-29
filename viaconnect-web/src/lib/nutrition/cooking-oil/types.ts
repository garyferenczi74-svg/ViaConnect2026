// Prompt #170 Phase 1g: type re-exports for the cooking-oil module so
// consumers can `import type { ... } from '@/lib/nutrition/cooking-oil/types'`.

export type {
  CookingOilType,
  CookingOilSelection,
  OilSuggestionInput,
  OilSuggestion,
  OilMacroDelta,
} from './suggester';
