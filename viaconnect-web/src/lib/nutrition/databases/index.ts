// Prompt #170 Phase 1e: barrel for the NutriVision nutrient-resolution layer.
// Downstream callers (detect orchestrator, /api/nutrition routes) import from here.

export {
  resolveNutrients,
  type NutrientSource,
  type ResolvedNutrients,
  type ResolvedPer100g,
  type ResolveOpts,
  type VisionFallback,
} from './resolver';

export {
  lookupCurated,
  type CuratedNutrients,
  type CuratedPer100g,
  type CuratedLookupOpts,
  type CuratedSource,
} from './farmceutica-curated';

export {
  lookupByBarcode,
  searchByText,
  type OFFNutrients,
  type OFFPer100g,
  type OFFLookupOpts,
  type OFFSource,
} from './open-food-facts';
