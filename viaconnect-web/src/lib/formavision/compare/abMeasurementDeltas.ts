// Prompt Brief 2: measurement deltas for the 3D A/B compare panel.
//
// Circumference deltas only. Body-fat and muscle stay on the composition
// cards; this panel does not re-derive them. UNKNOWN (null) on either side
// is omitted by computeCompositionDeltas, never coerced to 0.

import { computeCompositionDeltas } from '@/lib/formavision/deltas/compositionDeltas';
import type { CircumferenceDelta } from '@/lib/formavision/deltas/compositionDeltas';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';

export interface ComputeAbMeasurementDeltasInput {
  baselineComposition: CompositionSnapshot | null;
  latestComposition: CompositionSnapshot | null;
  baselineCircumferences: CircumferenceMeasurements | null;
  latestCircumferences: CircumferenceMeasurements | null;
  unit: MeasurementUnit;
}

/**
 * Latest-vs-baseline circumference deltas. Null/UNKNOWN sides are omitted.
 * A real measured 0 is preserved by the shared delta lib (not treated as UNKNOWN).
 */
export function computeAbMeasurementDeltas(
  input: ComputeAbMeasurementDeltasInput,
): CircumferenceDelta[] {
  const result = computeCompositionDeltas({
    firstComposition: input.baselineComposition,
    latestComposition: input.latestComposition,
    firstCircumferences: input.baselineCircumferences,
    latestCircumferences: input.latestCircumferences,
    unit: input.unit,
  });
  return result.circumferences;
}
