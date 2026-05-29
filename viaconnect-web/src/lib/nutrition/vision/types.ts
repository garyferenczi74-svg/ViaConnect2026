// Prompt #170 Phase 1c: shared types for the NutriVision multi-provider pipeline.
// These types are the contract between provider clients (LogMeal, Gemini,
// Claude Vision) and the reconcile module that arbitrates their outputs.
// Per Prompt 170 §2.2 the provider order is primary then secondary then
// tertiary, with reconcile merging on overlapping bounding boxes.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

export type CuisineTag =
  | 'north_american'
  | 'mediterranean'
  | 'latin_american'
  | 'east_asian'
  | 'south_asian'
  | 'southeast_asian'
  | 'middle_eastern'
  | 'african'
  | 'unknown';

export type CookingMethod =
  | 'raw'
  | 'steamed'
  | 'grilled'
  | 'baked'
  | 'boiled'
  | 'sauteed'
  | 'fried'
  | 'deep_fried'
  | 'unknown';

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type RecognitionProvider = 'logmeal' | 'gemini' | 'claude_vision';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VisionItem {
  id: string;
  foodName: string;
  foodLanguage?: string;
  cuisineTag?: CuisineTag;
  boundingBox: BoundingBox;
  confidence: number;
  portionGramsHint?: number;
  portionVolumeMlHint?: number;
  cookingMethod?: CookingMethod;
  rawProviderPayload?: unknown;
}

export interface ProviderRecognition {
  provider: RecognitionProvider;
  items: ReadonlyArray<VisionItem>;
  latencyMs: number;
  meanConfidence: number;
}

export interface ReconciledRecognition {
  items: ReadonlyArray<VisionItem>;
  providerPrimary: RecognitionProvider;
  providerSecondary?: RecognitionProvider;
  providerTertiary?: RecognitionProvider;
  mealConfidence: number;
  warnings: ReadonlyArray<string>;
}
