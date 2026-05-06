// Body Tracker — Circumference (13 measurement points) shared types, labels, conversions.

export type MeasurementUnit = 'in' | 'cm';

export const MEASUREMENT_KEYS = [
  'neck',
  'shoulderWidth',
  'rightUpperArm',
  'rightForearm',
  'leftUpperArm',
  'leftForearm',
  'chest',
  'waist',
  'hip',
  'rightUpperThigh',
  'rightCalf',
  'leftUpperThigh',
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
  rightUpperArm: 'right_upper_arm',
  rightForearm: 'right_forearm',
  leftUpperArm: 'left_upper_arm',
  leftForearm: 'left_forearm',
  chest: 'chest',
  waist: 'waist',
  hip: 'hip',
  rightUpperThigh: 'right_upper_thigh',
  rightCalf: 'right_calf',
  leftUpperThigh: 'left_upper_thigh',
  leftCalf: 'left_calf',
};

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  neck: 'Neck',
  shoulderWidth: 'Shoulder Width',
  rightUpperArm: 'R. Upper Arm',
  leftUpperArm: 'L. Upper Arm',
  rightForearm: 'R. Forearm',
  leftForearm: 'L. Forearm',
  chest: 'Chest',
  waist: 'Waist',
  hip: 'Hip',
  rightUpperThigh: 'R. Upper Thigh',
  leftUpperThigh: 'L. Upper Thigh',
  rightCalf: 'R. Calf',
  leftCalf: 'L. Calf',
};

export const BODY_REGIONS: Array<{
  id: 'upper_body' | 'arms' | 'torso' | 'legs';
  label: string;
  measurements: MeasurementKey[];
}> = [
  { id: 'upper_body', label: 'Upper Body', measurements: ['neck', 'shoulderWidth'] },
  { id: 'arms',       label: 'Arms',       measurements: ['rightUpperArm', 'leftUpperArm', 'rightForearm', 'leftForearm'] },
  { id: 'torso',      label: 'Torso',      measurements: ['chest', 'waist', 'hip'] },
  { id: 'legs',       label: 'Legs',       measurements: ['rightUpperThigh', 'leftUpperThigh', 'rightCalf', 'leftCalf'] },
];

// Pairs used by symmetry scoring
export const SYMMETRY_PAIRS: Array<[MeasurementKey, MeasurementKey]> = [
  ['rightUpperArm',   'leftUpperArm'],
  ['rightForearm',    'leftForearm'],
  ['rightUpperThigh', 'leftUpperThigh'],
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

export function calculateWaistToHipRatio(data: CircumferenceMeasurements): number | null {
  if (data.waist === null || data.hip === null || data.hip === 0) return null;
  return Math.round((data.waist / data.hip) * 100) / 100;
}
