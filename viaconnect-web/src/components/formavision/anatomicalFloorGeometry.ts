// Bundled FormaVision anatomical 2D floor (Brief 59).
//
// Designed muscle-line figure — A-pose, ankle crop, plasma-teal chrome lock.
// Not the #177 circle-head / oval-torso stick. Not a morph. Not SVG→mesh.
// Landmark ticks are painted only for finite measured girths (NO-FABRICATION).

import type {
  CircumferenceMeasurements,
  MeasurementKey,
} from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';

export const ANATOMICAL_FLOOR_VIEWBOX = '0 0 200 360' as const;

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

// Tick anchors sit on the A-pose figure. Only keys with a real girth render.
export const ANATOMICAL_LANDMARK_TICKS: ReadonlyArray<{
  key: MeasurementKey;
  x: number;
  y: number;
  side: 'left' | 'right' | 'center';
}> = [
  { key: 'neck', x: 100, y: 70, side: 'center' },
  { key: 'chest', x: 100, y: 108, side: 'center' },
  { key: 'waist', x: 100, y: 158, side: 'center' },
  { key: 'hip', x: 100, y: 192, side: 'center' },
  { key: 'leftBicep', x: 48, y: 128, side: 'left' },
  { key: 'rightBicep', x: 152, y: 128, side: 'right' },
  { key: 'leftForearm', x: 36, y: 168, side: 'left' },
  { key: 'rightForearm', x: 164, y: 168, side: 'right' },
  { key: 'leftQuadriceps', x: 84, y: 246, side: 'left' },
  { key: 'rightQuadriceps', x: 116, y: 246, side: 'right' },
  { key: 'leftCalf', x: 86, y: 312, side: 'left' },
  { key: 'rightCalf', x: 114, y: 312, side: 'right' },
];

export function realLandmarkTicks(
  girths: CircumferenceMeasurements | null | undefined,
): Array<(typeof ANATOMICAL_LANDMARK_TICKS)[number]> {
  const present = new Set(realGirthKeys(girths));
  return ANATOMICAL_LANDMARK_TICKS.filter((tick) => present.has(tick.key));
}

// Male: broader shoulders, narrower hips. A-pose arms reach ~x=20 / x=180.
// Cropped at the ankles (y≈352) — no feet.
export const MALE_ANATOMICAL_CONTOUR =
  'M100 8 C116 8 128 22 127 40 C126 52 116 60 108 64 C107 72 106 80 105 86 C124 82 144 90 156 106 C170 124 178 146 180 168 C181 180 174 188 162 184 C152 180 148 166 146 152 C144 138 140 126 134 118 C131 128 129 144 130 162 C131 184 128 206 124 224 C120 242 118 258 120 274 C122 296 124 320 122 338 C121 346 116 352 108 352 C104 352 102 348 101 340 L99 340 C98 348 96 352 92 352 C84 352 79 346 78 338 C76 320 78 296 80 274 C82 258 80 242 76 224 C72 206 69 184 70 162 C71 144 69 128 66 118 C60 126 56 138 54 152 C52 166 48 180 38 184 C26 188 19 180 20 168 C22 146 30 124 44 106 C56 90 76 82 95 86 C94 80 93 72 92 64 C84 60 74 52 73 40 C72 22 84 8 100 8 Z';

// Female: narrower shoulders, cinched waist, wider hips. Same A-pose + ankle crop.
export const FEMALE_ANATOMICAL_CONTOUR =
  'M100 10 C114 10 124 24 123 40 C122 51 114 58 107 62 C106 70 105 78 104 84 C118 82 134 88 144 102 C156 118 162 138 164 160 C165 172 158 180 148 176 C140 172 138 160 136 148 C134 136 130 126 126 118 C124 128 123 144 124 162 C125 182 128 200 130 216 C132 232 136 248 138 264 C136 288 134 316 130 336 C129 344 124 350 114 351 C108 352 104 348 102 340 L98 340 C96 348 92 352 86 351 C76 350 71 344 70 336 C66 316 64 288 62 264 C64 248 68 232 70 216 C72 200 75 182 76 162 C77 144 76 128 74 118 C70 126 66 136 64 148 C62 160 60 172 52 176 C42 180 35 172 36 160 C38 138 44 118 56 102 C66 88 82 82 96 84 C95 78 94 70 93 62 C86 58 78 51 77 40 C76 24 86 10 100 10 Z';

export function anatomicalContourPath(sex: Sex): string {
  return sex === 'female' ? FEMALE_ANATOMICAL_CONTOUR : MALE_ANATOMICAL_CONTOUR;
}

// Soft volume fill uses the same silhouette so the navy plate never shows
// through holes. Muscle-line strokes sit on top.
export function anatomicalVolumePath(sex: Sex): string {
  return anatomicalContourPath(sex);
}

const MALE_MUSCLE_LINES: readonly string[] = [
  // Pectorals
  'M78 102 C88 94 100 96 100 112',
  'M122 102 C112 94 100 96 100 112',
  'M82 114 C90 108 98 110 100 118',
  'M118 114 C110 108 102 110 100 118',
  // Sternum / abs
  'M100 112 L100 192',
  'M90 126 C96 123 104 123 110 126',
  'M88 142 C96 139 104 139 112 142',
  'M90 158 C96 155 104 155 110 158',
  'M92 174 C98 171 102 171 108 174',
  // Obliques + serratus
  'M80 128 C84 150 86 172 80 192',
  'M120 128 C116 150 114 172 120 192',
  'M76 120 C72 132 70 146 74 158',
  'M124 120 C128 132 130 146 126 158',
  // Delts + arms
  'M70 94 C58 108 50 130 42 150',
  'M130 94 C142 108 150 130 158 150',
  'M54 132 C48 148 40 164 34 178',
  'M146 132 C152 148 160 164 166 178',
  // Quads
  'M86 214 C84 240 82 262 86 280',
  'M94 216 C93 242 92 264 94 282',
  'M114 214 C116 240 118 262 114 280',
  'M106 216 C107 242 108 264 106 282',
  // Calves
  'M88 292 C84 310 86 328 90 340',
  'M96 294 C94 312 94 328 96 340',
  'M112 292 C116 310 114 328 110 340',
  'M104 294 C106 312 106 328 104 340',
];

const FEMALE_MUSCLE_LINES: readonly string[] = [
  'M84 104 C92 96 100 98 100 112',
  'M116 104 C108 96 100 98 100 112',
  'M88 116 C94 110 100 112 100 120',
  'M112 116 C106 110 100 112 100 120',
  'M100 114 L100 186',
  'M92 128 C97 125 103 125 108 128',
  'M90 144 C96 141 104 141 110 144',
  'M92 160 C97 157 103 157 108 160',
  'M84 132 C80 152 78 170 74 188',
  'M116 132 C120 152 122 170 126 188',
  'M78 96 C68 108 60 128 52 148',
  'M122 96 C132 108 140 128 148 148',
  'M62 130 C56 146 48 162 44 174',
  'M138 130 C144 146 152 162 156 174',
  'M80 216 C76 244 74 266 80 284',
  'M90 218 C88 246 88 268 90 286',
  'M120 216 C124 244 126 266 120 284',
  'M110 218 C112 246 112 268 110 286',
  'M82 296 C78 314 80 330 86 340',
  'M118 296 C122 314 120 330 114 340',
];

export function anatomicalMuscleLines(sex: Sex): readonly string[] {
  return sex === 'female' ? FEMALE_MUSCLE_LINES : MALE_MUSCLE_LINES;
}
