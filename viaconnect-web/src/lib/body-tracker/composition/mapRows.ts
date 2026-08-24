// Pure mapping: DB rows -> CompositionSnapshot.
// CRITICAL: preserve a real numeric 0 as 0; coerce undefined/missing to null.
// null === UNKNOWN - never silently coerce to 0.

import type { CompositionSnapshot, RegionMap } from './types';
import { parseFormaVisionEstimateNote } from './estimateNote';

type EntryRow = {
  id: string;
  source: 'scan' | 'manual';
  created_at: string;
  scan_id?: string | null;
  notes?: string | null;
} | null;

type FatRow = Record<string, unknown> | null;
type MuscleRow = Record<string, unknown> | null;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fatRegionMap(fat: Record<string, unknown>): RegionMap {
  return {
    right_arm: toNum(fat['right_arm_pct']),
    left_arm: toNum(fat['left_arm_pct']),
    trunk: toNum(fat['trunk_pct']),
    right_leg: toNum(fat['right_leg_pct']),
    left_leg: toNum(fat['left_leg_pct']),
  };
}

function muscleRegionMap(muscle: Record<string, unknown>): RegionMap {
  return {
    right_arm: toNum(muscle['right_arm_lbs']),
    left_arm: toNum(muscle['left_arm_lbs']),
    trunk: toNum(muscle['trunk_lbs']),
    right_leg: toNum(muscle['right_leg_lbs']),
    left_leg: toNum(muscle['left_leg_lbs']),
  };
}

const EMPTY_REGION: RegionMap = {
  right_arm: null,
  left_arm: null,
  trunk: null,
  right_leg: null,
  left_leg: null,
};

export function mapRows(args: {
  entry: EntryRow;
  fat: FatRow;
  muscle: MuscleRow;
}): CompositionSnapshot | null {
  const { entry, fat, muscle } = args;
  if (!entry) return null;

  const range = parseFormaVisionEstimateNote(entry.notes);
  const isScan = entry.source === 'scan' || Boolean(entry.scan_id);

  return {
    entryId: entry.id,
    source: entry.source,
    recordedAt: entry.created_at,
    totalBodyFatPct: fat ? toNum(fat['total_body_fat_pct']) : null,
    regionFatPct: fat ? fatRegionMap(fat) : { ...EMPTY_REGION },
    visceralFatRating: fat ? toNum(fat['visceral_fat_rating']) : null,
    bodyWaterPct: fat ? toNum(fat['body_water_pct']) : null,
    regionMuscleLbs: muscle ? muscleRegionMap(muscle) : { ...EMPTY_REGION },
    totalMuscleMassLbs: muscle ? toNum(muscle['total_muscle_mass_lbs']) : null,
    skeletalMuscleMassLbs: muscle ? toNum(muscle['skeletal_muscle_mass_lbs']) : null,
    scanId: entry.scan_id ?? null,
    estimatedBodyFatMin: range?.min ?? null,
    estimatedBodyFatMax: range?.max ?? null,
    isEstimated: isScan,
  };
}
