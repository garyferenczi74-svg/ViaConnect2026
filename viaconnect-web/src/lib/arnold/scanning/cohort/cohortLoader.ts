// Prompt 211b Workstream 1A -- cohort data loader.
//
// Maps cohort_labeled_measurements rows to the LabeledSample[] type that
// runValidation() consumes. Pure TypeScript: no IO here. The DB dependency is
// injected so tests can mock it at the boundary without touching any real DB.
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency.
// OBRA discipline: minimum code that solves the problem.

import type { GirthRegion } from '../accuracy/accuracyTargets';
import type { LabeledSample } from '../accuracy/validationHarness';

// ---------------------------------------------------------------------------
// DB row shape (matches cohort_labeled_measurements exactly)
// ---------------------------------------------------------------------------

/**
 * A single row from cohort_labeled_measurements as returned by the DB client.
 * Only the columns needed for harness input are required here; additional
 * columns (session_id, measurer_id, created_at) are not needed for validation
 * and are omitted from this type on purpose.
 */
export interface CohortMeasurementRow {
  /** UUID primary key. */
  id: string;
  /** FK to cohort_subjects. */
  subject_id: string;
  /** One of the eight GirthRegion values. Validated by DB CHECK constraint. */
  region: string;
  /** Pipeline's calibrated prediction in centimetres. */
  predicted_cm: number;
  /** Tape-measure ground truth in centimetres. */
  truth_cm: number;
  /** Optional: biological sex of the subject, pulled by joining cohort_subjects.
   *  'male' | 'female' | 'other'. When 'other' or absent, sex is omitted from
   *  LabeledSample (harness treats missing sex as undifferentiated). */
  sex?: string | null;
}

// ---------------------------------------------------------------------------
// Validation -- narrow the DB string to GirthRegion
// ---------------------------------------------------------------------------

const VALID_REGIONS = new Set<string>([
  'neck', 'upperArm', 'forearm', 'upperLeg', 'lowerLeg', 'chest', 'waist', 'hip',
]);

function isGirthRegion(v: string): v is GirthRegion {
  return VALID_REGIONS.has(v);
}

function toSex(v: string | null | undefined): 'male' | 'female' | undefined {
  if (v === 'male') return 'male';
  if (v === 'female') return 'female';
  return undefined;
}

// ---------------------------------------------------------------------------
// Loader errors
// ---------------------------------------------------------------------------

export class CohortLoaderError extends Error {
  readonly rowId: string;
  constructor(message: string, rowId: string) {
    super(message);
    this.name = 'CohortLoaderError';
    this.rowId = rowId;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates and maps an array of raw DB rows to LabeledSample[].
 *
 * Rows with an invalid region string throw CohortLoaderError (which
 * indicates a data-integrity problem, since the DB CHECK constraint should
 * prevent it, but we guard defensively).
 *
 * Rows with non-positive predicted_cm or truth_cm are skipped and reported
 * in the returned `skipped` count (also a DB constraint violation, so rare).
 *
 * @param rows - Rows from cohort_labeled_measurements (joined with subject sex).
 * @returns { samples, skipped } where samples is the clean LabeledSample array.
 */
export function rowsToLabeledSamples(rows: CohortMeasurementRow[]): {
  samples: LabeledSample[];
  skipped: number;
} {
  let skipped = 0;
  const samples: LabeledSample[] = [];

  for (const row of rows) {
    if (!isGirthRegion(row.region)) {
      throw new CohortLoaderError(
        `Unknown region '${row.region}' in cohort_labeled_measurements row ${row.id}`,
        row.id,
      );
    }

    if (row.predicted_cm <= 0 || row.truth_cm <= 0) {
      skipped += 1;
      continue;
    }

    const sample: LabeledSample = {
      predictedCm: row.predicted_cm,
      truthCm:     row.truth_cm,
      region:      row.region,
    };

    const sex = toSex(row.sex);
    if (sex !== undefined) {
      sample.sex = sex;
    }

    samples.push(sample);
  }

  return { samples, skipped };
}
