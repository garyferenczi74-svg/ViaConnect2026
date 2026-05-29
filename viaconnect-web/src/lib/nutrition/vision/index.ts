// Prompt #170 Phase 1c: barrel for the NutriVision multi-provider pipeline.
// Downstream callers (resolver, route layer) import everything they need from
// this barrel; provider implementations are not re-exported wholesale to keep
// the surface minimal.

export type {
  BoundingBox,
  ConfidenceBand,
  CookingMethod,
  CuisineTag,
  ProviderRecognition,
  ReconciledRecognition,
  RecognitionProvider,
  VisionItem,
} from './types';

export { reconcile, computeIoU, looseLabelEquals, type ReconcileInput } from './reconcile';

export { recognizeWithLogMeal, type LogMealOpts } from './providers/logmeal';
export { recognizeWithClaude, type ClaudeVisionOpts } from './providers/claude-vision';
