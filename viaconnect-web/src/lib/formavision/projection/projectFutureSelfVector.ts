// Pure projection lib: current scan + goal BF% -> projected BodyParamVector.
// Phase 5 (Projected Future Self), P5-T1a. No React, no Canvas, no Date.now,
// no Math.random. Deterministic. See task-P5-T1a-brief.md for full spec.
//
// Honesty contract: returns a DISABLED result (never a fabricated body) when
// goalBodyFatPct is null or the current body-fat baseline is unknown. A null
// circumference is preserved as null through to the BodyParamVector (estimated
// ring), never invented.
//
// Unit hazard: CIRC_DELTA_PER_BF_POINT is in CM per 1% BF point. The
// CircumferenceMeasurements values carry no embedded unit - they are already in
// the caller's `unit` (cm or in). Every delta is converted to the active unit
// before being applied, so the projection cannot silently 2.54x-distort.

import { CIRC_DELTA_PER_BF_POINT } from '@/lib/arnold/scanning/futureMeProjector';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { MEASUREMENT_KEYS } from '@/lib/body-tracker/circumference';
import type { BodyParamVector, Sex } from '@/lib/formavision/geometry/types';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementKey,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';

// ---- public types ----------------------------------------------------------

export type FutureSelfProjection =
  | {
      kind: 'projected';
      vector: BodyParamVector;
      bfDelta: number;
      projectedBodyFatPct: number;
    }
  | {
      kind: 'disabled';
      reason: 'no-goal' | 'no-current-scan';
    };

// ---- internal constants ----------------------------------------------------

// Sane lower bound in cm, mirroring Math.max(10, ...) in futureMeProjector.ts.
const FLOOR_CM = 10;

// Empirical model region for each MEASUREMENT_KEY.
// Keys absent from this map carry no fat-loss delta and stay unchanged.
//
// Mapping rationale:
// neck             -> neck  (0.15 cm/% BF): fat pad around the neck changes with BF.
// chest            -> chest (0.35 cm/% BF): pectoral and sub-scapular adipose.
// waist            -> waist (0.90 cm/% BF): abdominal adipose; highest sensitivity in model.
// hip              -> hip   (0.45 cm/% BF): gluteal and hip fat stores.
// rightBicep       -> bicep (0.15 cm/% BF): upper-arm subcutaneous fat pad.
// leftBicep        -> bicep (0.15 cm/% BF): symmetrical to right bicep.
// rightQuadriceps  -> thigh (0.45 cm/% BF): thigh fat stores.
// leftQuadriceps   -> thigh (0.45 cm/% BF): symmetrical to right quadriceps.
// rightCalf        -> calf  (0.15 cm/% BF): calf fat pad.
// leftCalf         -> calf  (0.15 cm/% BF): symmetrical to right calf.
// shoulderWidth    -> no delta: lateral bony width, not a girth; fat has minimal effect.
// rightForearm     -> no delta: forearm subcutaneous fat is negligible relative to model
//                    precision; conservative omission prevents over-projection.
// leftForearm      -> no delta: same rationale as rightForearm.
type DeltaRegion = keyof typeof CIRC_DELTA_PER_BF_POINT;

const KEY_TO_REGION: Partial<Record<MeasurementKey, DeltaRegion>> = {
  neck:             'neck',
  chest:            'chest',
  waist:            'waist',
  hip:              'hip',
  rightBicep:       'bicep',
  leftBicep:        'bicep',
  rightQuadriceps:  'thigh',
  leftQuadriceps:   'thigh',
  rightCalf:        'calf',
  leftCalf:         'calf',
};

// ---- public function -------------------------------------------------------

/**
 * Projects a future-self BodyParamVector from the user's current scan and a
 * goal body-fat percentage. Returns a DISABLED discriminant when projection is
 * not defensible (no goal set, or current body-fat is unknown).
 *
 * This function ONLY produces the geometry vector. Weight, timeline, and
 * weeks-to-goal are out of scope (handled in P5-T1b panel readouts).
 */
export function projectFutureSelfVector(
  current: {
    snapshot: CompositionSnapshot;
    circumferences: CircumferenceMeasurements | null;
    sex: Sex;
    unit: MeasurementUnit;
  },
  goalBodyFatPct: number | null,
): FutureSelfProjection {
  // Honesty gate 1: no goal means nothing to project.
  if (goalBodyFatPct === null) {
    return { kind: 'disabled', reason: 'no-goal' };
  }

  // Honesty gate 2: cannot compute a delta from an unknown baseline.
  const currentBF = current.snapshot.totalBodyFatPct;
  if (currentBF === null) {
    return { kind: 'disabled', reason: 'no-current-scan' };
  }

  const bfDelta = goalBodyFatPct - currentBF; // negative = cut, positive = bulk
  const { unit } = current;

  // Floor in the active unit space so the clamp is consistent with measurement values.
  const floorInUnit = unit === 'cm' ? FLOOR_CM : FLOOR_CM / 2.54;

  // Project each of the 13 circumference keys. Iterating MEASUREMENT_KEYS ensures
  // the result record is complete (Record<MeasurementKey, number | null>).
  const projectedCircumferences = MEASUREMENT_KEYS.reduce<CircumferenceMeasurements>(
    (acc, key) => {
      const raw = current.circumferences !== null ? current.circumferences[key] : null;

      // UNKNOWN (null) is preserved: the downstream scanToParamVector will mark
      // the corresponding ring estimated. Never fabricate a number.
      if (raw === null) {
        acc[key] = null;
        return acc;
      }

      const region = KEY_TO_REGION[key];
      if (region === undefined) {
        // No mapped delta for this key (shoulderWidth, forearms). Leave unchanged.
        acc[key] = raw;
        return acc;
      }

      // UNIT HAZARD: CIRC_DELTA_PER_BF_POINT is in CM per 1% BF point.
      // Divide by 2.54 to convert the cm-delta to inches before applying, so
      // the delta operates in the same space as the measurement values.
      const deltaCm = bfDelta * CIRC_DELTA_PER_BF_POINT[region];
      const deltaInUnit = unit === 'cm' ? deltaCm : deltaCm / 2.54;

      // Clamp to a sane floor in the active unit (mirrors futureMeProjector Math.max(10, ...)).
      acc[key] = Math.max(floorInUnit, raw + deltaInUnit);
      return acc;
    },
    {} as CircumferenceMeasurements,
  );

  // Project body-fat in the snapshot; all other composition fields kept as-is.
  // The vector is driven by circumferences + sex, not by the composition readouts.
  const projectedSnapshot: CompositionSnapshot = {
    ...current.snapshot,
    totalBodyFatPct: goalBodyFatPct,
  };

  const vector = scanToParamVector({
    snapshot: projectedSnapshot,
    circumferences: projectedCircumferences,
    sex: current.sex,
    unit,
  });

  return {
    kind: 'projected',
    vector,
    bfDelta,
    projectedBodyFatPct: goalBodyFatPct,
  };
}
