// Body Tracker — Circumference (12 measurement points) shared types, labels,
// conversions. Updated by Prompt #85d: renamed bicep + quadriceps fields, hip
// removed from this surface. WHR scoring sources hip from body_tracker_weight.

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

// Maps camelCase TS field to snake_case body_tracker_circumference column
export const MEASUREMENT_DB_COLUMN: Record<MeasurementKey, string> = {
  neck: 'neck',
  shoulderWidth: 'shoulder_width',
  rightBicep: 'right_bicep',
  rightForearm: 'right_forearm',
  leftBicep: 'left_bicep',
  leftForearm: 'left_forearm',
  chest: 'chest',
  waist: 'waist',
  rightQuadriceps: 'right_quadriceps',
  rightCalf: 'right_calf',
  leftQuadriceps: 'left_quadriceps',
  leftCalf: 'left_calf',
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
  rightQuadriceps: 'Right Quadriceps',
  leftQuadriceps: 'Left Quadriceps',
  rightCalf: 'Right Calf',
  leftCalf: 'Left Calf',
};

export const BODY_REGIONS: Array<{
  id: 'upper_body' | 'arms' | 'torso' | 'legs';
  label: string;
  measurements: MeasurementKey[];
}> = [
  { id: 'upper_body', label: 'Upper Body', measurements: ['neck', 'shoulderWidth'] },
  { id: 'torso',      label: 'Torso',      measurements: ['chest', 'waist'] },
  { id: 'arms',       label: 'Arms',       measurements: ['rightBicep', 'leftBicep', 'rightForearm', 'leftForearm'] },
  { id: 'legs',       label: 'Legs',       measurements: ['rightQuadriceps', 'leftQuadriceps', 'rightCalf', 'leftCalf'] },
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
