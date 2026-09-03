// Picasso-pack floor helpers (Brief 59 LOOK amend).
//
// No procedural body paths. Landmark ticks paint only for finite measured
// girths (NO-FABRICATION). Percentages overlay the bundled PNG plate.

import type {
  CircumferenceMeasurements,
  MeasurementKey,
} from '@/lib/body-tracker/circumference';

export type RealGirthSource = 'overlay' | 'measured';

export function isRealGirthSource(
  source: string | null | undefined,
): source is RealGirthSource {
  return source === 'overlay' || source === 'measured';
}

export function selectFloorGirths(
  girths: CircumferenceMeasurements | null | undefined,
  source: string | null | undefined,
): CircumferenceMeasurements | null {
  if (!isRealGirthSource(source) || !girths) return null;
  return girths;
}

export function realGirthKeys(
  girths: CircumferenceMeasurements | null | undefined,
): MeasurementKey[] {
  if (!girths) return [];
  const keys: MeasurementKey[] = [];
  for (const key of Object.keys(girths) as MeasurementKey[]) {
    const value = girths[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      keys.push(key);
    }
  }
  return keys;
}

export const ANATOMICAL_LANDMARK_TICKS: ReadonlyArray<{
  key: MeasurementKey;
  xPct: number;
  yPct: number;
  side: 'left' | 'right' | 'center';
}> = [
  { key: 'neck', xPct: 50, yPct: 16, side: 'center' },
  { key: 'chest', xPct: 50, yPct: 28, side: 'center' },
  { key: 'waist', xPct: 50, yPct: 40, side: 'center' },
  { key: 'hip', xPct: 50, yPct: 48, side: 'center' },
  { key: 'leftBicep', xPct: 28, yPct: 32, side: 'left' },
  { key: 'rightBicep', xPct: 72, yPct: 32, side: 'right' },
  { key: 'leftForearm', xPct: 22, yPct: 42, side: 'left' },
  { key: 'rightForearm', xPct: 78, yPct: 42, side: 'right' },
  { key: 'leftQuadriceps', xPct: 42, yPct: 62, side: 'left' },
  { key: 'rightQuadriceps', xPct: 58, yPct: 62, side: 'right' },
  { key: 'leftCalf', xPct: 43, yPct: 80, side: 'left' },
  { key: 'rightCalf', xPct: 57, yPct: 80, side: 'right' },
];

export function realLandmarkTicks(
  girths: CircumferenceMeasurements | null | undefined,
): Array<(typeof ANATOMICAL_LANDMARK_TICKS)[number]> {
  const present = new Set(realGirthKeys(girths));
  return ANATOMICAL_LANDMARK_TICKS.filter((tick) => present.has(tick.key));
}
