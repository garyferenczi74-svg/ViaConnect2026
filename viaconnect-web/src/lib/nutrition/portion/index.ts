// Prompt #170 Phase 1f: barrel for the NutriVision portion engine.
// Downstream callers (corpus writer, resolver, route layer) import everything
// they need from this barrel. Internal helpers are not re-exported.

export type {
  FoodDensity,
  PortionEstimate,
  PortionEstimationMethod,
  ReferenceObject,
  ReferenceObjectKind,
} from './types';

export { densityFor, DENSITY_BUCKETS } from './density-table';
export {
  REFERENCE_CATALOG,
  pixelsPerMmFromReference,
  bboxAreaCm2,
} from './reference-objects';
export {
  estimatePortion,
  bboxLongestEdgePx,
  clampGrams,
  type PortionEstimateInput,
} from './volume-estimate';
