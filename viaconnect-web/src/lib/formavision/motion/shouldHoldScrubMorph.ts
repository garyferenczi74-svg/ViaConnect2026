// Scrub vs circumference-morph gate (Arnold SSOT after #171).
//
// A latched scrubVector with null girths (journey built from empty circHistory)
// must not suppress morphTo from props.circumferences. Journey rest/play-end
// should pass null; this is the Canvas harden if a stale template scrub remains.

import { anyCircumferencePresent } from '@/lib/body-tracker/composition/scanSpineContract';
import type { CircumferenceMeasurements } from '@/lib/body-tracker/circumference';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

export function bodyVectorHasFiniteGirth(vec: BodyParamVector | null | undefined): boolean {
  if (!vec) return false;
  if (vec.rings.some((r) => typeof r.circumferenceM === 'number' && Number.isFinite(r.circumferenceM))) {
    return true;
  }
  return vec.arms.some(
    (a) =>
      (typeof a.bicepM === 'number' && Number.isFinite(a.bicepM)) ||
      (typeof a.forearmM === 'number' && Number.isFinite(a.forearmM)),
  );
}

/** True when an active scrub should block the circumferences morph. */
export function shouldHoldScrubMorph(
  scrubVector: BodyParamVector | null | undefined,
  circumferences: CircumferenceMeasurements | null | undefined,
): boolean {
  if (scrubVector == null) return false;
  if (anyCircumferencePresent(circumferences) && !bodyVectorHasFiniteGirth(scrubVector)) {
    return false;
  }
  return true;
}
