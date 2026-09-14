/**
 * Brief 66 — glance honesty adapters.
 * UNKNOWN never 0. Coming soon never feeds BOS. Band appends only when
 * Brief 62 numeric cutoffs exist AND the score is known. native_health_bridge
 * stays off — callers must not mint last-sync / HRV / RHR from
 * wearable_daily_vitals.
 */

import { formatSyncedRelative } from '@/lib/body-tracker/last-sync-state';
import {
  BOS_BAND_CUTOFFS,
  BOS_BAND_LABELS,
  HANNAH_APP_INTENT_VOICE,
  type BosBandLabel,
} from '@/lib/hannah/app-intent-voice';
import type { HannahBosChip, HannahBosIncludedContributor } from '@/lib/scoring/hannah-bos';
import { morningCtaTakeLabel } from './copy';
import {
  firstIncompleteProtocolAction,
  protocolItemsInCtaOrder,
  type MorningProtocolBuckets,
  type MorningProtocolItem,
} from './protocol-cta';

export { BOS_BAND_CUTOFFS, BOS_BAND_LABELS, type BosBandLabel };

export interface BosBandCutoffs {
  easeUpMax: number;
  steadyMax: number;
  readyMax: number;
}

export interface BosGlance {
  score: number | null;
  band: BosBandLabel | null;
}

export const UNWIRED_COMING_SOON_SOURCE_IDS = [
  'whoop',
  'oura',
  'google_health',
  'garmin',
] as const;

export type UnwiredComingSoonSourceId = (typeof UNWIRED_COMING_SOON_SOURCE_IDS)[number];

export const WEARABLE_GLANCE_SOURCE_NAMES = {
  whoop: 'Whoop',
  oura: 'Oura',
  google_health: 'Google Health',
  garmin: 'Garmin',
  apple_health: 'Apple Health',
  hume: 'Hume Body Pod',
  clair: 'Clair Health',
} as const;

export type WearableGlanceSourceId = keyof typeof WEARABLE_GLANCE_SOURCE_NAMES;

export function isFiniteKnownScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function bosGlanceFromScore(
  score: number | null,
  cutoffs: BosBandCutoffs | null = BOS_BAND_CUTOFFS,
): BosGlance {
  if (!isFiniteKnownScore(score)) {
    return { score: null, band: null };
  }
  return { score, band: bandFromScore(score, cutoffs) };
}

/**
 * Band labels stay Ease up · Steady · Ready · Push (Ready rename hold).
 * No cutoffs in repo → every band is null. Never invent a band.
 */
export function bandFromScore(
  score: number | null,
  cutoffs: BosBandCutoffs | null = BOS_BAND_CUTOFFS,
): BosBandLabel | null {
  if (!isFiniteKnownScore(score) || cutoffs === null) return null;
  if (score <= cutoffs.easeUpMax) return 'Ease up';
  if (score <= cutoffs.steadyMax) return 'Steady';
  if (score <= cutoffs.readyMax) return 'Ready';
  return 'Push';
}

export function topDriverChip(
  contributors: readonly HannahBosIncludedContributor[],
): HannahBosChip | null {
  if (contributors.length === 0) return null;
  const ranked = [...contributors].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.score - a.score;
  });
  return ranked[0]?.chip ?? null;
}

export type BosSpokenVariant = 'score' | 'push_ease';

export function speakBosGlance(args: {
  score: number | null;
  band?: BosBandLabel | null;
  topDriverChip?: string | null;
  variant?: BosSpokenVariant;
}): string {
  const glance = bosGlanceFromScore(args.score);
  const band = args.band === undefined ? glance.band : args.band;
  const variant = args.variant ?? 'score';

  if (glance.score === null) {
    return variant === 'push_ease'
      ? HANNAH_APP_INTENT_VOICE.bosPushEaseUnknown
      : HANNAH_APP_INTENT_VOICE.bosUnknown;
  }

  if (variant === 'push_ease') {
    return band
      ? HANNAH_APP_INTENT_VOICE.bosPushEaseKnownBand(glance.score, band)
      : `Your Bio Optimization Score is ${glance.score}.`;
  }

  const head = band
    ? HANNAH_APP_INTENT_VOICE.bosKnownBand(glance.score, band)
    : HANNAH_APP_INTENT_VOICE.bosKnown(glance.score);
  const chip = typeof args.topDriverChip === 'string' ? args.topDriverChip.trim() : '';
  if (!chip) return head;
  return `${head} ${HANNAH_APP_INTENT_VOICE.bosTopDriver(chip)}`;
}

export type ProtocolNextKind = 'next' | 'complete' | 'empty' | 'unavailable';

export interface ProtocolNextGlance {
  kind: ProtocolNextKind;
  title: string | null;
  cta: string | null;
  spoken: string | null;
}

function protocolNextFromItems(
  items: readonly Pick<MorningProtocolItem, 'name' | 'taken'>[],
): ProtocolNextGlance {
  if (items.length === 0) {
    return {
      kind: 'empty',
      title: null,
      cta: null,
      spoken: HANNAH_APP_INTENT_VOICE.protocolEmpty,
    };
  }
  const next = items.find((item) => item.taken === false) ?? null;
  if (!next) {
    return {
      kind: 'complete',
      title: null,
      cta: null,
      spoken: HANNAH_APP_INTENT_VOICE.protocolComplete,
    };
  }
  const title = next.name.trim();
  if (!title) {
    return {
      kind: 'empty',
      title: null,
      cta: null,
      spoken: HANNAH_APP_INTENT_VOICE.protocolEmpty,
    };
  }
  const cta = morningCtaTakeLabel(title);
  return {
    kind: 'next',
    title,
    cta,
    spoken: HANNAH_APP_INTENT_VOICE.protocolNextCta(title, cta),
  };
}

export function protocolNextGlance(
  items: readonly Pick<MorningProtocolItem, 'name' | 'taken'>[],
): ProtocolNextGlance {
  return protocolNextFromItems(items);
}

export function protocolNextGlanceFromBuckets(
  view: MorningProtocolBuckets | null | undefined,
  options?: {
    status?: 'loading' | 'ready' | 'unavailable';
    nowBucket?: MorningProtocolItem['timeOfDay'];
  },
): ProtocolNextGlance {
  if (options?.status === 'loading' || options?.status === 'unavailable' || !view) {
    return { kind: 'unavailable', title: null, cta: null, spoken: null };
  }
  const items = protocolItemsInCtaOrder(view, options?.nowBucket);
  const selected = firstIncompleteProtocolAction(view, {
    status: 'ready',
    nowBucket: options?.nowBucket,
  });
  const glance = protocolNextFromItems(items);
  if (glance.kind !== 'next') return glance;
  if (selected.kind === 'action' && selected.label.trim().length > 0 && glance.title) {
    return {
      kind: 'next',
      title: glance.title,
      cta: selected.label,
      spoken: HANNAH_APP_INTENT_VOICE.protocolNextCta(glance.title, selected.label),
    };
  }
  if (glance.title) {
    return {
      kind: 'next',
      title: glance.title,
      cta: null,
      spoken: HANNAH_APP_INTENT_VOICE.protocolNext(glance.title),
    };
  }
  return glance;
}

export interface WearableLastSyncInput {
  sourceId: string;
  sourceName?: string | null;
  connected: boolean;
  lastSyncedAt: string | null;
  comingSoon?: boolean;
  now?: number;
}

export interface WearableLastSyncGlance {
  source: string;
  kind: 'synced' | 'not_connected' | 'no_sync_yet' | 'coming_soon';
  lastSyncedAt: string | null;
  spoken: string;
}

export function isUnwiredComingSoonSource(sourceId: string): boolean {
  return (UNWIRED_COMING_SOON_SOURCE_IDS as readonly string[]).includes(sourceId);
}

export function wearableDisplayName(sourceId: string, sourceName?: string | null): string {
  if (typeof sourceName === 'string' && sourceName.trim().length > 0) {
    return sourceName.trim();
  }
  if (sourceId in WEARABLE_GLANCE_SOURCE_NAMES) {
    return WEARABLE_GLANCE_SOURCE_NAMES[sourceId as WearableGlanceSourceId];
  }
  return sourceId;
}

export function wearableLastSyncGlance(input: WearableLastSyncInput): WearableLastSyncGlance {
  const source = wearableDisplayName(input.sourceId, input.sourceName);
  const comingSoon = input.comingSoon === true || isUnwiredComingSoonSource(input.sourceId);
  if (comingSoon) {
    return {
      source,
      kind: 'coming_soon',
      lastSyncedAt: null,
      spoken: HANNAH_APP_INTENT_VOICE.lastSyncComingSoon(source),
    };
  }
  if (!input.connected) {
    return {
      source,
      kind: 'not_connected',
      lastSyncedAt: null,
      spoken: HANNAH_APP_INTENT_VOICE.lastSyncNotConnected(source),
    };
  }
  const raw = input.lastSyncedAt;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return {
      source,
      kind: 'no_sync_yet',
      lastSyncedAt: null,
      spoken: HANNAH_APP_INTENT_VOICE.lastSyncNoSyncYet(source),
    };
  }
  const time = formatSyncedRelative(raw, input.now);
  if (!time) {
    return {
      source,
      kind: 'no_sync_yet',
      lastSyncedAt: null,
      spoken: HANNAH_APP_INTENT_VOICE.lastSyncNoSyncYet(source),
    };
  }
  return {
    source,
    kind: 'synced',
    lastSyncedAt: raw,
    spoken: HANNAH_APP_INTENT_VOICE.lastSyncSynced(source, time),
  };
}

export function speakWearablesLastSync(
  tiles: readonly WearableLastSyncInput[],
): string {
  if (tiles.length === 0) return '';
  return tiles.map((tile) => wearableLastSyncGlance(tile).spoken).join(' ');
}

export function shouldShowBosExplainChip(
  score: number | null,
  chips: readonly string[],
): boolean {
  if (!isFiniteKnownScore(score)) return false;
  return chips.some((chip) => typeof chip === 'string' && chip.trim().length > 0);
}

export function buildBosExplainLines(args: {
  score: number | null;
  chips: readonly string[];
  band?: BosBandLabel | null;
  topDriverChip?: string | null;
}): string[] {
  if (!shouldShowBosExplainChip(args.score, args.chips)) return [];
  const lines = [HANNAH_APP_INTENT_VOICE.explainDefault];
  const driver =
    typeof args.topDriverChip === 'string' && args.topDriverChip.trim().length > 0
      ? args.topDriverChip.trim()
      : args.chips.find((chip) => chip.trim().length > 0) ?? null;
  if (driver) {
    lines.push(HANNAH_APP_INTENT_VOICE.explainTopDriver(driver));
  }
  if (args.band && isFiniteKnownScore(args.score)) {
    lines.push(HANNAH_APP_INTENT_VOICE.explainBandWhy(args.band, args.score));
  }
  return lines;
}
