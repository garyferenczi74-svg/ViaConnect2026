/**
 * Brief 56 — Hannah Bio Optimization Score blend.
 *
 * One documented function. Missing contributors are omitted, never averaged
 * as 0. If nothing real remains, BOS is UNKNOWN.
 *
 * UI shows chips in one sentence, not the intended weights:
 * “Bio Optimization Score blends only what you actually have today.
 * Missing pieces are left out, not counted as zero.”
 *
 * Intended weights (sum 100) apply only when that contributor passed its gate:
 *   from CAQ              25  — CAQ complete and a real CAQ score
 *   from check-in         20  — today's real check-in. Sleep / Energy / Mood /
 *                               Activity / Hydration equal inside the block;
 *                               omit missing subs and renormalize. Hydration 0
 *                               only if they logged 0 ml; else that sub is
 *                               UNKNOWN and omitted
 *   from nutrition        15  — Nutrition Score and ≥1 real meal
 *   from macros           10  — Daily Macros and ≥1 real meal. Not a second
 *                               nutrition hero. 0 kcal is a count, not a score
 *   from body             15  — fat and lean are independent. Include the one
 *                               that exists; omit the one that does not. If
 *                               neither exists, omit the whole 15, never
 *                               average 0. Fat only from profile, manual Log
 *                               Data, FormaVision (source=scan, device_name
 *                               FormaVision), or Hume / Apple XML. Photo scans
 *                               do not invent regional fat, muscle, or Navy.
 *                               Chip is one of: from profile | from FormaVision
 *                               | from Hume Body Pod | from Apple Health. No
 *                               chip if unknown. Never from Coming soon.
 *   from biological age   10  — contributor only, never a second hero, never
 *                               0 YEARS. Omit if DRAFT / pending Marshall /
 *                               no real estimate.
 *   from wearable          5  — omit the whole slice unless a real last-sync
 *                               or Hume / Apple XML persist. Whoop / Oura /
 *                               Google / Garmin Coming soon never feeds.
 *                               native_health_bridge stays off. Do not mint
 *                               HRV / RHR from wearable_daily_vitals. XML
 *                               does not unlock every dim.
 *
 * BOS = sum(contributor_score × (weight / remaining_weight_sum)).
 * This module does not invent CAQ completion, seed rows, or an 8-dimension
 * marketing formula. Label stays Bio Optimization Score. Never Vitality.
 */

import {
  CONNECTIONS_BOS_COMPOSITE,
  isComingSoonTile,
  type ConnectionsBosDisplay,
  type WearableTileView,
} from '@/lib/body-tracker/wearable-tiles';

export const HANNAH_BOS_BLEND_SENTENCE =
  'Bio Optimization Score blends only what you actually have today. Missing pieces are left out, not counted as zero.';

export const HANNAH_BOS_INTENDED_WEIGHTS = {
  caq: 25,
  checkin: 20,
  nutrition: 15,
  macros: 10,
  body: 15,
  biologicalAge: 10,
  wearable: 5,
} as const;

export type HannahBosContributorKey = keyof typeof HANNAH_BOS_INTENDED_WEIGHTS;

export type HannahBosChip =
  | 'from CAQ'
  | 'from check-in'
  | 'from nutrition'
  | 'from macros'
  | 'from profile'
  | 'from FormaVision'
  | 'from Hume Body Pod'
  | 'from Apple Health'
  | 'from biological age'
  | 'from wearable';

export type HannahBodyChip =
  | 'from profile'
  | 'from FormaVision'
  | 'from Hume Body Pod'
  | 'from Apple Health';

export const HANNAH_BODY_CHIPS: readonly HannahBodyChip[] = [
  'from profile',
  'from FormaVision',
  'from Hume Body Pod',
  'from Apple Health',
];

/** Existing muscle-health even baseline (calculateMuscleScore with no trend). */
export const HANNAH_LEAN_EVEN_BASELINE = 50;

export const COMING_SOON_BODY_SOURCES = [
  'whoop',
  'oura',
  'google_health',
  'garmin',
  'google_health_connect',
] as const;

export type HannahBiologicalAgeState = 'estimated' | 'insufficient' | 'draft' | 'pending';

export interface HannahBosCheckinSubs {
  sleep: number | null;
  energy: number | null;
  mood: number | null;
  activity: number | null;
  /** null = not logged (UNKNOWN). 0 = logged 0 ml. */
  hydration: number | null;
}

export interface HannahBosInput {
  caq: {
    complete: boolean;
    score: number | null;
  };
  checkin: {
    hasTodayCheckin: boolean;
    subs: HannahBosCheckinSubs;
  };
  nutrition: {
    mealCount: number;
    score: number | null;
  };
  macros: {
    mealCount: number;
    score: number | null;
  };
  body: {
    hasRealFatOrMuscle: boolean;
    score: number | null;
    chip: HannahBodyChip | null;
  };
  biologicalAge: {
    state: HannahBiologicalAgeState | null;
    score: number | null;
    marshallPending?: boolean;
  };
  wearable: {
    pluggedIn: boolean;
    comingSoonOnly: boolean;
    mintedFromDailyVitals: boolean;
    score: number | null;
  };
}

export interface HannahBosIncludedContributor {
  key: HannahBosContributorKey;
  chip: HannahBosChip;
  weight: number;
  score: number;
}

export interface HannahBosResult {
  score: number | null;
  contributors: HannahBosIncludedContributor[];
  remainingWeightSum: number;
  sentence: typeof HANNAH_BOS_BLEND_SENTENCE;
  chips: HannahBosChip[];
}

const CHECKIN_SUB_KEYS: Array<keyof HannahBosCheckinSubs> = [
  'sleep',
  'energy',
  'mood',
  'activity',
  'hydration',
];

export function emptyHannahBosInput(): HannahBosInput {
  return {
    caq: { complete: false, score: null },
    checkin: {
      hasTodayCheckin: false,
      subs: { sleep: null, energy: null, mood: null, activity: null, hydration: null },
    },
    nutrition: { mealCount: 0, score: null },
    macros: { mealCount: 0, score: null },
    body: { hasRealFatOrMuscle: false, score: null, chip: null },
    biologicalAge: { state: null, score: null, marshallPending: false },
    wearable: {
      pluggedIn: false,
      comingSoonOnly: false,
      mintedFromDailyVitals: false,
      score: null,
    },
  };
}

export function isFiniteScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Sleep / Energy / Mood / Activity / Hydration share the check-in block
 * equally. Missing subs are omitted and the rest renormalize inside the block.
 */
export function blendCheckinBlock(subs: HannahBosCheckinSubs): number | null {
  const present: number[] = [];
  for (const key of CHECKIN_SUB_KEYS) {
    const value = subs[key];
    if (isFiniteScore(value)) present.push(value);
  }
  if (present.length === 0) return null;
  const sum = present.reduce((acc, n) => acc + n, 0);
  return clampScore(sum / present.length);
}

/**
 * Arnold estimate vs chronological age → 0..100 contributor score.
 * Even with chrono = 50. Each year younger +5, each year older -5.
 * Only call after the estimate gate has passed.
 */
export function biologicalAgeContributorScore(
  biologicalAge: number,
  chronologicalAge: number,
): number {
  if (!isFiniteScore(biologicalAge) || !isFiniteScore(chronologicalAge)) return 50;
  return clampScore(50 + (chronologicalAge - biologicalAge) * 5);
}

/**
 * Existing composition normalizer (body-tracker score-engine): deviation
 * from 18% body fat. Used only when a real fat reading exists.
 */
export function bodyFatContributorScore(bodyFatPct: number): number {
  const deviation = Math.abs(bodyFatPct - 18);
  return clampScore(Math.max(0, 100 - deviation * 3));
}

/**
 * A real lean / muscle reading is included. No lbs-to-score curve is invented.
 * Reuses the documented muscle-health even baseline when lean is the reading
 * that exists.
 */
export function leanContributorScore(leanLbs: number): number | null {
  if (!isFiniteScore(leanLbs) || leanLbs <= 0) return null;
  return HANNAH_LEAN_EVEN_BASELINE;
}

/**
 * Fat and lean are independent subs of the body 15. Include the one that
 * exists; omit the one that does not. If neither exists, omit the whole 15.
 * Never average a missing sub as 0.
 */
export function blendBodyBlock(input: {
  fatPct: number | null;
  leanLbs: number | null;
}): number | null {
  const parts: number[] = [];
  if (isFiniteScore(input.fatPct) && input.fatPct > 0) {
    parts.push(bodyFatContributorScore(input.fatPct));
  }
  const lean = input.leanLbs !== null ? leanContributorScore(input.leanLbs) : null;
  if (lean !== null) parts.push(lean);
  if (parts.length === 0) return null;
  const sum = parts.reduce((acc, n) => acc + n, 0);
  return clampScore(sum / parts.length);
}

export interface HannahBodyChipInput {
  sourceName?: string | null;
  source?: string | null;
  deviceName?: string | null;
}

function normalizeSourceKey(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * BOS body chip. Exact vocabulary only. Hume requires sourceName
 * hume_body_pod. phone_health never copies onto Hume. Coming soon never chips.
 */
export function chipForBodySource(
  input?: string | null | HannahBodyChipInput,
): HannahBodyChip | null {
  if (input == null) return null;
  const fields: HannahBodyChipInput =
    typeof input === 'string' ? { sourceName: input, source: input } : input;

  const sourceName = typeof fields.sourceName === 'string' ? fields.sourceName.trim() : '';
  const source = typeof fields.source === 'string' ? fields.source.trim() : '';
  const device = typeof fields.deviceName === 'string' ? fields.deviceName.trim() : '';
  const keys = [sourceName, source, device].map(normalizeSourceKey).filter(Boolean);

  if (keys.some((key) => (COMING_SOON_BODY_SOURCES as readonly string[]).includes(key))) {
    return null;
  }
  if (keys.includes('phone_health')) return null;

  if (sourceName === 'hume_body_pod' || device === 'hume_body_pod') {
    return 'from Hume Body Pod';
  }

  if (
    keys.includes('apple_health')
    || keys.includes('apple_health_xml')
    || keys.includes('health_kit')
    || keys.includes('healthkit')
  ) {
    return 'from Apple Health';
  }

  if (source === 'scan' && device === 'FormaVision') {
    return 'from FormaVision';
  }
  if (keys.includes('formavision')) return 'from FormaVision';

  if (
    keys.includes('profile')
    || keys.includes('manual')
    || keys.includes('user_logged')
    || keys.includes('goals_tab')
    || keys.includes('weight_card')
    || keys.includes('log_data')
  ) {
    return 'from profile';
  }

  return null;
}

export interface HannahBodyReading {
  fatPct: number | null;
  leanLbs: number | null;
  sourceName?: string | null;
  source?: string | null;
  deviceName?: string | null;
  /** Photo scan persist. May keep total fat; never invents muscle / Navy. */
  isPhotoScan?: boolean;
  /** Navy-formula fat is not a real measured value. */
  navyInvented?: boolean;
}

export interface HannahBodyResolved {
  hasRealFat: boolean;
  hasRealLean: boolean;
  chip: HannahBodyChip | null;
  score: number | null;
}

/**
 * Arnold body gate. Fat and lean are independent. Photo scans do not invent
 * regional fat, muscle, or Navy. No chip if the source is unknown.
 */
export function resolveHannahBodyContributor(
  reading: HannahBodyReading,
): HannahBodyResolved {
  const empty: HannahBodyResolved = {
    hasRealFat: false,
    hasRealLean: false,
    chip: null,
    score: null,
  };

  const chip = chipForBodySource({
    sourceName: reading.sourceName,
    source: reading.source,
    deviceName: reading.deviceName,
  });
  if (!chip) return empty;

  const fatRaw =
    !reading.navyInvented
    && isFiniteScore(reading.fatPct)
    && reading.fatPct > 0
      ? reading.fatPct
      : null;
  const leanRaw =
    !reading.isPhotoScan
    && isFiniteScore(reading.leanLbs)
    && reading.leanLbs > 0
      ? reading.leanLbs
      : null;

  const score = blendBodyBlock({ fatPct: fatRaw, leanLbs: leanRaw });
  if (score === null) return empty;

  return {
    hasRealFat: fatRaw !== null,
    hasRealLean: leanRaw !== null,
    chip,
    score,
  };
}

function unknownResult(): HannahBosResult {
  return {
    score: null,
    contributors: [],
    remainingWeightSum: 0,
    sentence: HANNAH_BOS_BLEND_SENTENCE,
    chips: [],
  };
}

function maybeInclude(
  key: HannahBosContributorKey,
  chip: HannahBosChip,
  score: number | null,
): HannahBosIncludedContributor | null {
  if (!isFiniteScore(score)) return null;
  return {
    key,
    chip,
    weight: HANNAH_BOS_INTENDED_WEIGHTS[key],
    score: clampScore(score),
  };
}

/**
 * Hannah's contract. Start with the intended weight for each contributor
 * that passed its gate. Omit the rest. Empty set → UNKNOWN. Never average
 * a missing contributor as 0.
 */
export function blendHannahBos(input: HannahBosInput): HannahBosResult {
  const included: HannahBosIncludedContributor[] = [];

  if (input.caq.complete) {
    const row = maybeInclude('caq', 'from CAQ', input.caq.score);
    if (row) included.push(row);
  }

  if (input.checkin.hasTodayCheckin) {
    const checkinScore = blendCheckinBlock(input.checkin.subs);
    const row = maybeInclude('checkin', 'from check-in', checkinScore);
    if (row) included.push(row);
  }

  if (input.nutrition.mealCount >= 1 && isFiniteScore(input.nutrition.score)) {
    const row = maybeInclude('nutrition', 'from nutrition', input.nutrition.score);
    if (row) included.push(row);
  }

  // 0 kcal is a meal count, not a macros score of 0.
  if (
    input.macros.mealCount >= 1 &&
    isFiniteScore(input.macros.score) &&
    input.macros.score > 0
  ) {
    const row = maybeInclude('macros', 'from macros', input.macros.score);
    if (row) included.push(row);
  }

  if (input.body.hasRealFatOrMuscle && input.body.chip) {
    const row = maybeInclude('body', input.body.chip, input.body.score);
    if (row) included.push(row);
  }

  if (
    input.biologicalAge.state === 'estimated'
    && input.biologicalAge.marshallPending !== true
  ) {
    const row = maybeInclude(
      'biologicalAge',
      'from biological age',
      input.biologicalAge.score,
    );
    if (row) included.push(row);
  }

  if (
    input.wearable.pluggedIn &&
    !input.wearable.comingSoonOnly &&
    !input.wearable.mintedFromDailyVitals
  ) {
    const row = maybeInclude('wearable', 'from wearable', input.wearable.score);
    if (row) included.push(row);
  }

  if (included.length === 0) return unknownResult();

  const remainingWeightSum = included.reduce((sum, row) => sum + row.weight, 0);
  if (remainingWeightSum <= 0) return unknownResult();

  const blended = included.reduce(
    (sum, row) => sum + row.score * (row.weight / remainingWeightSum),
    0,
  );

  return {
    score: clampScore(blended),
    contributors: included,
    remainingWeightSum,
    sentence: HANNAH_BOS_BLEND_SENTENCE,
    chips: included.map((row) => row.chip),
  };
}

/** Connections / hero / Analytics dial object. UNKNOWN stays -- / UNKNOWN. */
export function hannahBosToConnectionsDisplay(
  result: HannahBosResult,
): ConnectionsBosDisplay {
  if (!isFiniteScore(result.score)) return CONNECTIONS_BOS_COMPOSITE;
  return { value: String(result.score), band: 'BOS' };
}

export function sameMomentBosDisplays(
  a: ConnectionsBosDisplay,
  b: ConnectionsBosDisplay,
  c: ConnectionsBosDisplay,
): boolean {
  return a.value === b.value && a.band === b.band
    && b.value === c.value && b.band === c.band;
}

const REAL_WEARABLE_FEED_IDS = new Set(['hume', 'apple_health']);
const COMING_SOON_IDS = new Set(['whoop', 'oura', 'google_health', 'garmin', 'clair']);

/**
 * Wearable slice only after a real Hume / Apple last-sync or XML ingest.
 * Whoop / Oura / Google / Garmin / Clair Coming soon never feed, even with
 * leftover last-sync. native_health_bridge stays off - callers must not pass
 * minted vitals. Hume-only last-sync does not unlock Sleep (see
 * xmlUnlockedDimensions). Clair never copies phone_health and never mints
 * HRV / RHR / Sleep from this source.
 */
export function wearableHannahGate(tiles: readonly WearableTileView[]): {
  pluggedIn: boolean;
  comingSoonOnly: boolean;
} {
  const comingSoon = tiles.filter((tile) => isComingSoonTile(tile));
  const syncedFeed = tiles.some(
    (tile) =>
      REAL_WEARABLE_FEED_IDS.has(tile.id) &&
      tile.lastSyncState === 'synced' &&
      !isComingSoonTile(tile),
  );
  if (syncedFeed) {
    return { pluggedIn: true, comingSoonOnly: false };
  }
  const onlyComingSoon =
    tiles.length > 0 &&
    comingSoon.length === tiles.filter((tile) => COMING_SOON_IDS.has(tile.id)).length &&
    !syncedFeed;
  return {
    pluggedIn: false,
    comingSoonOnly: onlyComingSoon || comingSoon.length > 0,
  };
}

export function hydrationScoreFromToday(data: {
  percentage_of_target?: number | null;
  log_count?: number | null;
  events_today?: readonly unknown[] | null;
  total_ml?: number | null;
} | null | undefined): number | null {
  if (!data) return null;
  const logs = (data.log_count ?? 0) + (data.events_today?.length ?? 0);
  if (logs <= 0) return null;
  if (isFiniteScore(data.percentage_of_target)) {
    return clampScore(data.percentage_of_target);
  }
  if (isFiniteScore(data.total_ml) && data.total_ml === 0) return 0;
  return null;
}
