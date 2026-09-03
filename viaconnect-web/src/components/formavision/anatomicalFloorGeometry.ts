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

export const ANATOMICAL_LANDMARK_TICKS: ReadonlyArray<{
  key: MeasurementKey;
  x: number;
  y: number;
  side: 'left' | 'right' | 'center';
}> = [
  { key: 'neck', x: 100, y: 64, side: 'center' },
  { key: 'chest', x: 100, y: 108, side: 'center' },
  { key: 'waist', x: 100, y: 158, side: 'center' },
  { key: 'hip', x: 100, y: 192, side: 'center' },
  { key: 'leftBicep', x: 46, y: 128, side: 'left' },
  { key: 'rightBicep', x: 154, y: 128, side: 'right' },
  { key: 'leftForearm', x: 34, y: 172, side: 'left' },
  { key: 'rightForearm', x: 166, y: 172, side: 'right' },
  { key: 'leftQuadriceps', x: 82, y: 248, side: 'left' },
  { key: 'rightQuadriceps', x: 118, y: 248, side: 'right' },
  { key: 'leftCalf', x: 84, y: 314, side: 'left' },
  { key: 'rightCalf', x: 116, y: 314, side: 'right' },
];

export function realLandmarkTicks(
  girths: CircumferenceMeasurements | null | undefined,
): Array<(typeof ANATOMICAL_LANDMARK_TICKS)[number]> {
  const present = new Set(realGirthKeys(girths));
  return ANATOMICAL_LANDMARK_TICKS.filter((tick) => present.has(tick.key));
}

export interface AnatomicalBuild {
  contour: string;
  volumes: readonly string[];
  muscleLines: readonly string[];
}

// Male: cranial vault + jaw (not a circle), distinct neck, delt caps,
// A-pose arms to ~x=22 / x=178, waist indent, quad/calf, ankle crop.
const MALE_CONTOUR =
  'M100 8 C112 8 120 16 121 28 C122 38 116 46 108 50 C107 58 106 64 105 70 C124 66 140 74 150 90 C158 102 164 118 168 136 C172 154 176 168 176 178 C176 186 170 190 164 186 C158 198 154 212 152 222 C150 228 144 228 144 220 C146 208 150 192 152 178 C154 164 150 148 142 136 C136 126 130 118 124 114 C126 132 128 152 126 172 C124 190 120 204 118 216 C122 228 128 244 126 262 C124 282 120 300 122 316 C124 330 126 340 120 348 C116 352 110 350 108 342 C106 330 106 318 106 306 L94 306 C94 318 94 330 92 342 C90 350 84 352 80 348 C74 340 76 330 78 316 C80 300 76 282 74 262 C72 244 78 228 82 216 C80 204 76 190 74 172 C72 152 74 132 76 114 C70 118 64 126 58 136 C50 148 46 164 48 178 C50 192 54 208 56 220 C56 228 50 228 48 222 C46 212 42 198 36 186 C30 190 24 186 24 178 C24 168 28 154 32 136 C36 118 42 102 50 90 C60 74 76 66 95 70 C94 64 93 58 92 50 C84 46 78 38 79 28 C80 16 88 8 100 8 Z';

const MALE_VOLUMES: readonly string[] = [
  // Cranial vault + jaw
  'M100 10 C111 10 118 17 119 28 C120 37 115 44 108 48 C104 50 100 51 100 51 C100 51 96 50 92 48 C85 44 80 37 81 28 C82 17 89 10 100 10 Z',
  // Neck
  'M94 50 L106 50 L108 70 L92 70 Z',
  // Torso (pec shelf → waist indent → hip)
  'M92 70 C110 68 124 74 132 88 C136 104 134 128 128 150 C124 166 122 180 126 196 C120 206 80 206 74 196 C78 180 76 166 72 150 C66 128 64 104 68 88 C76 74 90 68 108 70 Z',
  // Left arm A-pose
  'M76 82 C62 90 50 110 42 132 C36 150 30 168 28 180 C26 186 32 188 36 182 C42 166 48 148 56 132 C64 114 70 98 78 90 Z',
  // Right arm A-pose
  'M124 82 C138 90 150 110 158 132 C164 150 170 168 172 180 C174 186 168 188 164 182 C158 166 152 148 144 132 C136 114 130 98 122 90 Z',
  // Left thigh + calf
  'M80 198 C74 220 70 248 74 270 C76 286 72 304 76 322 C78 334 80 344 86 348 C90 350 92 344 92 334 C90 316 92 298 90 280 C88 258 90 232 88 212 Z',
  // Right thigh + calf
  'M120 198 C126 220 130 248 126 270 C124 286 128 304 124 322 C122 334 120 344 114 348 C110 350 108 344 108 334 C110 316 108 298 110 280 C112 258 110 232 112 212 Z',
];

const MALE_MUSCLE_LINES: readonly string[] = [
  // Clavicles + traps
  'M92 72 C96 70 100 69 108 72',
  'M80 78 C88 74 96 72 100 74',
  'M120 78 C112 74 104 72 100 74',
  // Pectoral fibers
  'M78 96 C88 88 100 90 100 108',
  'M122 96 C112 88 100 90 100 108',
  'M80 108 C90 100 98 102 100 114',
  'M120 108 C110 100 102 102 100 114',
  'M84 118 C92 112 98 114 100 122',
  'M116 118 C108 112 102 114 100 122',
  // Abs / linea alba
  'M100 110 L100 194',
  'M88 124 C96 120 104 120 112 124',
  'M86 140 C96 136 104 136 114 140',
  'M88 156 C96 152 104 152 112 156',
  'M90 172 C98 168 102 168 110 172',
  'M92 186 C98 183 102 183 108 186',
  // Obliques + serratus
  'M74 118 C70 132 68 148 72 164',
  'M126 118 C130 132 132 148 128 164',
  'M76 132 C80 150 82 170 76 190',
  'M124 132 C120 150 118 170 124 190',
  // Delts + biceps + forearms
  'M72 88 C60 100 50 120 42 140',
  'M128 88 C140 100 150 120 158 140',
  'M54 128 C46 146 38 164 32 178',
  'M146 128 C154 146 162 164 168 178',
  'M60 108 C52 118 46 132 42 146',
  'M140 108 C148 118 154 132 158 146',
  // Quads (3 heads)
  'M82 210 C78 236 76 258 80 276',
  'M90 212 C88 238 86 260 88 278',
  'M96 214 C96 240 96 262 96 280',
  'M118 210 C122 236 124 258 120 276',
  'M110 212 C112 238 114 260 112 278',
  'M104 214 C104 240 104 262 104 280',
  // Knees + calves
  'M84 286 C80 304 82 324 88 340',
  'M92 288 C90 308 90 326 92 340',
  'M116 286 C120 304 118 324 112 340',
  'M108 288 C110 308 110 326 108 340',
];

const FEMALE_CONTOUR =
  'M100 10 C110 10 118 18 119 28 C120 37 115 44 108 48 C107 56 106 62 105 68 C118 66 132 72 140 86 C146 96 150 110 154 126 C158 144 160 158 160 168 C160 176 154 180 148 176 C144 188 140 202 138 212 C136 218 130 218 130 210 C132 198 136 184 138 170 C140 156 136 142 130 132 C126 124 122 118 118 114 C120 132 122 150 124 168 C126 184 130 198 132 210 C136 222 142 238 140 256 C138 276 136 296 132 316 C130 330 128 340 122 348 C118 351 112 350 110 342 C108 330 108 318 108 306 L92 306 C92 318 92 330 90 342 C88 350 82 351 78 348 C72 340 70 330 68 316 C64 296 62 276 60 256 C58 238 64 222 68 210 C70 198 74 184 76 168 C78 150 80 132 82 114 C78 118 74 124 70 132 C64 142 60 156 62 170 C64 184 68 198 70 210 C70 218 64 218 62 212 C60 202 56 188 52 176 C46 180 40 176 40 168 C40 158 42 144 46 126 C50 110 54 96 60 86 C68 72 82 66 95 68 C94 62 93 56 92 48 C85 44 80 37 81 28 C82 18 90 10 100 10 Z';

const FEMALE_VOLUMES: readonly string[] = [
  'M100 12 C110 12 116 18 117 28 C118 36 114 42 108 46 C104 48 100 49 100 49 C100 49 96 48 92 46 C86 42 82 36 83 28 C84 18 90 12 100 12 Z',
  'M95 48 L105 48 L107 68 L93 68 Z',
  'M94 68 C108 66 120 72 126 86 C128 104 124 128 118 148 C114 164 118 180 128 196 C118 208 82 208 72 196 C82 180 86 164 82 148 C76 128 72 104 74 86 C80 72 92 66 106 68 Z',
  'M80 84 C68 92 56 110 48 130 C42 146 38 162 36 172 C34 178 40 180 44 174 C50 158 56 142 64 128 C70 112 76 96 82 88 Z',
  'M120 84 C132 92 144 110 152 130 C158 146 162 162 164 172 C166 178 160 180 156 174 C150 158 144 142 136 128 C130 112 124 96 118 88 Z',
  'M76 198 C68 222 64 250 70 272 C74 290 70 308 76 326 C78 336 82 346 90 348 C94 350 96 344 96 334 C94 314 96 294 94 274 C90 250 88 224 86 210 Z',
  'M124 198 C132 222 136 250 130 272 C126 290 130 308 124 326 C122 336 118 346 110 348 C106 350 104 344 104 334 C106 314 104 294 106 274 C110 250 112 224 114 210 Z',
];

const FEMALE_MUSCLE_LINES: readonly string[] = [
  'M94 70 C98 68 102 68 106 70',
  'M86 80 C94 74 100 74 100 76',
  'M114 80 C106 74 100 74 100 76',
  'M84 98 C92 90 100 92 100 108',
  'M116 98 C108 90 100 92 100 108',
  'M88 112 C94 106 100 108 100 116',
  'M112 112 C106 106 100 108 100 116',
  'M100 110 L100 186',
  'M90 126 C96 122 104 122 110 126',
  'M88 142 C96 138 104 138 112 142',
  'M90 158 C96 154 104 154 110 158',
  'M92 172 C98 169 102 169 108 172',
  'M80 122 C76 140 74 158 70 176',
  'M120 122 C124 140 126 158 130 176',
  'M78 90 C66 102 56 120 48 140',
  'M122 90 C134 102 144 120 152 140',
  'M58 128 C50 146 44 162 40 174',
  'M142 128 C150 146 156 162 160 174',
  'M80 214 C74 240 72 262 78 280',
  'M88 216 C86 242 86 264 88 282',
  'M120 214 C126 240 128 262 122 280',
  'M112 216 C114 242 114 264 112 282',
  'M82 292 C78 310 80 328 86 342',
  'M118 292 C122 310 120 328 114 342',
];

const BUILDS: Record<Sex, AnatomicalBuild> = {
  male: {
    contour: MALE_CONTOUR,
    volumes: MALE_VOLUMES,
    muscleLines: MALE_MUSCLE_LINES,
  },
  female: {
    contour: FEMALE_CONTOUR,
    volumes: FEMALE_VOLUMES,
    muscleLines: FEMALE_MUSCLE_LINES,
  },
};

export function anatomicalBuild(sex: Sex): AnatomicalBuild {
  return BUILDS[sex];
}

export function anatomicalContourPath(sex: Sex): string {
  return anatomicalBuild(sex).contour;
}

export function anatomicalVolumePath(sex: Sex): string {
  return anatomicalBuild(sex).volumes[2] ?? anatomicalContourPath(sex);
}

export function anatomicalMuscleLines(sex: Sex): readonly string[] {
  return anatomicalBuild(sex).muscleLines;
}

export const MALE_ANATOMICAL_CONTOUR = MALE_CONTOUR;
export const FEMALE_ANATOMICAL_CONTOUR = FEMALE_CONTOUR;
