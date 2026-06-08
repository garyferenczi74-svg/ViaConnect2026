// Body Tracker: Circumference (13 measurement points) shared types, labels,
// conversions. Updated by Prompt #85d: renamed bicep + quadriceps fields, hip
// removed from this surface. Updated by Prompt #155a: hip reintroduced to the
// measurements UI without reversing #85d's storage architecture; hip read +
// write still go through body_tracker_weight.hips_in (NOT body_tracker_
// circumference) per the WHR-as-source-of-truth pattern. useCircumferenceData
// fetches it via a second query and merges into the latest/previous frames.

export type MeasurementUnit = 'in' | 'cm';

export const MEASUREMENT_KEYS = [
  'neck',
  'shoulderWidth',
  'rightBicep',
  'rightForearm',
  'leftBicep',
  'leftForearm',
  'chest',
  'waist',
  'hip',
  'rightQuadriceps',
  'rightCalf',
  'leftQuadriceps',
  'leftCalf',
] as const;

export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

export type CircumferenceMeasurements = Record<MeasurementKey, number | null>;

export interface CircumferenceRecord extends CircumferenceMeasurements {
  entryDate: string;
  entryUnit: MeasurementUnit;
}

// Maps camelCase TS field to snake_case body_tracker_circumference column.
// Note hip is sourced externally from body_tracker_weight.hips_in (per
// Prompt #85d storage decision). The 'hips_in' value below documents the
// external column name; useCircumferenceData detects MEASUREMENT_EXTERNAL_KEYS
// and routes those reads through a separate query against
// body_tracker_weight, so rowToMeasurements still ignores hip when iterating
// body_tracker_circumference rows.
// Column names verified against the live body_tracker_circumference schema
// (2026-06-08). The live columns for bicep + quadriceps are right_upper_arm /
// left_upper_arm / right_upper_thigh / left_upper_thigh; an earlier drift mapped
// these to right_bicep / right_quadriceps (which do not exist), which silently
// nulled those reads and made a manual entry that filled them fail on insert.
export const MEASUREMENT_DB_COLUMN: Record<MeasurementKey, string> = {
  neck: 'neck',
  shoulderWidth: 'shoulder_width',
  rightBicep: 'right_upper_arm',
  rightForearm: 'right_forearm',
  leftBicep: 'left_upper_arm',
  leftForearm: 'left_forearm',
  chest: 'chest',
  waist: 'waist',
  hip: 'hips_in',
  rightQuadriceps: 'right_upper_thigh',
  rightCalf: 'right_calf',
  leftQuadriceps: 'left_upper_thigh',
  leftCalf: 'left_calf',
};

// Keys that live in a separate Supabase table from body_tracker_circumference.
// useCircumferenceData runs a second query against the named table and merges
// the value into the latest/previous frames at the corresponding key.
export const MEASUREMENT_EXTERNAL_KEYS: Partial<
  Record<MeasurementKey, { table: string; column: string; storedUnit: MeasurementUnit }>
> = {
  hip: { table: 'body_tracker_weight', column: 'hips_in', storedUnit: 'in' },
};

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  neck: 'Neck Circumference',
  shoulderWidth: 'Shoulder Width',
  rightBicep: 'Right Bicep',
  leftBicep: 'Left Bicep',
  rightForearm: 'Right Forearm',
  leftForearm: 'Left Forearm',
  chest: 'Chest Circumference',
  waist: 'Waist Circumference',
  hip: 'Hip Circumference',
  rightQuadriceps: 'Right Quadriceps',
  leftQuadriceps: 'Left Quadriceps',
  rightCalf: 'Right Calf',
  leftCalf: 'Left Calf',
};

// cols controls the responsive grid width applied per region in
// MeasurementsGrid: 2 keeps the original two-column layout for the bilateral
// arms + legs sections; 3 spreads chest, waist, hip across a single row on
// desktop and tablet, stacking to single-column on mobile.
export const BODY_REGIONS: Array<{
  id: 'upper_body' | 'arms' | 'torso' | 'legs';
  label: string;
  cols: 2 | 3;
  measurements: MeasurementKey[];
}> = [
  { id: 'upper_body', label: 'Upper Body', cols: 2, measurements: ['neck', 'shoulderWidth'] },
  { id: 'torso',      label: 'Torso',      cols: 3, measurements: ['chest', 'waist', 'hip'] },
  { id: 'arms',       label: 'Arms',       cols: 2, measurements: ['rightBicep', 'leftBicep', 'rightForearm', 'leftForearm'] },
  { id: 'legs',       label: 'Legs',       cols: 2, measurements: ['rightQuadriceps', 'leftQuadriceps', 'rightCalf', 'leftCalf'] },
];

// Pairs used by symmetry scoring
export const SYMMETRY_PAIRS: Array<[MeasurementKey, MeasurementKey]> = [
  ['rightBicep',      'leftBicep'],
  ['rightForearm',    'leftForearm'],
  ['rightQuadriceps', 'leftQuadriceps'],
  ['rightCalf',       'leftCalf'],
];

// ── Conversions ────────────────────────────────────────────────────────────
export function inchToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}
export function cmToInch(cm: number): number {
  return Math.round((cm / 2.54) * 10) / 10;
}

export function convertMeasurement(
  value: number | null,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit,
): number | null {
  if (value === null) return null;
  if (fromUnit === toUnit) return value;
  return toUnit === 'cm' ? inchToCm(value) : cmToInch(value);
}

export function convertAllMeasurements(
  data: CircumferenceMeasurements,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit,
): CircumferenceMeasurements {
  if (fromUnit === toUnit) return data;
  const out = { ...data };
  for (const k of MEASUREMENT_KEYS) {
    out[k] = convertMeasurement(data[k], fromUnit, toUnit);
  }
  return out;
}

export function emptyMeasurements(): CircumferenceMeasurements {
  return MEASUREMENT_KEYS.reduce<CircumferenceMeasurements>((acc, k) => {
    acc[k] = null;
    return acc;
  }, {} as CircumferenceMeasurements);
}

// ── Symmetry score (0..1) ──────────────────────────────────────────────────
export function calculateCircumferenceBalance(data: CircumferenceMeasurements): number {
  const validPairs: Array<[number, number]> = [];
  for (const [r, l] of SYMMETRY_PAIRS) {
    const rv = data[r];
    const lv = data[l];
    if (rv !== null && lv !== null) validPairs.push([rv, lv]);
  }
  if (validPairs.length === 0) return 0.5;
  const scores = validPairs.map(([rv, lv]) => {
    const diff = Math.abs(rv - lv);
    const avg = (rv + lv) / 2;
    const pctDiff = avg > 0 ? diff / avg : 0;
    return Math.max(0, 1 - pctDiff * 5);
  });
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// Hip is no longer a circumference field as of Prompt #85d. Score-engine
// passes hip from body_tracker_weight.hips_in directly to this helper.
export function calculateWaistToHipRatio(
  waist: number | null,
  hip: number | null,
): number | null {
  if (waist === null || hip === null || hip === 0) return null;
  return Math.round((waist / hip) * 100) / 100;
}
